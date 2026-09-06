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

async function sourceGraph(files) {
  const normalized = new Map(files.map(file => [resolve(file), file]));
  const graph = new Map();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const targets = [];
    for (const specifier of specifiers(source)) {
      const base = resolve(dirname(file), specifier.split('?')[0]);
      const candidates = [
        base,
        ...[...sourceExtensions].map(extension => `${base}${extension}`),
        ...[...sourceExtensions].map(extension => resolve(base, `index${extension}`)),
      ];
      const target = candidates.find(candidate => normalized.has(resolve(candidate)));
      if (target) targets.push(resolve(target));
    }
    graph.set(resolve(file), targets);
  }
  return graph;
}

function stronglyConnected(graph) {
  let index = 0;
  const indices = new Map();
  const low = new Map();
  const stack = [];
  const active = new Set();
  const components = [];

  function visit(node) {
    indices.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    active.add(node);

    for (const target of graph.get(node) || []) {
      if (!indices.has(target)) {
        visit(target);
        low.set(node, Math.min(low.get(node), low.get(target)));
      } else if (active.has(target)) {
        low.set(node, Math.min(low.get(node), indices.get(target)));
      }
    }

    if (low.get(node) !== indices.get(node)) return;
    const component = [];
    for (;;) {
      const current = stack.pop();
      active.delete(current);
      component.push(current);
      if (current === node) break;
    }
    if (component.length > 1 || (graph.get(node) || []).includes(node)) components.push(component);
  }

  for (const node of graph.keys()) if (!indices.has(node)) visit(node);
  return components;
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

test('Pomodoro source cycles stay limited to the documented desktop migration', async () => {
  const sources = await sourceFiles(resolve(repo, 'memora-pomodoro', 'src'));
  const cycles = stronglyConnected(await sourceGraph(sources))
    .map(component => component.map(file => relative(repo, file).replaceAll('\\', '/')).sort())
    .sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(cycles, [[
    'memora-pomodoro/src/main/db.ts',
    'memora-pomodoro/src/main/overlay.ts',
  ]]);
});
