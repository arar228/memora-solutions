import pg from 'pg';
import { cloneDefaultKanbanBoard } from '../src/data/kanbanConfig.js';

const { Pool } = pg;

export const DEFAULT_POMODORO_TOKENS = Object.freeze({
  'mp-col': '480px',
  'mp-gap': '6px',
  'mp-row-h': '40px',
  'mp-ctrl-h': '46px',
  'mp-radius': '10px',
  'mp-pad-x': '15px',
  'mp-pad-y': '12px',
  'mp-scene-ratio': '2.6',
  'mp-scene-h': '185px',
});

const DATABASE_URL = process.env.ADMIN_DATABASE_URL
  || process.env.DATABASE_URL
  || process.env.DATABASE_PUBLIC_URL
  || '';

const memory = new Map([
  ['pomodoro_tokens', DEFAULT_POMODORO_TOKENS],
  ['kanban_tasks', []],
  ['kanban_board_v2', cloneDefaultKanbanBoard()],
  ['kanban_messages_v1', []],
]);

let pool;
let ready;
let initializationError;
let retryAfter = 0;

function sslFor(connectionString) {
  if (!connectionString || connectionString.includes('.railway.internal')) return false;
  try {
    const { hostname, searchParams } = new URL(connectionString);
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)
      || searchParams.get('sslmode') === 'disable') {
      return false;
    }
  } catch {
    // Let pg report malformed connection strings with its native error.
  }
  return { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' };
}

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: sslFor(DATABASE_URL),
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      statement_timeout: 15_000,
      idle_in_transaction_session_timeout: 15_000,
    });
    pool.on('error', (error) => {
      // pg removes the broken idle client itself. Catch its background event
      // so a database restart does not terminate the HTTP process.
      console.error('Admin database idle connection failed:', error.code || error.name);
    });
  }
  return pool;
}

async function ensureStore() {
  const db = getPool();
  if (!db) return false;
  if (!ready) {
    if (Date.now() < retryAfter) throw initializationError;
    ready = db.query(`
      CREATE TABLE IF NOT EXISTS memora_admin_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => {
      initializationError = null;
      retryAfter = 0;
      return true;
    }).catch((error) => {
      ready = null;
      initializationError = error;
      retryAfter = Date.now() + 1_000;
      throw error;
    });
  }
  return ready;
}

export async function getState(key, fallback = null) {
  if (!await ensureStore()) return memory.has(key) ? memory.get(key) : fallback;
  const result = await pool.query(
    'SELECT value, updated_at FROM memora_admin_state WHERE key = $1',
    [key],
  );
  if (!result.rowCount) return fallback;
  return result.rows[0].value;
}

export async function setState(key, value) {
  if (!await ensureStore()) {
    memory.set(key, value);
    return { value, updatedAt: new Date().toISOString(), persistent: false };
  }
  const result = await pool.query(`
    INSERT INTO memora_admin_state (key, value, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    RETURNING value, updated_at
  `, [key, JSON.stringify(value)]);
  return {
    value: result.rows[0].value,
    updatedAt: result.rows[0].updated_at,
    persistent: true,
  };
}

export async function updateState(key, fallback, updater) {
  if (!await ensureStore()) {
    const current = memory.has(key) ? memory.get(key) : fallback;
    const value = updater(structuredClone(current));
    memory.set(key, value);
    return { value, updatedAt: new Date().toISOString(), persistent: false };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Create the row before locking it. SELECT ... FOR UPDATE cannot lock a
    // missing row, so two first-time messages could otherwise overwrite each
    // other while both transactions were starting from the fallback value.
    await client.query(`
      INSERT INTO memora_admin_state (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key) DO NOTHING
    `, [key, JSON.stringify(fallback)]);
    const currentResult = await client.query(
      'SELECT value FROM memora_admin_state WHERE key = $1 FOR UPDATE',
      [key],
    );
    const current = currentResult.rows[0].value;
    const value = updater(structuredClone(current));
    const result = await client.query(`
      INSERT INTO memora_admin_state (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING value, updated_at
    `, [key, JSON.stringify(value)]);
    await client.query('COMMIT');
    return {
      value: result.rows[0].value,
      updatedAt: result.rows[0].updated_at,
      persistent: true,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getStoreStatus() {
  if (!DATABASE_URL) return { configured: false, persistent: false };
  try {
    await ensureStore();
    await pool.query('SELECT 1');
    return { configured: true, persistent: true };
  } catch (error) {
    console.error('Admin storage is unavailable:', error.message);
    return { configured: true, persistent: false };
  }
}

export async function closeAdminStore() {
  if (pool) await pool.end();
}
