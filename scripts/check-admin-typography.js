import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ALLOWED = new Set(['18', '22', '56']);
const files = [];

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (['.css', '.js', '.jsx'].includes(extname(entry.name))) files.push(path);
  }
}

collect(join(ROOT, 'src', 'admin'));
collect(join(ROOT, 'src', 'ui'));
files.push(join(ROOT, 'tailwind.config.js'));

const violations = [];
const pixelPatterns = [
  /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi,
  /text-\[(\d+(?:\.\d+)?)px\]/g,
  /fontSize\s*:\s*['"]?(\d+(?:\.\d+)?)px/gi,
];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const relative = file.slice(ROOT.length + 1).replaceAll('\\', '/');
  for (const pattern of pixelPatterns) {
    for (const match of source.matchAll(pattern)) {
      if (!ALLOWED.has(match[1])) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(`${relative}:${line} — ${match[1]}px`);
      }
    }
  }
}

if (violations.length) {
  console.error('Админка использует размер шрифта вне шкалы 56 / 22 / 18 px:');
  violations.forEach(violation => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('Admin typography: 56 / 22 / 18 px');
