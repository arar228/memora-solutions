const escapeInlineJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const RESILIENT_BOOT_RE = /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="([^"]+)")[^>]*><\/script>/i;
const STYLESHEET_RE = /<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="([^"]+)")[^>]*>/gi;
const MODULE_PRELOAD_RE = /\s*<link\b[^>]*\brel="modulepreload"[^>]*>/gi;

const cleanAssetPath = (value) => value.replace(/^(?:\.\/|\/)+/, '');

export function resilientBootPlugin() {
  return {
    name: 'memora-resilient-boot',
    enforce: 'post',
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
    { name: 'origin', base: new URL('/', location.origin).href },
    { name: 'github', base: 'https://arar228.github.io/memora-solutions/' },
    { name: 'jsdelivr', base: 'https://cdn.jsdelivr.net/gh/arar228/memora-solutions@cdn/' }
  ];
  const controllers = new Map();

  const assetUrl = (base, path) => new URL(path, base).href;

  async function probe(source) {
    const controller = new AbortController();
    controllers.set(source.name, controller);
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(assetUrl(source.base, entry), {
        cache: 'force-cache',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(source.name + ' HTTP ' + response.status);
      await response.arrayBuffer();
      return source;
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
      }, 6000);
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      link.href = assetUrl(source.base, path);
      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      link.onerror = () => {
        clearTimeout(timeout);
        link.remove();
        reject(new Error(source.name + ' stylesheet failed'));
      };
      document.head.appendChild(link);
    });
  }

  function installImageFallback(primary) {
    const secondarySources = sources
      .filter((source) => source.name !== primary.name)
      .sort((left, right) => Number(left.name === 'origin') - Number(right.name === 'origin'));
    const orderedSources = [primary, ...secondarySources];
    window.__memoraAssetBase = primary.base;
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

  try {
    const winner = await Promise.any(sources.map(probe));
    for (const [name, controller] of controllers) {
      if (name !== winner.name) controller.abort();
    }
    window.__memoraAssetSource = winner.name;
    document.documentElement.dataset.memoraAssetSource = winner.name;
    installImageFallback(winner);
    await Promise.all(styles.map((path) => attachStyle(winner, path)));
    await import(assetUrl(winner.base, entry));
  } catch (error) {
    window.__memoraReportBoot?.(
      'asset_sources_exhausted',
      error?.stack || error?.message || String(error),
      entry
    );
    throw error;
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
