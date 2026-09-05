import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { browserBoot } from '../build/browserBoot.js';
import { resilientBootPlugin } from '../build/resilientBootPlugin.js';

async function documentAttempt({ href = 'https://example.test/pomodoro?keep=1#timer', mode = 'stall', styles = [], subdirectory = '', script } = {}) {
  const timers = new Map();
  const navigation = [];
  const imports = [];
  const links = [];
  const failures = [];
  const history = { state: { preserved: true }, replaceState(_state, _title, url) { this.url = url; } };
  const window = { addEventListener() {}, __memoraBootFailed: message => failures.push(message) };
  const context = vm.createContext({
    URL, window, history,
    location: { href, replace: url => navigation.push(url) },
    setTimeout: callback => { const id = {}; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    document: {
      documentElement: { dataset: {} },
      createElement: () => ({ remove() { this.removed = true; } }),
      head: { appendChild(link) {
        links.push(link);
        queueMicrotask(() => mode === 'style-error' ? link.onerror() : link.onload());
      } },
    },
  });
  const source = script || `(${browserBoot.toString()})(${JSON.stringify({ entry: 'static/entry.js', styles, subdirectory })});`;
  const module = new vm.SourceTextModule(source, {
    context,
    importModuleDynamically: async url => {
      imports.push(url);
      if (mode === 'stall') return new Promise(() => {});
      if (mode === 'import-error') throw new Error('module failed');
      const result = new vm.SyntheticModule([], function () {}, { context });
      await result.link(() => {});
      await result.evaluate();
      return result;
    },
  });
  await module.link(() => {});
  await module.evaluate();
  const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
  await flush();
  return { navigation, imports, links, failures, timers, history, window,
    async expire() { for (const callback of [...timers.values()]) callback(); await flush(); },
  };
}

test('a stalled import moves to another document without a second import', async () => {
  const first = await documentAttempt();
  assert.equal(first.imports.length, 1);
  await first.expire();
  assert.equal(first.navigation.length, 1);
  assert.equal(first.imports.length, 1);
  const url = new URL(first.navigation[0]);
  assert.equal(url.searchParams.get('keep'), '1');
  assert.equal(url.hash, '#timer');
  const second = await documentAttempt({ href: url.href });
  assert.match(second.imports[0], /^https:\/\/cdn.jsdelivr.net\//);
  await second.expire();
  const third = await documentAttempt({ href: second.navigation[0] });
  assert.match(third.imports[0], /^https:\/\/example.test\//);
  await third.expire();
  assert.equal(third.navigation.length, 0, 'no infinite reload loop');
  assert.equal(third.failures.length, 1);
});

test('successful recovery clears only its marker and cancels the deadline', async () => {
  const first = await documentAttempt();
  await first.expire();
  const recovered = await documentAttempt({ href: first.navigation[0], mode: 'success', styles: ['static/site.css'] });
  assert.equal(recovered.imports.length, 1);
  assert.equal(recovered.history.url, 'https://example.test/pomodoro?keep=1#timer');
  assert.equal(recovered.timers.size, 0);
  assert.equal(recovered.links[0].removed, undefined);
});

test('stylesheet failure cleans links and reloads before importing application code', async () => {
  const attempt = await documentAttempt({ mode: 'style-error', styles: ['static/site.css', 'static/extra.css'] });
  assert.equal(attempt.imports.length, 0);
  assert.equal(attempt.navigation.length, 1);
  assert.ok(attempt.links.every(link => link.removed));
});

test('Pomodoro uses the inherited source and exports it for scene downloads', async () => {
  const attempt = await documentAttempt({ mode: 'success', href: 'https://example.test/app/pomodoro/?assetSource=jsdelivr', subdirectory: 'app/pomodoro/' });
  assert.equal(attempt.window.__memoraAssetSource, 'jsdelivr');
  assert.match(attempt.window.__memoraAssetSources[0].base, /@cdn\/app\/pomodoro\/$/);
});

test('the actual HTML plugin emits standalone executable boot code', async () => {
  const html = resilientBootPlugin().transformIndexHtml.handler(
    '<script type="module" src="/static/entry.js"></script><link rel="stylesheet" href="/static/site.css">',
    { bundle: {} },
  );
  const script = html.match(/<script type="module" data-memora-resilient-boot>([\s\S]*?)<\/script>/)[1];
  const attempt = await documentAttempt({ mode: 'success', script });
  assert.equal(attempt.imports.length, 1);
  assert.equal(attempt.timers.size, 0);
});
