import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPomodoroAssets } from '../scripts/check-pomodoro-assets.mjs';

test('web asset check accepts portable fonts and rejects broken CDN paths', t => {
  const dir = mkdtempSync(join(tmpdir(), 'memora-assets-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'assets', 'font.woff2'), 'fixture');
  const css = join(dir, 'assets', 'app.css');
  writeFileSync(css, 'src:url(./font.woff2);fill:url(#tree-trunk)');
  assert.equal(checkPomodoroAssets(dir).references, 1);
  for (const url of ['/app/pomodoro/assets/font.woff2', 'missing.woff2', '../../outside.woff2']) {
    writeFileSync(css, `src:url(${url})`);
    assert.throws(() => checkPomodoroAssets(dir));
  }
  writeFileSync(css, 'src:url(./font.woff2)');
  writeFileSync(join(dir, 'assets', 'app.js'), 'const icon="/app/pomodoro/assets/icon.png";');
  assert.throws(() => checkPomodoroAssets(dir), /Root-absolute/);
});
