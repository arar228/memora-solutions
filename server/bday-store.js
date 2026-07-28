import pg from 'pg';

const { Pool } = pg;
const BDAY_DATABASE_URL = process.env.BDAY_DATABASE_URL || '';
const BDAY_BOT_TOKEN = process.env.BDAY_BOT_TOKEN || '';
const BDAY_ADMIN_ID = process.env.BDAY_ADMIN_ID || '';
const BDAY_ADMIN_URL = process.env.BDAY_ADMIN_URL || null;
let pool;

const BROADCAST_FILTERS = new Set([
  'all',
  'active_7d',
  'active_30d',
  'with_subscription',
  'not_blocked',
]);

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

function requirePool() {
  const db = getPool();
  if (!db) {
    const error = new Error('BDAY_DATABASE_URL не задан');
    error.code = 'BDAY_NOT_CONFIGURED';
    throw error;
  }
  return db;
}

function cleanTelegramId(value) {
  const id = String(value || '').trim();
  return /^\d{4,20}$/.test(id) ? id : null;
}

function cleanMessage(value) {
  const message = String(value || '').trim();
  return message.length > 0 && message.length <= 4096 ? message : null;
}

function cleanPhotoUrl(value) {
  const photoUrl = String(value || '').trim();
  if (!photoUrl) return null;
  try {
    const parsed = new URL(photoUrl);
    return ['http:', 'https:'].includes(parsed.protocol) && photoUrl.length <= 1000
      ? photoUrl
      : null;
  } catch {
    return null;
  }
}

function currentSubscriptionSql(alias = 'u') {
  return `
    LEFT JOIN LATERAL (
      SELECT
        s.id,
        s.status,
        s.started_at,
        s.expires_at,
        s.auto_renew,
        p.name AS plan_name,
        p.display_name AS plan_display_name,
        p.max_contacts
      FROM user_subscriptions s
      JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.user_id = ${alias}.id AND s.status = 'active'
      ORDER BY s.started_at DESC NULLS LAST, s.id DESC
      LIMIT 1
    ) sub ON TRUE
  `;
}

