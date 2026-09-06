import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);

async function sourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  }));
  return nested.flat();
}

function specifiers(source) {
  const found = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1].startsWith('.')) found.push(match[1]);
  }
  return found;
}

function inside(path, root) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

async function importsOutside(files, root) {
  const found = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const specifier of specifiers(source)) {
      const target = resolve(dirname(file), specifier.split('?')[0]);
      if (!inside(target, root)) {
        found.push(`${relative(repo, file).replaceAll('\\', '/')} -> ${specifier}`);
      }
    }
  }
  return found.sort();
}

test('browser source keeps its documented cross-runtime import list', async () => {
  const src = resolve(repo, 'src');
  assert.deepEqual(await importsOutside(await sourceFiles(src), src), [
    'src/pages/TravelRadar3/TravelRadar3Page.jsx -> ../../../public/hot-deals.json',
  ]);
});

test('server cross-directory imports stay limited to the documented migration list', async () => {
  const server = resolve(repo, 'server');
  const files = [resolve(repo, 'server.js'), ...await sourceFiles(server)];
  assert.deepEqual(await importsOutside(files, server), [
    'server/admin-store.js -> ../src/data/kanbanConfig.js',
    'server/kanban-store.js -> ../src/data/kanbanConfig.js',
    'server/travel-radar-service.js -> ../scripts/fetch-tours.js',
    'server/travel-radar-service.js -> ../scripts/parse-deals.js',
    'server/travel-radar-service.js -> ../scripts/travel-affiliate-links.js',
  ]);
});

test('Pomodoro sources remain inside their independent component', async () => {
  const pomodoro = resolve(repo, 'memora-pomodoro');
  const sources = await sourceFiles(resolve(pomodoro, 'src'));
  assert.deepEqual(await importsOutside(sources, pomodoro), []);
});
