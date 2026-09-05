import { pathToFileURL } from 'node:url';

export async function fetchComplete(url, { timeoutMs = 12000, maxBytes = 4 * 1024 * 1024 } = {}) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { controller.abort(); throw new Error('Response exceeds size limit'); }
      chunks.push(Buffer.from(value));
    }
    if (!size) throw new Error('Empty response');
    return { text: Buffer.concat(chunks).toString('utf8'), bytes: size, contentType: response.headers.get('content-type') || '' };
  } finally {
    // The deadline includes the complete body, not just the HTTP headers.
    clearTimeout(deadline);
    controller.abort();
  }
}

export async function checkProduction({
  base = 'https://memorasolutions.ru/',
  sources = [base, 'https://arar228.github.io/memora-solutions/', 'https://cdn.jsdelivr.net/gh/arar228/memora-solutions@cdn/'],
  timeoutMs = 12000,
} = {}) {
  const html = await fetchComplete(base, { timeoutMs, maxBytes: 256 * 1024 });
  if (!html.contentType.includes('text/html')) throw new Error('Expected an HTML document');
  const entry = html.text.match(/<meta\s+name="memora-entry"\s+content="([^"]+)"/)?.[1];
  if (!entry || !/^static\/[a-zA-Z0-9_/-]+\.js$/.test(entry) || entry.includes('..')) throw new Error('Valid entry metadata was not found');
  const failures = [];
  for (const source of sources) {
    try {
      const bundle = await fetchComplete(new URL(entry, source), { timeoutMs });
      if (!/(?:javascript|ecmascript)/i.test(bundle.contentType)) throw new Error('Expected JavaScript content');
      return { status: failures.length ? 'degraded' : 'ok', source, entry, bytes: bundle.bytes, failures };
    } catch (error) {
      failures.push({ source, error: error.name === 'AbortError' ? 'Transfer deadline exceeded' : error.message });
    }
  }
  throw new Error(`Every entry source failed: ${JSON.stringify(failures)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkProduction().then(result => {
    console.log(JSON.stringify(result));
    if (result.status === 'degraded') console.warn('::warning::Primary entry delivery failed; a fallback completed.');
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
