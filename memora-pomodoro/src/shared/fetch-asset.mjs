// The timeout covers the entire body. This module also runs in local fault tests.
export async function fetchAssetText(urls, { timeoutMs = 8000, maxBytes = 4 * 1024 * 1024 } = {}) {
  let lastError = new Error('Asset sources are missing');
  for (const url of new Set(urls)) {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: 'force-cache', signal: controller.signal });
      if (!response.ok) throw new Error(`Asset HTTP ${response.status}`);
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new Error('Asset exceeds size limit');
        chunks.push(value);
      }
      if (!size) throw new Error('Asset is empty');
      return await new Blob(chunks).text();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(deadline);
      controller.abort();
    }
  }
  throw lastError;
}
