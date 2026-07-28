import pg from 'pg';

const { Pool } = pg;
const BDAY_DATABASE_URL = process.env.BDAY_DATABASE_URL || '';
let pool;

function getPool() {
  if (!BDAY_DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: BDAY_DATABASE_URL,
      ssl: BDAY_DATABASE_URL.includes('.railway.internal')
        ? false
        : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pool;
}

export async function getBdayDashboard() {
  const db = getPool();
  if (!db) {
    return {
      configured: false,
      adminUrl: process.env.BDAY_ADMIN_URL || null,
      reason: 'BDAY_DATABASE_URL не задан',
    };
  }

  const [stats, users, plans] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM users
          WHERE last_activity >= NOW() - INTERVAL '7 days') AS active_users_7d,
        (SELECT COUNT(*)::int FROM users
          WHERE last_activity >= NOW() - INTERVAL '30 days') AS active_users_30d,
        (SELECT COUNT(*)::int FROM contacts) AS total_contacts,
        (SELECT COUNT(*)::int FROM greeting_history) AS total_generations,
        (SELECT COUNT(*)::int FROM greeting_history
          WHERE timestamp >= CURRENT_DATE) AS generations_today,
        (SELECT COUNT(*)::int FROM broadcast_messages) AS broadcasts_total
    `),
    db.query(`
      SELECT telegram_id, username, full_name, is_blocked, created_at, last_activity
      FROM users
      ORDER BY last_activity DESC NULLS LAST
      LIMIT 25
    `),
    db.query(`
      SELECT p.display_name,
             COUNT(*) FILTER (WHERE s.status = 'active')::int AS active
      FROM subscription_plans p
      LEFT JOIN user_subscriptions s ON s.plan_id = p.id
      GROUP BY p.id, p.display_name
      ORDER BY p.id
    `),
  ]);

  return {
    configured: true,
    stats: stats.rows[0],
    users: users.rows,
    plans: plans.rows,
    adminUrl: process.env.BDAY_ADMIN_URL || null,
  };
}

export async function closeBdayStore() {
  if (pool) await pool.end();
}
