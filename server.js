/**
 * Статик-сервер сайта + защита админки.
 *
 * Зачем свой сервер вместо `serve -s dist`: админка на admin.memorasolutions.ru
 * должна открываться по паролю, а у статики пароля нет. Здесь пароль живёт в
 * переменной окружения Railway (ADMIN_PASSWORD) и в браузер не попадает —
 * в отличие от любой проверки на клиенте, которую видно в исходниках страницы.
 *
 * Маршрутизация по домену:
 *   admin.*  → HTTP Basic Auth, отдаём SPA (клиент сам рисует админку)
 *   основной → обычный сайт; путь /admin закрыт (404), чтобы старая
 *              незащищённая админка не осталась доступной
 *
 * Зависимостей нет намеренно: меньше поверхности и нечего обновлять.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  DEFAULT_POMODORO_TOKENS,
  closeAdminStore,
  getState,
  getStoreStatus,
  setState,
} from './server/admin-store.js';
import {
  closeBdayStore,
  deleteBdayUser,
  disableBdaySubscription,
  getBdayDashboard,
  getBdayRecipientCount,
  previewBdayBroadcast,
  sendBdayBroadcast,
  sendBdayMessage,
  setBdayUserBlocked,
  updateBdaySubscription,
} from './server/bday-store.js';
import {
  KANBAN_BOARD_KEY,
  KANBAN_MESSAGE_MODES,
  appendKanbanMessage,
  deleteKanbanMessage,
  getKanbanBoard,
  getKanbanMessages,
  validClientId,
  validateKanbanBoard,
} from './server/kanban-store.js';
import {
  cancelTravelSubscription,
  createTravelCheckout,
  createTravelSubscription,
  getTravelFeed,
  getTravelSubscription,
  handleTravelTelegramUpdate,
  handleYookassaWebhook,
  startTravelRadarServices,
  stopTravelRadarServices,
  travelCapabilities,
  updateTravelSubscription,
} from './server/travel-radar-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;
let isShuttingDown = false;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const isAdminHost = (host = '') => host.toLowerCase().startsWith('admin.');

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.byteLength,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(payload);
}

async function readJson(req, limit = 256 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function mutationIsSameOrigin(req) {
  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  return req.headers['x-memora-admin'] === '1';
}

const TOKEN_RULES = {
  'mp-col': [/^\d+(?:\.\d+)?px$/, 320, 540],
  'mp-gap': [/^\d+(?:\.\d+)?px$/, 0, 24],
  'mp-row-h': [/^\d+(?:\.\d+)?px$/, 30, 64],
  'mp-ctrl-h': [/^\d+(?:\.\d+)?px$/, 32, 72],
  'mp-radius': [/^\d+(?:\.\d+)?px$/, 0, 24],
  'mp-pad-x': [/^\d+(?:\.\d+)?px$/, 4, 48],
  'mp-pad-y': [/^\d+(?:\.\d+)?px$/, 4, 48],
  'mp-scene-ratio': [/^\d+(?:\.\d+)?$/, 1.4, 4],
  'mp-scene-h': [/^\d+(?:\.\d+)?px$/, 100, 320],
};

function validatePomodoroTokens(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const result = {};
  for (const [key, [pattern, min, max]] of Object.entries(TOKEN_RULES)) {
    const value = input[key] ?? DEFAULT_POMODORO_TOKENS[key];
    if (typeof value !== 'string' || !pattern.test(value)) return null;
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number) || number < min || number > max) return null;
    result[key] = value;
  }
  return result;
}

function validateKanbanTasks(input) {
  if (!Array.isArray(input) || input.length > 500) return null;
  const columns = new Set(['inProgress', 'testing', 'done']);
  const clean = [];
  for (const task of input) {
    if (!task || typeof task !== 'object') return null;
    const title = String(task.title || '').trim().slice(0, 160);
    const desc = String(task.desc || '').trim().slice(0, 2000);
    if (!title || !columns.has(task.column)) return null;
    clean.push({
      id: String(task.id || randomUUID()).slice(0, 80),
      title,
      desc,
      column: task.column,
    });
  }
  return clean;
}

async function handleBdayAdminApi(req, res, pathname, url) {
  if (pathname === '/api/admin/bdaybot' && req.method === 'GET') {
    return sendJson(res, 200, await getBdayDashboard());
  }
  if (pathname === '/api/admin/bdaybot/recipient-count' && req.method === 'GET') {
    return sendJson(
      res,
      200,
      await getBdayRecipientCount(url.searchParams.get('filter') || 'all'),
    );
  }

  if (!mutationIsSameOrigin(req)) {
    return sendJson(res, 403, { error: 'Проверка источника запроса не пройдена' });
  }

  let body = {};
  if (req.method !== 'DELETE') {
    try {
      body = await readJson(req);
    } catch (error) {
      return sendJson(
        res,
        error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
        { error: error.message === 'PAYLOAD_TOO_LARGE' ? 'Запрос слишком большой' : 'Некорректный JSON' },
      );
    }
  }

  try {
    if (pathname === '/api/admin/bdaybot/messages' && req.method === 'POST') {
      return sendJson(res, 200, await sendBdayMessage(body));
    }
    if (pathname === '/api/admin/bdaybot/broadcast-preview' && req.method === 'POST') {
      return sendJson(res, 200, await previewBdayBroadcast(body));
    }
    if (pathname === '/api/admin/bdaybot/broadcasts' && req.method === 'POST') {
      return sendJson(res, 200, await sendBdayBroadcast(body));
    }

    const userMatch = pathname.match(
      /^\/api\/admin\/bdaybot\/users\/(\d+)(?:\/(subscription|block|unblock|disable-subscription))?$/,
    );
    if (!userMatch) return sendJson(res, 404, { error: 'Not found' });
    const [, telegramId, action] = userMatch;

    if (!action && req.method === 'DELETE') {
      return sendJson(res, 200, await deleteBdayUser(telegramId));
    }
    if (action === 'subscription' && req.method === 'PUT') {
      return sendJson(res, 200, await updateBdaySubscription(telegramId, body));
    }
    if (action === 'disable-subscription' && req.method === 'POST') {
      return sendJson(res, 200, await disableBdaySubscription(telegramId));
    }
    if (action === 'block' && req.method === 'POST') {
      return sendJson(res, 200, await setBdayUserBlocked(telegramId, true));
    }
    if (action === 'unblock' && req.method === 'POST') {
      return sendJson(res, 200, await setBdayUserBlocked(telegramId, false));
    }
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('BdayBot admin API:', error);
    const databaseError = typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code);
    return sendJson(res, databaseError ? 500 : 400, {
      error: databaseError ? 'Не удалось выполнить операцию с базой BdayBot' : error.message,
    });
  }
}

async function handleAdminApi(req, res, pathname, url) {
  if (pathname === '/api/admin/status' && req.method === 'GET') {
    return sendJson(res, 200, { storage: await getStoreStatus() });
  }

  if (pathname === '/api/admin/bdaybot' || pathname.startsWith('/api/admin/bdaybot/')) {
    return handleBdayAdminApi(req, res, pathname, url);
  }

  if (pathname === '/api/admin/kanban' && req.method === 'GET') {
    return sendJson(res, 200, {
      board: await getKanbanBoard(),
      messages: await getKanbanMessages('general', '', true),
    });
  }

  if (pathname === '/api/admin/kanban/board') {
    if (req.method !== 'PUT') {
      return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'PUT' });
    }
    if (!mutationIsSameOrigin(req)) {
      return sendJson(res, 403, { error: 'Проверка источника запроса не пройдена' });
    }
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      return sendJson(res, error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400, {
        error: error.message === 'PAYLOAD_TOO_LARGE' ? 'Запрос слишком большой' : 'Некорректный JSON',
      });
    }
    const board = validateKanbanBoard(body.board);
    if (!board) return sendJson(res, 400, { error: 'Некорректная доска или превышен лимит колонок' });
    return sendJson(res, 200, await setState(KANBAN_BOARD_KEY, board));
  }

  if (pathname === '/api/admin/kanban/messages' && req.method === 'POST') {
    if (!mutationIsSameOrigin(req)) {
      return sendJson(res, 403, { error: 'Проверка источника запроса не пройдена' });
    }
    try {
      const body = await readJson(req, 16 * 1024);
      const message = await appendKanbanMessage({
        mode: body.mode,
        conversationId: body.conversationId,
        text: body.text,
        author: 'manager',
      });
      return sendJson(res, 201, { message });
    } catch (error) {
      const invalid = ['INVALID_MODE', 'INVALID_CLIENT', 'INVALID_MESSAGE'].includes(error.message);
      if (!invalid && error.message !== 'PAYLOAD_TOO_LARGE') console.error('Kanban admin reply:', error);
      return sendJson(res, invalid || error.message === 'PAYLOAD_TOO_LARGE' ? 400 : 500, {
        error: invalid ? 'Проверьте ответ и выбранный диалог' : error.message === 'PAYLOAD_TOO_LARGE' ? 'Ответ слишком большой' : 'Не удалось отправить ответ',
      });
    }
  }

  const kanbanMessageMatch = pathname.match(/^\/api\/admin\/kanban\/messages\/([a-zA-Z0-9-]{1,80})$/);
  if (kanbanMessageMatch && req.method === 'DELETE') {
    if (!mutationIsSameOrigin(req)) {
      return sendJson(res, 403, { error: 'Проверка источника запроса не пройдена' });
    }
    return sendJson(res, 200, await deleteKanbanMessage(kanbanMessageMatch[1]));
  }

  const match = pathname.match(/^\/api\/admin\/state\/(pomodoro_tokens|kanban_tasks)$/);
  if (!match) return sendJson(res, 404, { error: 'Not found' });
  const key = match[1];
  const fallback = key === 'pomodoro_tokens' ? DEFAULT_POMODORO_TOKENS : [];

  if (req.method === 'GET') {
    return sendJson(res, 200, { key, value: await getState(key, fallback) });
  }
  if (req.method !== 'PUT') {
    return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
  }
  if (!mutationIsSameOrigin(req)) {
    return sendJson(res, 403, { error: 'Проверка источника запроса не пройдена' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return sendJson(
      res,
      error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
      { error: error.message === 'PAYLOAD_TOO_LARGE' ? 'Запрос слишком большой' : 'Некорректный JSON' },
    );
  }
  const value = key === 'pomodoro_tokens'
    ? validatePomodoroTokens(body.value)
    : validateKanbanTasks(body.value);
  if (!value) return sendJson(res, 400, { error: 'Некорректные данные' });
  return sendJson(res, 200, await setState(key, value));
}

// Сравнение постоянного времени — чтобы по скорости ответа нельзя было
// подбирать пароль посимвольно.
function safeEqual(a, b) {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function checkAuth(req) {
  // Пароль не задан → админка закрыта полностью (безопасный дефолт:
  // иначе забытая переменная окружения открыла бы её всем).
  if (!ADMIN_PASSWORD) return false;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); }
  catch { return false; }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  return safeEqual(decoded.slice(0, i), ADMIN_USER)
    && safeEqual(decoded.slice(i + 1), ADMIN_PASSWORD);
}

function requireAuth(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Memora Admin", charset="UTF-8"',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(ADMIN_PASSWORD
    ? 'Требуется вход'
    : 'Админка не настроена: задайте переменную окружения ADMIN_PASSWORD');
}

async function sendFile(res, path, status = 200) {
  const info = await stat(path);
  const ext = extname(path).toLowerCase();
  const normalizedPath = path.replaceAll('\\', '/');
  const immutable = ext !== '.html'
    && (normalizedPath.includes('/static/') || normalizedPath.includes('/assets/'));
  const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // Stream large bundles instead of handing the proxy one multi-megabyte
    // write. Railway/Cloudflare can otherwise forward the first chunk and keep
    // the browser waiting indefinitely for the rest of the module.
    'Content-Length': info.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'Last-Modified': info.mtime.toUTCString(),
    ETag: etag,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
  });
  res.flushHeaders();
  await pipeline(createReadStream(path, { highWaterMark: 8 * 1024 }), res);
}

const KANBAN_CLIENT_RATE_LIMIT = 5;
const KANBAN_IP_RATE_LIMIT = 12;
const KANBAN_RATE_WINDOW_MS = 15 * 60 * 1000;
const KANBAN_MIN_INTERVAL_MS = 3_000;
const kanbanRateState = new Map();

function requestIp(req) {
  const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim()
    .slice(0, 80);
}

function publicMutationIsSameOrigin(req) {
  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  return String(req.headers['content-type'] || '').toLowerCase().includes('application/json');
}

function checkKanbanRate(req, clientId) {
  const now = Date.now();
  const ip = requestIp(req);
  const clientKey = `client:${ip}:${clientId}`;
  const ipKey = `ip:${ip}`;
  const clientTimestamps = (kanbanRateState.get(clientKey) || [])
    .filter(timestamp => now - timestamp < KANBAN_RATE_WINDOW_MS);
  const ipTimestamps = (kanbanRateState.get(ipKey) || [])
    .filter(timestamp => now - timestamp < KANBAN_RATE_WINDOW_MS);
  const sinceLast = clientTimestamps.length ? now - clientTimestamps.at(-1) : Infinity;
  const clientLimited = clientTimestamps.length >= KANBAN_CLIENT_RATE_LIMIT;
  const ipLimited = ipTimestamps.length >= KANBAN_IP_RATE_LIMIT;
  const limited = clientLimited || ipLimited || sinceLast < KANBAN_MIN_INTERVAL_MS;
  const retryCandidates = [Math.max(0, KANBAN_MIN_INTERVAL_MS - sinceLast)];
  if (clientLimited) {
    retryCandidates.push(KANBAN_RATE_WINDOW_MS - (now - clientTimestamps[0]));
  }
  if (ipLimited) {
    retryCandidates.push(KANBAN_RATE_WINDOW_MS - (now - ipTimestamps[0]));
  }
  return {
    clientKey,
    ipKey,
    clientTimestamps,
    ipTimestamps,
    limited,
    remaining: Math.max(0, Math.min(
      KANBAN_CLIENT_RATE_LIMIT - clientTimestamps.length,
      KANBAN_IP_RATE_LIMIT - ipTimestamps.length,
    )),
    retryAfterSeconds: Math.max(1, Math.ceil(Math.max(...retryCandidates) / 1000)),
  };
}

function recordKanbanMessage(rate) {
  const now = Date.now();
  kanbanRateState.set(rate.clientKey, [...rate.clientTimestamps, now]);
  kanbanRateState.set(rate.ipKey, [...rate.ipTimestamps, now]);
  if (kanbanRateState.size > 2_000) {
    const cutoff = Date.now() - KANBAN_RATE_WINDOW_MS;
    for (const [key, timestamps] of kanbanRateState) {
      if (!timestamps.some(timestamp => timestamp > cutoff)) kanbanRateState.delete(key);
    }
  }
}

const travelMutationTimestamps = new Map();

function checkTravelMutationRate(req) {
  const key = requestIp(req);
  const now = Date.now();
  const recent = (travelMutationTimestamps.get(key) || [])
    .filter((timestamp) => now - timestamp < 15 * 60 * 1000);
  if (recent.length >= 8) return false;
  travelMutationTimestamps.set(key, [...recent, now]);
  return true;
}

const TRAVEL_ERROR_STATUS = {
  INVALID_EMAIL: 400,
  CONSENT_REQUIRED: 400,
  SUBSCRIPTION_NOT_FOUND: 404,
  TELEGRAM_NOT_CONNECTED: 409,
  ALREADY_ACTIVE: 409,
  STORAGE_UNAVAILABLE: 503,
  SUBSCRIPTIONS_NOT_CONFIGURED: 503,
  PAYMENT_PROVIDER_ERROR: 502,
  INVALID_TELEGRAM_SECRET: 403,
};

async function handlePublicTravelApi(req, res, pathname, url) {
  if (pathname === '/api/travel/deals' && req.method === 'GET') {
    const feed = await getTravelFeed();
    const { rawItems: _rawItems, ...publicFeed } = feed;
    return sendJson(res, 200, publicFeed, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
  }
  if (pathname === '/api/travel/capabilities' && req.method === 'GET') {
    return sendJson(res, 200, travelCapabilities(), { 'Cache-Control': 'public, max-age=60' });
  }
  if (pathname === '/api/travel/subscriptions' && req.method === 'GET') {
    const subscription = await getTravelSubscription(url.searchParams.get('token') || '');
    return subscription
      ? sendJson(res, 200, { subscription })
      : sendJson(res, 404, { error: 'Подписка не найдена' });
  }

  let body;
  try {
    body = await readJson(req, 64 * 1024);
  } catch (error) {
    return sendJson(res, error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400, {
      error: error.message === 'PAYLOAD_TOO_LARGE' ? 'Запрос слишком большой' : 'Некорректный JSON',
    });
  }

  try {
    if (pathname === '/api/travel/telegram/webhook' && req.method === 'POST') {
      const result = await handleTravelTelegramUpdate(
        body,
        String(req.headers['x-telegram-bot-api-secret-token'] || ''),
      );
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/travel/payments/yookassa' && req.method === 'POST') {
      return sendJson(res, 200, await handleYookassaWebhook(body));
    }

    if (!['/api/travel/subscriptions', '/api/travel/subscriptions/checkout', '/api/travel/subscriptions/cancel', '/api/travel/subscriptions/settings'].includes(pathname)) {
      return sendJson(res, 404, { error: 'Not found' });
    }
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    if (!publicMutationIsSameOrigin(req)) {
      return sendJson(res, 403, { error: 'Проверка источника запроса не пройдена' });
    }
    if (!checkTravelMutationRate(req)) {
      return sendJson(res, 429, { error: 'Слишком много запросов. Попробуйте позднее.' }, { 'Retry-After': '900' });
    }

    if (pathname === '/api/travel/subscriptions') {
      return sendJson(res, 201, await createTravelSubscription(body));
    }
    if (pathname === '/api/travel/subscriptions/checkout') {
      return sendJson(res, 200, await createTravelCheckout(String(body.token || '')));
    }
    if (pathname === '/api/travel/subscriptions/settings') {
      return sendJson(res, 200, {
        subscription: await updateTravelSubscription(String(body.token || ''), body),
      });
    }
    return sendJson(res, 200, {
      subscription: await cancelTravelSubscription(String(body.token || '')),
    });
  } catch (error) {
    const status = TRAVEL_ERROR_STATUS[error.code || error.message] || 500;
    if (status >= 500) console.error('Travel Radar API:', error);
    const messages = {
      INVALID_EMAIL: 'Укажите корректный email',
      CONSENT_REQUIRED: 'Нужно подтвердить условия автопродления',
      SUBSCRIPTION_NOT_FOUND: 'Подписка не найдена',
      TELEGRAM_NOT_CONNECTED: 'Сначала подключите Telegram-бота',
      ALREADY_ACTIVE: 'Подписка уже активна',
      STORAGE_UNAVAILABLE: 'Хранилище подписок временно недоступно',
      SUBSCRIPTIONS_NOT_CONFIGURED: 'Платные уведомления ещё не подключены',
      PAYMENT_PROVIDER_ERROR: 'Платёжный сервис временно недоступен',
      INVALID_TELEGRAM_SECRET: 'Forbidden',
    };
    return sendJson(res, status, { error: messages[error.code || error.message] || 'Не удалось выполнить запрос' });
  }
}

async function handlePublicKanbanApi(req, res, pathname, url) {
  if (pathname === '/api/kanban/board' && req.method === 'GET') {
    return sendJson(res, 200, { board: await getKanbanBoard() }, {
      'Cache-Control': 'no-cache',
    });
  }

  if (pathname !== '/api/kanban/messages') {
    return sendJson(res, 404, { error: 'Not found' });
  }

  if (req.method === 'GET') {
    const mode = url.searchParams.get('mode') || 'general';
    const clientId = url.searchParams.get('clientId') || '';
    if (!KANBAN_MESSAGE_MODES.has(mode)
      || (mode === 'personal' && !validClientId(clientId))) {
      return sendJson(res, 400, { error: 'Некорректный режим чата' });
    }
    return sendJson(res, 200, {
      messages: await getKanbanMessages(mode, clientId),
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
  }
  if (!publicMutationIsSameOrigin(req)) {
    return sendJson(res, 403, { error: 'Проверка источника запроса не пройдена' });
  }

  let body;
  try {
    body = await readJson(req, 16 * 1024);
  } catch (error) {
    return sendJson(res, error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400, {
      error: error.message === 'PAYLOAD_TOO_LARGE' ? 'Сообщение слишком большое' : 'Некорректный JSON',
    });
  }

  const clientId = String(body.clientId || '');
  const mode = String(body.mode || 'general');
  const startedAt = Number(body.startedAt);
  if (!validClientId(clientId) || !KANBAN_MESSAGE_MODES.has(mode)) {
    return sendJson(res, 400, { error: 'Некорректные параметры сообщения' });
  }
  // Honeypot + minimum fill time block simple form bots before touching storage.
  if (body.website || !Number.isFinite(startedAt)
    || Date.now() - startedAt < 800
    || Date.now() - startedAt > 2 * 60 * 60 * 1000) {
    return sendJson(res, 400, { error: 'Не удалось отправить сообщение' });
  }

  const rate = checkKanbanRate(req, clientId);
  if (rate.limited) {
    return sendJson(res, 429, {
      error: 'Слишком много сообщений. Немного подождите.',
      retryAfterSeconds: rate.retryAfterSeconds,
      remaining: rate.remaining,
    }, { 'Retry-After': rate.retryAfterSeconds });
  }

  try {
    const message = await appendKanbanMessage({
      mode,
      conversationId: mode === 'personal' ? clientId : '',
      text: body.text,
      name: body.name,
      author: 'visitor',
    });
    recordKanbanMessage(rate);
    return sendJson(res, 201, {
      message,
      remaining: Math.max(0, rate.remaining - 1),
    });
  } catch (error) {
    const invalid = ['INVALID_MODE', 'INVALID_CLIENT', 'INVALID_MESSAGE'].includes(error.message);
    if (!invalid) console.error('Kanban message:', error);
    return sendJson(res, invalid ? 400 : 500, {
      error: invalid ? 'Проверьте текст сообщения' : 'Не удалось сохранить сообщение',
    });
  }
}

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host || '';
    const admin = isAdminHost(host);
    const url = new URL(req.url, `http://${host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === '/health') {
      const healthy = !isShuttingDown;
      res.writeHead(healthy ? 200 : 503, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(JSON.stringify({
        status: healthy ? 'ok' : 'shutting_down',
        uptime: Math.floor(process.uptime()),
      }));
    }

    if (pathname === '/api/pomodoro/tokens' && req.method === 'GET') {
      const tokens = await getState('pomodoro_tokens', DEFAULT_POMODORO_TOKENS);
      return sendJson(res, 200, tokens, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      });
    }

    if (!admin && pathname.startsWith('/api/travel/')) {
      return await handlePublicTravelApi(req, res, pathname, url);
    }

    if (!admin && (pathname === '/api/kanban/board' || pathname === '/api/kanban/messages')) {
      return await handlePublicKanbanApi(req, res, pathname, url);
    }

    if (admin && !checkAuth(req)) return requireAuth(res);

    if (pathname.startsWith('/api/admin/')) {
      if (!admin) return sendJson(res, 404, { error: 'Not found' });
      return await handleAdminApi(req, res, pathname, url);
    }

    // На основном домене админки нет — она живёт только на поддомене.
    if (!admin && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }

    // Защита от выхода за пределы dist (../../etc/passwd и подобное).
    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(DIST, safePath);
    if (!filePath.startsWith(DIST)) filePath = DIST;

    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = join(filePath, 'index.html');
      await stat(filePath);
      return await sendFile(res, filePath);
    } catch {
      // SPA-фоллбэк: любой неизвестный путь отдаёт index.html, роутер разберётся
      return await sendFile(res, join(DIST, 'index.html'));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
    console.error(err);
  }
});

server.listen(PORT, () => {
  console.log(`memora site on :${PORT}`);
  console.log(ADMIN_PASSWORD
    ? 'admin.* защищён Basic Auth'
    : 'ВНИМАНИЕ: ADMIN_PASSWORD не задан — админка отдаёт 401 всем');
  startTravelRadarServices();
});

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal}: stopping gracefully`);

  server.close(async (err) => {
    if (err) {
      console.error('Graceful shutdown failed', err);
      process.exit(1);
    }
    stopTravelRadarServices();
    await Promise.allSettled([closeAdminStore(), closeBdayStore()]);
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, 9_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