async function getBotStatus() {
  if (!BDAY_BOT_TOKEN) {
    return {
      configured: false,
      online: false,
      reason: 'BDAY_BOT_TOKEN не задан',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${BDAY_BOT_TOKEN}/getMe`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      return {
        configured: true,
        online: false,
        reason: body.description || `Telegram API: ${response.status}`,
      };
    }
    return {
      configured: true,
      online: true,
      username: body.result?.username || null,
      name: body.result?.first_name || null,
      canJoinGroups: Boolean(body.result?.can_join_groups),
    };
  } catch (error) {
    return {
      configured: true,
      online: false,
      reason: error.name === 'AbortError' ? 'Telegram API не ответил вовремя' : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getBdayDashboard() {
  const db = getPool();
  if (!db) {
    return {
      configured: false,
      bot: await getBotStatus(),
      adminUrl: BDAY_ADMIN_URL,
      reason: 'BDAY_DATABASE_URL не задан',
    };
  }

  const [statsResult, dailyStats, users, plans, broadcasts, bot] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE is_blocked = TRUE) AS blocked_users,
        (SELECT COUNT(*)::int FROM users
          WHERE last_activity >= NOW() - INTERVAL '7 days') AS active_users_7d,
        (SELECT COUNT(*)::int FROM users
          WHERE last_activity >= NOW() - INTERVAL '30 days') AS active_users_30d,
        (SELECT COUNT(*)::int FROM contacts) AS total_contacts,
        (SELECT COUNT(*)::int FROM contacts
          WHERE created_at >= NOW() - INTERVAL '14 days') AS contacts_last_2_weeks,
        (SELECT COUNT(*)::int FROM greeting_history) AS total_generations,
        (SELECT COUNT(*)::int FROM greeting_history
          WHERE timestamp >= CURRENT_DATE) AS generations_today,
        (SELECT COUNT(*)::int FROM greeting_history
          WHERE timestamp >= NOW() - INTERVAL '7 days') AS generations_week,
        (SELECT COUNT(*)::int FROM greeting_history
          WHERE timestamp >= NOW() - INTERVAL '30 days') AS generations_month,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'step_input_start') AS step_input_start,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'step_input_complete') AS step_input_complete,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'free_input_start') AS free_input_start,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'free_input_complete') AS free_input_complete,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'generate_greeting') AS generate_greeting,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'regenerate_greeting') AS regenerate_greeting,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'generate_greeting' AND source_menu = 'main_menu') AS generate_from_main,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'generate_greeting' AND source_menu = 'contact_menu') AS generate_from_contact,
        (SELECT COUNT(*)::int FROM user_actions
          WHERE action_type = 'generate_greeting' AND source_menu = 'generate_menu') AS generate_from_generate,
        (SELECT COUNT(*)::int FROM broadcast_messages) AS broadcasts_total,
        (SELECT COALESCE(SUM(total_sent), 0)::int FROM broadcast_messages) AS messages_sent,
        (SELECT COALESCE(SUM(total_errors), 0)::int FROM broadcast_messages) AS messages_failed
    `),
    db.query(`
      SELECT
        TO_CHAR(day, 'DD.MM') AS date,
        (
          SELECT COUNT(*)::int
          FROM contacts
          WHERE created_at >= day AND created_at < day + INTERVAL '1 day'
        ) AS contacts,
        (
          SELECT COUNT(*)::int
          FROM greeting_history
          WHERE timestamp >= day AND timestamp < day + INTERVAL '1 day'
        ) AS generations
      FROM GENERATE_SERIES(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS day
      ORDER BY day
    `),
    db.query(`
      SELECT
        u.id,
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        u.full_name,
        u.is_blocked,
        u.created_at,
        u.last_activity,
        COUNT(c.id)::int AS contact_count,
        sub.plan_name,
        sub.plan_display_name,
        sub.max_contacts,
        sub.expires_at,
        sub.auto_renew
      FROM users u
      LEFT JOIN contacts c ON c.user_id = u.id
      ${currentSubscriptionSql('u')}
      GROUP BY
        u.id,
        sub.plan_name,
        sub.plan_display_name,
        sub.max_contacts,
        sub.expires_at,
        sub.auto_renew
      ORDER BY u.last_activity DESC NULLS LAST, u.created_at DESC
    `),
    db.query(`
      SELECT
        p.id,
        p.name,
        p.display_name,
        p.price_monthly,
        p.price_yearly,
        p.max_contacts,
        p.has_improvements,
        p.has_history,
        p.has_badge,
        p.is_active,
        COUNT(*) FILTER (WHERE s.status = 'active')::int AS active
      FROM subscription_plans p
      LEFT JOIN user_subscriptions s ON s.plan_id = p.id
      GROUP BY p.id
      ORDER BY p.id
    `),
    db.query(`
      SELECT
        id,
        message_text,
        photo_url,
        target_type,
        target_user_id,
        filter_criteria,
        total_sent,
        total_errors,
        sent_by,
        created_at
      FROM broadcast_messages
      ORDER BY created_at DESC
      LIMIT 100
    `),
    getBotStatus(),
  ]);

  const stats = statsResult.rows[0];
  const percent = (completed, started) => (
    started > 0 ? Math.round((completed / started) * 1_000) / 10 : 0
  );

  return {
    configured: true,
    stats: {
      ...stats,
      step_input_completion_rate: percent(stats.step_input_complete, stats.step_input_start),
      free_input_completion_rate: percent(stats.free_input_complete, stats.free_input_start),
      regenerate_rate: percent(stats.regenerate_greeting, stats.generate_greeting),
      daily_stats: dailyStats.rows,
    },
    users: users.rows,
    plans: plans.rows,
    broadcasts: broadcasts.rows,
    bot,
    adminUrl: BDAY_ADMIN_URL,
  };
}

function filterWhere(filter) {
  switch (filter) {
    case 'active_7d':
      return `u.is_blocked = FALSE AND u.last_activity >= NOW() - INTERVAL '7 days'`;
    case 'active_30d':
      return `u.is_blocked = FALSE AND u.last_activity >= NOW() - INTERVAL '30 days'`;
    case 'with_subscription':
      return `u.is_blocked = FALSE AND EXISTS (
        SELECT 1
        FROM user_subscriptions s
        JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = u.id AND s.status = 'active' AND p.name <> 'free'
      )`;
    case 'not_blocked':
      return 'u.is_blocked = FALSE';
    default:
      return 'TRUE';
  }
}

