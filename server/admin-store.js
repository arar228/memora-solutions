import pg from 'pg';

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
]);

let pool;
let ready;

function sslFor(connectionString) {
  if (!connectionString || connectionString.includes('.railway.internal')) return false;
  return { rejectUnauthorized: false };
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
    });
  }
  return pool;
}

async function ensureStore() {
  const db = getPool();
  if (!db) return false;
  if (!ready) {
    ready = db.query(`
      CREATE TABLE IF NOT EXISTS memora_admin_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => true);
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
