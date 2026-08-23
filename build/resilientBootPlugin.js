import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

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
  const entry = ${escapeInlineJson(entry)};
  const styles = ${escapeInlineJson(styles)};
  const sources = [
    { name: 'github', base: 'https://arar228.github.io/memora-solutions/' },
    { name: 'jsdelivr', base: 'https://cdn.jsdelivr.net/gh/arar228/memora-solutions@cdn/' },
    { name: 'origin', base: new URL('/', location.origin).href }
  ];

  const assetUrl = (base, path) => new URL(path, base).href;

  async function probe(source) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const startedAt = performance.now();

    try {
      const response = await fetch(assetUrl(source.base, entry), {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(source.name + ' HTTP ' + response.status);
      return { source, latency: performance.now() - startedAt };
    } finally {
      clearTimeout(timeout);
    }
  }

  function attachStyle(source, path) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      const timeout = setTimeout(() => {
        link.remove();
        reject(new Error(source.name + ' stylesheet timeout'));
      }, 7000);
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      link.href = assetUrl(source.base, path);
      link.onload = () => {
        clearTimeout(timeout);
        resolve(link);
      };
      link.onerror = () => {
        clearTimeout(timeout);
        link.remove();
        reject(new Error(source.name + ' stylesheet failed'));
      };
      document.head.appendChild(link);
    });
  }

  function installImageFallback(orderedSources) {
    window.__memoraAssetSources = orderedSources.map(({ name, base }) => ({ name, base }));

    window.addEventListener('error', (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;

      let current;
      try {
        current = new URL(image.currentSrc || image.src, location.href);
      } catch {
        return;
      }

      const sourceIndex = orderedSources.findIndex((source) => current.href.startsWith(source.base));
      if (sourceIndex < 0 || sourceIndex >= orderedSources.length - 1) return;

      const path = current.href.slice(orderedSources[sourceIndex].base.length);
      if (!/\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(path)) return;

      const nextSource = orderedSources[sourceIndex + 1];
      const nextUrl = assetUrl(nextSource.base, path);
      if (nextUrl === image.src) return;
      image.src = nextUrl;
    }, true);
  }

  async function activate(source) {
    const links = [];
    window.__memoraAssetBase = source.base;
    window.__memoraAssetSource = source.name;
    document.documentElement.dataset.memoraAssetSource = source.name;

    try {
      links.push(...await Promise.all(styles.map((path) => attachStyle(source, path))));
      await import(assetUrl(source.base, entry));
    } catch (error) {
      links.forEach((link) => link.remove());
      throw error;
    }
  }

  const checks = await Promise.allSettled(sources.slice(0, 2).map(probe));
  const preferred = checks
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
    .sort((left, right) => left.latency - right.latency)
    .map((result) => result.source);
  const orderedSources = [
    ...preferred,
    sources[2]
  ];
  installImageFallback(orderedSources);

  let lastError;
  for (const source of orderedSources) {
    try {
      await activate(source);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      window.__memoraReportBoot?.(
        'asset_source_failed',
        error?.stack || error?.message || String(error),
        source.name
      );
    }
  }

  if (lastError) {
    window.__memoraReportBoot?.(
      'asset_sources_exhausted',
      lastError?.stack || lastError?.message || String(lastError),
      entry
    );
    throw lastError;
  }
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
