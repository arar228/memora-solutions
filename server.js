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
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
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
  const body = await readFile(path);
  const ext = extname(path).toLowerCase();
  const immutable = path.startsWith(join(DIST, 'static')) && ext !== '.html';
  res.writeHead(status, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // An explicit length prevents intermediaries from waiting indefinitely for
    // the end of a chunked response. This is especially important for
    // Cloudflare in front of Railway: incomplete cached module responses leave
    // the SPA stuck on its HTML loader.
    'Content-Length': body.byteLength,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
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
