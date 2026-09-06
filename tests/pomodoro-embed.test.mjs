import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../src/pages/Pomodoro/PomodoroPage.jsx', import.meta.url);

test('embedded Pomodoro starts on demand while the direct app link stays available', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const iframe = source.match(/<iframe[\s\S]*?\/>/)?.[0] || '';

  assert.match(source, /const \[webAppStarted, setWebAppStarted\] = useState\(false\)/);
  assert.match(source, /onClick=\{\(\) => setWebAppStarted\(true\)\}/);
  assert.match(source, /href=\{WEB_APP_URL\}/);
  assert.match(iframe, /loading="lazy"/);
  assert.doesNotMatch(iframe, /fetchPriority="high"/);
});