export async function getBdayRecipientCount(filter = 'all') {
  if (!BROADCAST_FILTERS.has(filter)) throw new Error('Неизвестный фильтр аудитории');
  const result = await requirePool().query(
    `SELECT COUNT(*)::int AS count FROM users u WHERE ${filterWhere(filter)}`,
  );
  return { filter, count: result.rows[0].count };
}

async function getRecipients(filter) {
  if (!BROADCAST_FILTERS.has(filter)) throw new Error('Неизвестный фильтр аудитории');
  const result = await requirePool().query(`
    SELECT u.telegram_id, u.username, u.full_name
    FROM users u
    WHERE ${filterWhere(filter)}
    ORDER BY u.created_at
  `);
  return result.rows;
}

async function telegramRequest(method, payload) {
  if (!BDAY_BOT_TOKEN) throw new Error('BDAY_BOT_TOKEN не задан');
  const response = await fetch(`https://api.telegram.org/bot${BDAY_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    const error = new Error(body.description || `Telegram API: ${response.status}`);
    error.code = body.error_code || response.status;
    throw error;
  }
  return body.result;
}

async function sendTelegramMessage(telegramId, message, photoUrl = null) {
  if (photoUrl) {
    return telegramRequest('sendPhoto', {
      chat_id: telegramId,
      photo: photoUrl,
      caption: message,
      parse_mode: 'HTML',
    });
  }
  return telegramRequest('sendMessage', {
    chat_id: telegramId,
    text: message,
    parse_mode: 'HTML',
  });
}

async function saveBroadcast({
  message,
  photoUrl,
  targetType,
  targetUserId = null,
  filter = null,
  sent,
  errors,
}) {
  const result = await requirePool().query(`
    INSERT INTO broadcast_messages (
      message_text,
      photo_url,
      target_type,
      target_user_id,
      filter_criteria,
      total_sent,
      total_errors,
      sent_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, created_at
  `, [
    message,
    photoUrl,
    targetType,
    targetUserId,
    filter,
    sent,
    errors,
    BDAY_ADMIN_ID || null,
  ]);
  return result.rows[0];
}

export async function sendBdayMessage(input) {
  const telegramId = cleanTelegramId(input?.telegramId);
  const message = cleanMessage(input?.message);
  const rawPhotoUrl = String(input?.photoUrl || '').trim();
  const photoUrl = cleanPhotoUrl(rawPhotoUrl);
  if (!telegramId) throw new Error('Некорректный Telegram ID');
  if (!message) throw new Error('Сообщение должно содержать от 1 до 4096 символов');
  if (rawPhotoUrl && !photoUrl) throw new Error('Некорректная ссылка на изображение');

  const user = await requirePool().query(
    'SELECT telegram_id FROM users WHERE telegram_id = $1 LIMIT 1',
    [telegramId],
  );
  if (!user.rowCount) throw new Error('Пользователь не найден');

  let sent = 0;
  let errors = 0;
  try {
    await sendTelegramMessage(telegramId, message, photoUrl);
    sent = 1;
  } catch (error) {
    errors = 1;
    await saveBroadcast({
      message,
      photoUrl,
      targetType: 'single',
      targetUserId: telegramId,
      sent,
      errors,
    });
    throw error;
  }

  const history = await saveBroadcast({
    message,
    photoUrl,
    targetType: 'single',
    targetUserId: telegramId,
    sent,
    errors,
  });
  return { ok: true, sent, errors, history };
}

export async function previewBdayBroadcast(input) {
  const message = cleanMessage(input?.message);
  const rawPhotoUrl = String(input?.photoUrl || '').trim();
  const photoUrl = cleanPhotoUrl(rawPhotoUrl);
  if (!BDAY_ADMIN_ID) throw new Error('BDAY_ADMIN_ID не задан');
  if (!message) throw new Error('Сообщение должно содержать от 1 до 4096 символов');
  if (rawPhotoUrl && !photoUrl) throw new Error('Некорректная ссылка на изображение');
  await sendTelegramMessage(
    cleanTelegramId(BDAY_ADMIN_ID),
    `👁 <b>ПРЕДПРОСМОТР</b>\n\n${message}`,
    photoUrl,
  );
  return { ok: true };
}

export async function sendBdayBroadcast(input) {
  const filter = String(input?.filter || 'all');
  const message = cleanMessage(input?.message);
  const rawPhotoUrl = String(input?.photoUrl || '').trim();
  const photoUrl = cleanPhotoUrl(rawPhotoUrl);
  if (!BROADCAST_FILTERS.has(filter)) throw new Error('Неизвестный фильтр аудитории');
  if (!message) throw new Error('Сообщение должно содержать от 1 до 4096 символов');
  if (rawPhotoUrl && !photoUrl) throw new Error('Некорректная ссылка на изображение');

  const recipients = await getRecipients(filter);
  let sent = 0;
  let errors = 0;
  const failures = [];

  for (const recipient of recipients) {
    try {
      await sendTelegramMessage(recipient.telegram_id, message, photoUrl);
      sent += 1;
    } catch (error) {
      errors += 1;
      failures.push({
        telegramId: recipient.telegram_id,
        reason: error.message,
      });
    }
  }

  const history = await saveBroadcast({
    message,
    photoUrl,
    targetType: filter === 'all' ? 'all' : 'filtered',
    filter,
    sent,
    errors,
  });
  return {
    ok: errors === 0,
    audience: recipients.length,
    sent,
    errors,
    failures: failures.slice(0, 20),
    history,
  };
}

export async function setBdayUserBlocked(telegramIdValue, blocked) {
  const telegramId = cleanTelegramId(telegramIdValue);
  if (!telegramId) throw new Error('Некорректный Telegram ID');
  const result = await requirePool().query(`
    UPDATE users
    SET is_blocked = $2
    WHERE telegram_id = $1
    RETURNING telegram_id, username, full_name, is_blocked
  `, [telegramId, Boolean(blocked)]);
  if (!result.rowCount) throw new Error('Пользователь не найден');
  return { ok: true, user: result.rows[0] };
}

function parseExpiresAt(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Некорректная дата окончания');
  return date.toISOString();
}

export async function updateBdaySubscription(telegramIdValue, input) {
  const telegramId = cleanTelegramId(telegramIdValue);
  const planName = String(input?.planName || '').trim();
  const expiresAt = parseExpiresAt(input?.expiresAt);
  if (!telegramId) throw new Error('Некорректный Telegram ID');
  if (!/^[a-z0-9_-]{1,50}$/i.test(planName)) throw new Error('Некорректный тариф');

  const db = requirePool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      'SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE',
      [telegramId],
    );
    if (!user.rowCount) throw new Error('Пользователь не найден');
    const plan = await client.query(
      'SELECT id, name, display_name FROM subscription_plans WHERE name = $1 AND is_active = TRUE',
      [planName],
    );
    if (!plan.rowCount) throw new Error('Тариф не найден');
    await client.query(
      `UPDATE user_subscriptions
       SET status = 'cancelled', updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
      [user.rows[0].id],
    );
    await client.query(`
      INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        started_at,
        expires_at,
        auto_renew,
        created_at,
        updated_at
      )
      VALUES ($1, $2, 'active', NOW(), $3, TRUE, NOW(), NOW())
    `, [user.rows[0].id, plan.rows[0].id, expiresAt]);
    await client.query('COMMIT');
    return {
      ok: true,
      subscription: {
        planName: plan.rows[0].name,
        displayName: plan.rows[0].display_name,
        expiresAt,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function disableBdaySubscription(telegramId) {
  return updateBdaySubscription(telegramId, { planName: 'free', expiresAt: null });
}

async function relationExists(client, table) {
  const result = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${table}`]);
  return result.rows[0].exists;
}

export async function deleteBdayUser(telegramIdValue) {
  const telegramId = cleanTelegramId(telegramIdValue);
  if (!telegramId) throw new Error('Некорректный Telegram ID');

  const client = await requirePool().connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      'SELECT id FROM users WHERE telegram_id = $1 FOR UPDATE',
      [telegramId],
    );
    if (!user.rowCount) throw new Error('Пользователь не найден');
    const userId = user.rows[0].id;

    const dependentTables = [
      'ai_sessions',
      'greeting_history',
      'notification_settings',
      'user_actions',
      'user_subscriptions',
      'contacts',
      'groups',
    ];
    for (const table of dependentTables) {
      if (await relationExists(client, table)) {
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      }
    }
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
    return { ok: true, telegramId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeBdayStore() {
  if (pool) await pool.end();
}
