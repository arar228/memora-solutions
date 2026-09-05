import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkPomodoroAssets(directory) {
  const root = resolve(directory);
  const assets = resolve(root, 'assets');
  let references = 0;
  for (const name of readdirSync(assets)) {
    if (!/\.(css|js)$/.test(name)) continue;
    const file = resolve(assets, name);
    const text = readFileSync(file, 'utf8');
    if (name.endsWith('.js')) {
      if (/["'`]\/app\/pomodoro\/assets\/[^"'`]+\.(?:png|svg|webp|woff2?)["'`]/.test(text)) {
        throw new Error(`Root-absolute imported asset in ${name}`);
      }
      continue;
    }
    for (const match of text.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/g)) {
      const url = match[1];
      if (url.startsWith('#') || url.startsWith('data:')) continue;
      if (/^(?:\/|[a-z]+:)/i.test(url)) throw new Error(`CSS asset must be relative to its CDN stylesheet: ${url}`);
      const target = resolve(dirname(file), decodeURIComponent(url.split(/[?#]/)[0]));
      const path = relative(root, target);
      if (path.startsWith('..') || isAbsolute(path) || !existsSync(target)) {
        throw new Error(`Missing or escaping CSS asset: ${url}`);
      }
      references++;
    }
  }
  if (!references) throw new Error('No bundled font references were checked');
  return { status: 'ok', references };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(checkPomodoroAssets(fileURLToPath(new URL('../public/app/pomodoro/', import.meta.url)))));
}
