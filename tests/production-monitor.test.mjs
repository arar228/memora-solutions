import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { checkProduction, fetchComplete } from '../scripts/check-production.mjs';

async function fixture(t) {
  const server = createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<meta name="memora-entry" content="static/entry.js">');
    } else if (req.url.startsWith('/good/')) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end('export const ready = true;');
    } else if (req.url.startsWith('/empty/')) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end();
    } else if (req.url.startsWith('/wrong-type/')) {
      res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<h1>error page</h1>');
    } else {
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Content-Length': 100000 });
      res.write('partial JavaScript');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return `http://127.0.0.1:${server.address().port}/`;
}

test('partial HTTP 200 reaches its body deadline and fails', async t => {
  const base = await fixture(t);
  await assert.rejects(fetchComplete(`${base}stalled`, { timeoutMs: 100 }));
});
test('monitor accepts a complete fallback and reports degraded delivery', async t => {
  const base = await fixture(t);
  const result = await checkProduction({ base, sources: [base, `${base}good/`], timeoutMs: 1000 });
  assert.equal(result.status, 'degraded');
  assert.equal(result.source, `${base}good/`);
  assert.equal(result.failures.length, 1);
});
test('empty responses and HTML error pages never count as a healthy bundle', async t => {
  const base = await fixture(t);
  await assert.rejects(checkProduction({ base, sources: [`${base}empty/`, `${base}wrong-type/`] }), /Every entry source failed/);
});
