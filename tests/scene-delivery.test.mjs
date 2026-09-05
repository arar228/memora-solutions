import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fetchAssetText } from '../memora-pomodoro/src/shared/fetch-asset.mjs';

test('scene delivery switches after a stalled body, and rejects empty or oversized assets', async t => {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    if (req.url === '/good') return res.end('complete scene');
    if (req.url === '/empty') return res.end();
    if (req.url === '/large') return res.end('too much data');
    res.writeHead(200, { 'Content-Length': 10000 });
    res.write('partial');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal(await fetchAssetText([`${base}/stall`, `${base}/stall`, `${base}/good`], { timeoutMs: 1000 }), 'complete scene');
  assert.deepEqual(requests, ['/stall', '/good'], 'duplicate sources are skipped');
  await assert.rejects(fetchAssetText([`${base}/empty`]), /empty/);
  await assert.rejects(fetchAssetText([`${base}/large`], { maxBytes: 4 }), /size limit/);
});
