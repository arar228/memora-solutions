// Embedded in both HTML documents. A timed-out import cannot be cancelled
// reliably, so every recovery attempt starts in a new document.
export async function browserBoot({ entry, styles, subdirectory = '', timeoutMs = 8000 }) {
  const page = new URL(location.href);
  const parameter = '__memora_boot';
  const sources = [
    { name: 'github', base: `https://arar228.github.io/memora-solutions/${subdirectory}` },
    { name: 'jsdelivr', base: `https://cdn.jsdelivr.net/gh/arar228/memora-solutions@cdn/${subdirectory}` },
    { name: 'origin', base: new URL(subdirectory ? './' : '/', page).href },
  ];
  const preferred = subdirectory && page.searchParams.get('assetSource');
  if (sources.some(source => source.name === preferred)) {
    sources.sort((a, b) => Number(b.name === preferred) - Number(a.name === preferred));
  }
  let failed = [];
  try {
    const recovery = JSON.parse(page.searchParams.get(parameter));
    if (recovery?.entry === entry && Array.isArray(recovery.failed)) {
      failed = sources.map(source => source.name).filter(name => recovery.failed.includes(name));
    }
  } catch { /* Malformed or obsolete markers start a fresh attempt. */ }
  const remaining = sources.filter(source => !failed.includes(source.name));
  const source = remaining[0];
  const links = [];
  let settled = false;
  let deadline;

  function clearRecovery() {
    const clean = new URL(location.href);
    clean.searchParams.delete(parameter);
    history.replaceState(history.state, '', clean.href);
  }

  function showFailure() {
    if (window.__memoraBootFailed) return window.__memoraBootFailed('Источники файлов приложения недоступны.');
    const root = document.getElementById('root');
    if (!root) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Повторить загрузку таймера';
    button.style.cssText = 'margin:24px;padding:12px 18px;border:0;border-radius:10px;background:#31c7d9;color:#101115;font:700 16px Arial;cursor:pointer';
    button.onclick = () => { clearRecovery(); location.reload(); };
    root.replaceChildren(button);
  }

  function fail(error) {
    if (settled) return;
    settled = true;
    clearTimeout(deadline);
    links.forEach(link => link.remove());
    window.__memoraReportBoot?.('asset_source_failed', error?.message || String(error), source?.name || 'none');
    if (source && remaining.length > 1) {
      page.searchParams.set(parameter, JSON.stringify({ entry, failed: [...failed, source.name] }));
      location.replace(page.href);
    } else {
      showFailure();
    }
  }

  if (!source) { fail(new Error('Asset sources exhausted')); return; }
  window.__memoraAssetBase = source.base;
  window.__memoraAssetSource = source.name;
  const orderedSources = [source, ...sources.filter(item => item !== source)];
  window.__memoraAssetSources = orderedSources;
  document.documentElement.dataset.memoraAssetSource = source.name;
  window.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const current = image.currentSrc || image.src;
    const index = orderedSources.findIndex(item => current.startsWith(item.base));
    if (index < 0 || index >= orderedSources.length - 1) return;
    const path = current.slice(orderedSources[index].base.length);
    if (/\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(path)) {
      image.src = new URL(path, orderedSources[index + 1].base).href;
    }
  }, true);

  deadline = setTimeout(() => fail(new Error('Application transfer deadline exceeded')), timeoutMs);
  try {
    await Promise.all(styles.map(path => new Promise((resolve, reject) => {
      const link = document.createElement('link');
      links.push(link);
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      link.href = new URL(path, source.base).href;
      link.onload = resolve;
      link.onerror = () => reject(new Error('Stylesheet transfer failed'));
      document.head.appendChild(link);
    })));
    if (settled) return;
    await import(new URL(entry, source.base).href);
    if (settled) return;
    settled = true;
    clearTimeout(deadline);
    clearRecovery();
  } catch (error) {
    fail(error);
  }
}
