import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'concierge.db');

import fs from 'node:fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema (TZ §10). SQLite for Phase 1; the SQL is kept close to portable
// so a Postgres swap is mechanical. ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  role         TEXT NOT NULL DEFAULT 'client',         -- client | operator | lead | admin
  name         TEXT,
  email        TEXT UNIQUE,
  phone        TEXT,
  telegram_id  TEXT,
  pass_hash    TEXT,
  consent_pd   INTEGER DEFAULT 0,                       -- 0/1
  consent_at   TEXT,
  consent_ver  TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL REFERENCES users(id),
  source        TEXT NOT NULL,                          -- radar_deal | video_landing | free_form
  deal_id       TEXT,
  external_ref  TEXT,
  type          TEXT NOT NULL,                          -- air | tour | hotel | combo
  status        TEXT NOT NULL DEFAULT 'new',
  payload       TEXT,                                   -- JSON: route, flex, departure, passengers, budget, urgency, contact, channel
  utm           TEXT,
  assigned_operator_id TEXT REFERENCES users(id),
  priority      INTEGER DEFAULT 0,
  sla_deadline  TEXT,
  settlement_scheme TEXT DEFAULT 'A',                   -- A (service-only) | B (agency via partner)
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_client ON requests(client_id);

CREATE TABLE IF NOT EXISTS offers (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL REFERENCES requests(id),
  operator_id   TEXT REFERENCES users(id),
  version       INTEGER DEFAULT 1,
  description   TEXT,
  route_details TEXT,
  supplier_cost_amount REAL,
  supplier_currency    TEXT,
  fx_rate       REAL DEFAULT 1,
  service_fee_value    REAL,
  fee_type      TEXT DEFAULT 'fixed',                   -- fixed | percent
  settlement_scheme    TEXT DEFAULT 'A',
  total_price_rub      REAL,
  expected_margin      REAL,
  valid_until   TEXT,
  status        TEXT DEFAULT 'sent',                    -- sent | accepted | rejected | expired
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_request ON offers(request_id);

CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL REFERENCES requests(id),
  offer_id      TEXT REFERENCES offers(id),
  client_id     TEXT REFERENCES users(id),
  amount_rub    REAL NOT NULL,
  provider      TEXT NOT NULL,                          -- yookassa | sbp | mock
  method        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',        -- pending | paid | refunded | failed
  external_id   TEXT,
  receipt_id    TEXT,
  created_at    TEXT NOT NULL,
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_external ON payments(external_id);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES requests(id),
  supplier    TEXT,
  amount      REAL,
  currency    TEXT,
  fx_rate     REAL,
  method      TEXT,
  reference   TEXT,
  paid_at     TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES requests(id),
  supplier    TEXT,
  booking_reference TEXT,
  status      TEXT,
  booked_at   TEXT
);

CREATE TABLE IF NOT EXISTS trip_documents (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES requests(id),
  type        TEXT,                                      -- ticket | voucher | insurance | itinerary
  file_ref    TEXT,
  visible_to_client INTEGER DEFAULT 1,
  issued_at   TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES requests(id),
  sender_id   TEXT,
  sender_role TEXT,
  channel     TEXT DEFAULT 'web',
  body        TEXT,
  is_internal INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL,
  read_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);

CREATE TABLE IF NOT EXISTS partners (
  id        TEXT PRIMARY KEY,
  name      TEXT,
  type      TEXT,
  terms     TEXT,
  commission TEXT,
  contacts  TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  entity     TEXT,
  entity_id  TEXT,
  actor_id   TEXT,
  action     TEXT,
  before     TEXT,
  after      TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
`);

// Idempotent column additions — evolve the schema without dropping the DB.
for (const alter of [
  'ALTER TABLE trip_documents ADD COLUMN mime TEXT',
  'ALTER TABLE trip_documents ADD COLUMN orig_name TEXT',
  'ALTER TABLE trip_documents ADD COLUMN encrypted INTEGER DEFAULT 0',
]) {
  try { db.exec(alter); } catch { /* column already exists */ }
}

export function uid(prefix = '') {
  const rnd = (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
  return prefix ? `${prefix}_${rnd}` : rnd;
}

export const now = () => new Date().toISOString();
