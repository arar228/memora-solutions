import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

// Load real source with explicit boundary fakes. No database, Telegram or
// payment request is allowed to escape a reliability test.
export async function isolatedModule(relativePath, stubs, { env = {}, globals = {} } = {}) {
  const url = new URL(`../../${relativePath}`, import.meta.url);
  const context = vm.createContext({
    console, Buffer, URL, Date, setTimeout, clearTimeout, setInterval, clearInterval,
    structuredClone, AbortController,
    fetch: async () => { throw new Error('Unmocked network request'); },
    process: { env, on() {}, exit() {}, uptime: () => 1 },
    ...globals,
  });
  const source = new vm.SourceTextModule(await readFile(url, 'utf8'), {
    context, identifier: url.href,
    initializeImportMeta(meta) { meta.url = url.href; },
  });
  await source.link(async specifier => {
    const exports = stubs[specifier]
      || (specifier.startsWith('node:') ? await import(specifier) : null);
    if (!exports) throw new Error(`Unmocked import: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await source.evaluate();
  return source.namespace;
}
