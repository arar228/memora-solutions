import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { entryModules } from '../build/entryModules.js';
import { sceneDefines } from '../build/sceneDefines.js';

// Web-сборка того же renderer'а: результат кладётся прямо в public/ сайта,
// страница /pomodoro встраивает его во фрейм. Одна кодовая база на десктоп и
// web — правка в renderer видна в обеих версиях после пересборки.
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
const browserBootSource = readFileSync(resolve(__dirname, '../build/browserBoot.js'), 'utf8')
  .replace('export async function browserBoot', 'async function browserBoot');
const webOutDir = resolve(__dirname, '../public/app/pomodoro');
const productionAssetBase = '/app/pomodoro/';
const webSceneDir = resolve(webOutDir, 'assets');
const protectedScenePath = resolve(__dirname, 'assets/ninja-tomato.scene');
const protectedSceneHash = createHash('sha256')
  .update(readFileSync(protectedScenePath))
  .digest('hex')
  .slice(0, 12);
const webSceneFileName = `ninja-tomato-${protectedSceneHash}.scene`;
const webScenePath = resolve(webSceneDir, webSceneFileName);

function removeGeneratedAssetTag(html: string, tagName: 'script' | 'link', assetPath: string) {
  const assetOffset = html.indexOf(assetPath);
  const tagStart = html.lastIndexOf(`<${tagName}`, assetOffset);
  const openingEnd = html.indexOf('>', assetOffset);
  if (assetOffset < 0 || tagStart < 0 || openingEnd < 0
      || !html.slice(tagStart, openingEnd).includes(assetPath)) {
    throw new Error(`Generated ${tagName} asset was not found: ${assetPath}`);
  }

  let tagEnd = openingEnd + 1;
  if (tagName === 'script') {
    const closingTag = '</script>';
    const closingStart = html.indexOf(closingTag, tagEnd);
    if (closingStart < 0) throw new Error('Generated script closing tag was not found');
    tagEnd = closingStart + closingTag.length;
  }
  return html.slice(0, tagStart) + html.slice(tagEnd);
}

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

        const loader = `<script type="module" data-memora-resilient-boot>
(${browserBootSource})(${JSON.stringify({ entry, styles: [stylesheet], modules: entryModules(context.bundle, entry), subdirectory: 'app/pomodoro/' }).replace(/</g, '\\u003c')});
</script>`;

        const withoutEntry = removeGeneratedAssetTag(html, 'script', entry);
        const withoutStyles = removeGeneratedAssetTag(withoutEntry, 'link', stylesheet);
        return withoutStyles.replace('</head>', `${loader}\n</head>`);
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const sceneKey = loadEnv(mode, __dirname, 'MEMORA_').MEMORA_SCENE_KEY || process.env.MEMORA_SCENE_KEY;
  const artworkDefines = sceneDefines(sceneKey, process.env.MEMORA_PUBLIC_BUILD === 'true');
  const webSceneUrl = command === 'build'
    ? `${productionAssetBase}assets/${webSceneFileName}`
    : `./assets/${webSceneFileName}`;
  return {
  root: resolve(__dirname, 'src/web'),
  // Hashed files are published with the iframe document. The shared bootloader
  // selects the inherited CDN source and bounds fallback attempts.
  // CSS fonts and JS-imported images resolve beside the selected CDN module,
  // including GitHub Pages' repository prefix. Absolute paths lost that prefix.
  base: './',
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
    ...artworkDefines,
  },
  build: {
    outDir: webOutDir,
    emptyOutDir: true,
    target: 'es2020',
  },
  };
});
