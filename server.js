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
import { timingSafeEqual } from 'node:crypto';

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

    if (admin && !checkAuth(req)) return requireAuth(res);

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

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal}: stopping gracefully`);

  server.close((err) => {
    if (err) {
      console.error('Graceful shutdown failed', err);
      process.exit(1);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, 9_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
