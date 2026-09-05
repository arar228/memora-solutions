// Cross-platform public build: no shell-specific environment syntax or secret.
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const mode = process.argv[2];
if (!['web', 'desktop', 'preview'].includes(mode)) throw new Error('Expected web, desktop or preview');
const env = { ...process.env, MEMORA_PUBLIC_BUILD: 'true' };
delete env.MEMORA_SCENE_KEY;
const command = mode === 'web'
  ? [resolve(__dirname, '../node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.web.config.ts']
  : [resolve(__dirname, '../node_modules/electron-vite/bin/electron-vite.js'), mode === 'preview' ? 'preview' : 'build'];
const result = spawnSync(process.execPath, command, { cwd: resolve(__dirname, '..'), env, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (mode === 'web') {
  const check = spawnSync(process.execPath, [resolve(__dirname, '../../scripts/check-pomodoro-assets.mjs')], { stdio: 'inherit' });
  if (check.error) throw check.error;
  process.exitCode = check.status ?? 1;
}
