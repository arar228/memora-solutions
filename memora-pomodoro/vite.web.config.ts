import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';

// Web-сборка того же renderer'а: результат кладётся прямо в public/ сайта,
// страница /pomodoro встраивает его во фрейм. Одна кодовая база на десктоп и
// web — правка в renderer видна в обеих версиях после пересборки.
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
const webOutDir = resolve(__dirname, '../public/app/pomodoro');
const productionAssetBase = 'https://arar228.github.io/memora-solutions/app/pomodoro/';
const webSceneDir = resolve(webOutDir, 'assets');
const protectedScenePath = resolve(__dirname, 'assets/ninja-tomato.scene');
const protectedSceneHash = createHash('sha256')
  .update(readFileSync(protectedScenePath))
  .digest('hex')
  .slice(0, 12);
const webSceneFileName = `ninja-tomato-${protectedSceneHash}.scene`;
const webScenePath = resolve(webSceneDir, webSceneFileName);

function resilientWebAssetsPlugin() {
  return {
    name: 'resilient-web-assets',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (!context.bundle) return html;

        const output = Object.values(context.bundle);
        const entry = output.find((item) => item.type === 'chunk' && item.isEntry)?.fileName;
        const stylesheet = output.find((item) => item.type === 'asset' && item.fileName.endsWith('.css'))?.fileName;
        if (!entry || !stylesheet) throw new Error('Pomodoro web entry assets were not found');

        const loader = `<script>
  const bases = {
    github: 'https://arar228.github.io/memora-solutions/app/pomodoro/',
    jsdelivr: 'https://cdn.jsdelivr.net/gh/arar228/memora-solutions@cdn/app/pomodoro/',
    origin: new URL('./', location.href).href
  };
  const preferred = new URLSearchParams(location.search).get('assetSource');
  const order = [...new Set([preferred, 'github', 'jsdelivr', 'origin'])]
    .filter((name) => name && bases[name]);

  function retryingElement(kind, path, index = 0) {
    if (index >= order.length) {
      const root = document.getElementById('root');
      if (root) root.innerHTML = '<button type="button" onclick="location.reload()" style="margin:24px;padding:12px 18px;border:0;border-radius:10px;background:#31c7d9;color:#101115;font:700 16px Arial;cursor:pointer">Повторить загрузку таймера</button>';
      return;
    }

    const element = document.createElement(kind === 'script' ? 'script' : 'link');
    if (kind === 'script') {
      element.type = 'module';
      element.src = new URL(path, bases[order[index]]).href;
    } else {
      element.rel = 'stylesheet';
      element.href = new URL(path, bases[order[index]]).href;
    }
    element.crossOrigin = 'anonymous';

    let settled = false;
    const timer = setTimeout(() => fail(), 2500);
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      element.remove();
      retryingElement(kind, path, index + 1);
    };
    element.onload = () => {
      settled = true;
      clearTimeout(timer);
    };
    element.onerror = fail;
    document.head.appendChild(element);
  }

  retryingElement('style', ${JSON.stringify(stylesheet)});
  retryingElement('script', ${JSON.stringify(entry)});
</script>`;

        return html
          .replace(/\s*<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="[^"]+")[^>]*><\/script>/i, '')
          .replace(/\s*<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="[^"]+")[^>]*>/i, '')
          .replace('</head>', `${loader}\n</head>`);
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const sceneKey = loadEnv(mode, __dirname, 'MEMORA_').MEMORA_SCENE_KEY || process.env.MEMORA_SCENE_KEY;
  if (!sceneKey) throw new Error('MEMORA_SCENE_KEY is required (use .env.local or a protected build secret).');
  const sceneKeyBytes = Buffer.from(sceneKey, 'base64');
  if (sceneKeyBytes.length !== 32) throw new Error('MEMORA_SCENE_KEY must decode to 32 bytes.');
  const sceneKeyMask = randomBytes(32);
  const sceneKeyMasked = Buffer.from(sceneKeyBytes.map((byte, index) => byte ^ sceneKeyMask[index]));
  const webSceneUrl = command === 'build'
    ? new URL(`assets/${webSceneFileName}`, productionAssetBase).href
    : `./assets/${webSceneFileName}`;
  return {
  root: resolve(__dirname, 'src/web'),
  // Keep the iframe document on memorasolutions.ru so its localStorage remains
  // stable. Production JS/CSS/fonts use content-hashed CDN URLs and can stay in
  // the browser cache for a year; the dev server continues to use local assets.
  base: command === 'build' ? productionAssetBase : './',
  plugins: [
    {
      name: 'use-compact-web-icon',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === '../../assets/icon.png?url' && importer?.endsWith('/src/renderer/assets.ts')) {
          return `${resolve(__dirname, 'assets/icon-web.png')}?url`;
        }
      },
    },
    react(),
    resilientWebAssetsPlugin(),
    {
      // Страница /pomodoro читает этот файл и показывает номер и дату версии —
      // одна сборка обновляет и web-копию, и надпись о версии.
      name: 'emit-pomodoro-version',
      closeBundle() {
        mkdirSync(webSceneDir, { recursive: true });
        copyFileSync(protectedScenePath, webScenePath);
        writeFileSync(
          resolve(__dirname, '../public/pomodoro-version.json'),
          JSON.stringify({
            version: pkg.version,
            date: new Date().toISOString().slice(0, 10),
          }, null, 2) + '\n',
          'utf8',
        );
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __IS_WEB__: 'true',
    __WEB_NINJA_SCENE_URL__: JSON.stringify(webSceneUrl),
    __MEMORA_SCENE_KEY_A__: JSON.stringify(sceneKeyMask.toString('base64')),
    __MEMORA_SCENE_KEY_B__: JSON.stringify(sceneKeyMasked.toString('base64')),
  },
  build: {
    outDir: webOutDir,
    emptyOutDir: true,
    target: 'es2020',
  },
  };
});
