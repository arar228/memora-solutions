import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Serialize source, not the bundled function: Vite may inject build-only helpers.
const browserBootSource = readFileSync(new URL('./browserBoot.js', import.meta.url), 'utf8')
  .replace('export async function browserBoot', 'async function browserBoot');

const escapeInlineJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const RESILIENT_BOOT_RE = /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="([^"]+)")[^>]*><\/script>/i;
const STYLESHEET_RE = /<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="([^"]+)")[^>]*>/gi;
const MODULE_PRELOAD_RE = /\s*<link\b[^>]*\brel="modulepreload"[^>]*>/gi;

const cleanAssetPath = (value) => value.replace(/^(?:\.\/|\/)+/, '');

export function resilientBootPlugin() {
  let outputDirectory = '';

  return {
    name: 'memora-resilient-boot',
    enforce: 'post',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || !item.fileName.endsWith('.css')) continue;
        const css = Buffer.isBuffer(item.source) ? item.source.toString('utf8') : String(item.source);
        item.source = css.replaceAll('url(/fonts/', 'url(../fonts/');
      }
    },
    async closeBundle() {
      if (!outputDirectory) return;
      const generatedOnlyAssets = [
        ['fonts', 'ia-fonts'],
        ['travel-logo.png'],
        ['wallet-logo.png'],
        ['bdaybot-logo.png'],
        ['pomodoro-logo.png'],
        ['sergey.jpg'],
        ['portfolio', 'armk-b2b.png'],
        ['portfolio', 'domatrix-landing.png'],
        ['portfolio', 'domatrix-app.png'],
        ['portfolio', 'poker-club.png'],
        ['portfolio', 'poker-control.png'],
        ['portfolio', 'armk-site.png'],
      ];
      await Promise.all(generatedOnlyAssets.map((segments) => rm(
        resolve(outputDirectory, ...segments),
        { recursive: true, force: true },
      )));
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (!context.bundle) return html;

        const entryMatch = html.match(RESILIENT_BOOT_RE);
        if (!entryMatch) throw new Error('Production entry module was not found');

        const entry = cleanAssetPath(entryMatch[1]);
        const stylesheetTags = [...html.matchAll(STYLESHEET_RE)];
        const styles = stylesheetTags.map((match) => cleanAssetPath(match[1]));

        const loader = `
<meta name="memora-entry" content="${entry}">
<script type="module" data-memora-resilient-boot>
(${browserBootSource})(${escapeInlineJson({ entry, styles })});
</script>`;

        let transformed = html.replace(RESILIENT_BOOT_RE, loader);
        transformed = transformed.replace(MODULE_PRELOAD_RE, '');
        for (const match of stylesheetTags) transformed = transformed.replace(match[0], '');
        transformed = transformed.replace(/(["'])\.\/logo\.png/g, '$1/logo.png');
        return transformed;
      },
    },
  };
}
