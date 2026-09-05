import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer, get } from 'node:http';
import { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import { isolatedModule } from './helpers/isolated.mjs';

async function fixture(t) {
  let server;
  let mode = 'normal';
  const html = Buffer.from('<!doctype html><title>test</title>');
  const code = await readFile(new URL('../server.js', import.meta.url), 'utf8');
  const stubs = {};
  for (const match of code.matchAll(/import\s*\{([^}]+)\}\s*from\s*'([^']+)'/g)) {
    if (!match[2].startsWith('./server/')) continue;
    stubs[match[2]] = Object.fromEntries(match[1].split(',').map(s => s.trim()).filter(Boolean).map(name => [name, async () => null]));
  }
  Object.assign(stubs['./server/admin-store.js'], { DEFAULT_POMODORO_TOKENS: {}, getState: async (_key, fallback) => fallback });
  Object.assign(stubs['./server/kanban-store.js'], { KANBAN_MESSAGE_MODES: new Set(['general', 'personal']), KANBAN_BOARD_KEY: 'board' });
  stubs['node:http'] = { createServer(handler) { server = createServer(handler); return server; } };
  stubs['node:fs'] = {
    readFileSync: () => html.toString(),
    createReadStream: () => Readable.from((async function* () {
      for (let i = 0; i < 5000; i++) {
        yield Buffer.alloc(1024);
        await delay(1);
        if (mode === 'stream-error') throw new Error('simulated disk error');
      }
    })()),
  };
  stubs['node:fs/promises'] = {
    stat: async file => {
      if (file.endsWith('missing.js')) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return { size: file.endsWith('large.bin') ? 5000 * 1024 : html.length, mtimeMs: 1000, mtime: new Date(1000), isDirectory: () => false };
    },
    readFile: async () => {
      if (mode === 'read-error') throw Object.assign(new Error('read failed'), { code: 'EIO' });
      return html;
    },
  };
  await isolatedModule('server.js', stubs, {
    env: { HOST: '127.0.0.1', PORT: '0' },
    globals: { console: { log() {}, error() {} } },
  });
  if (!server.listening) await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { base: `http://127.0.0.1:${server.address().port}`, setMode(value) { mode = value; } };
}

test('aborting repeated large downloads leaves the same HTTP server healthy', async t => {
  const { base } = await fixture(t);
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve, reject) => {
      const req = get(`${base}/large.bin`, res => {
        res.once('data', () => { res.destroy(); req.destroy(); resolve(); });
      });
      req.on('error', reject);
    });
    await delay(20);
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
  }
});

test('stream and file-read errors never start a second response', async t => {
  const fixtureServer = await fixture(t);
  fixtureServer.setMode('stream-error');
  const response = await fetch(`${fixtureServer.base}/large.bin`);
  await assert.rejects(response.arrayBuffer());
  await delay(20);
  assert.equal((await fetch(`${fixtureServer.base}/health`)).status, 200);
  fixtureServer.setMode('read-error');
  const failedRead = await fetch(`${fixtureServer.base}/index.html`);
  assert.equal(failedRead.status, 500);
  assert.equal(await failedRead.text(), 'Server error');
});

test('missing assets keep their 404 and HEAD returns no body', async t => {
  const { base } = await fixture(t);
  assert.equal((await fetch(`${base}/missing.js`)).status, 404);
  const head = await fetch(`${base}/index.html`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});
