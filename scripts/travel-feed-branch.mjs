// The data branch contains four JSON blobs only. It can never supply code to
// either Actions or the VPS. Code is always read from the reviewed main branch.
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const FEEDS = {
  flights: { items: 0 },
  'hot-deals': { deals: 5 },
  radar: { hotFlights: 5, cheapFrom: 20, calendars: 20 },
  tours: { items: 10 },
};
const REF = 'refs/remotes/origin/travel-data';
const MAX_BYTES = 32 * 1024 * 1024;

function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd, encoding: 'utf8', maxBuffer: MAX_BYTES, timeout: 60_000, ...options,
  });
}

export function validate(name, text) {
  if (!Object.hasOwn(FEEDS, name) || Buffer.byteLength(text) > MAX_BYTES) throw new Error('Invalid feed or size');
  const value = JSON.parse(text);
  // Last-known-good snapshots remain usable during an upstream outage.
  // Freshness and collapse checks for newly generated data are in validate-feeds.
  if (!value || !Number.isFinite(Date.parse(value.updatedAt))
    || Date.parse(value.updatedAt) > Date.now() + 5 * 60_000) throw new Error(name + ': invalid updatedAt');
  for (const [field, minimum] of Object.entries(FEEDS[name])) {
    if (!Array.isArray(value[field]) || value[field].length < minimum) throw new Error(name + ': invalid ' + field);
  }
  return text;
}

function localFeed(cwd, name) {
  const path = join(cwd, 'public', name + '.json');
  if (!lstatSync(path).isFile()) throw new Error('Feed must be a regular file');
  return validate(name, readFileSync(path, 'utf8'));
}

export function snapshot(cwd, ref = REF) {
  const entries = git(cwd, ['ls-tree', '-r', ref]).trim().split('\n');
  const expected = Object.keys(FEEDS).map(name => 'public/' + name + '.json').sort();
  const paths = entries.map(entry => {
    const match = /^100644 blob [a-f0-9]{40}\t(.+)$/.exec(entry);
    if (!match) throw new Error('Data branch contains a non-regular blob');
    return match[1];
  }).sort();
  if (JSON.stringify(paths) !== JSON.stringify(expected)) throw new Error('Data branch must contain exactly four allowlisted feeds');
  return Object.fromEntries(Object.keys(FEEDS).map(name => [
    name, validate(name, git(cwd, ['show', ref + ':public/' + name + '.json'])),
  ]));
}

export function fetchData(cwd) {
  git(cwd, ['fetch', '--no-tags', 'origin', 'travel-data:' + REF]);
}

export function prepare(cwd) {
  fetchData(cwd);
  const data = snapshot(cwd);
  for (const [name, text] of Object.entries(data)) writeFileSync(join(cwd, 'public', name + '.json'), text);
}

export function publish(cwd, names, seed = false) {
  if (!names.length || new Set(names).size !== names.length
    || names.some(name => !Object.hasOwn(FEEDS, name))) throw new Error('Specify unique allowlisted feed names');
  if (existsSync(join(cwd, '.feed-validation-fatal'))) throw new Error('Feed validation failed to restore a safe baseline');
  const base = seed ? null : git(cwd, ['rev-parse', REF]).trim();
  const previous = seed ? {} : snapshot(cwd, base);
  const data = { ...previous };
  for (const name of names) data[name] = localFeed(cwd, name);
  if (Object.keys(data).length !== Object.keys(FEEDS).length) throw new Error('Seed requires all four feeds');
  if (!seed && names.every(name => data[name] === previous[name])) {
    console.log('Feeds are current'); return base;
  }
  const temp = mkdtempSync(join(tmpdir(), 'memora-feed-index-'));
  try {
    const env = { ...process.env, GIT_INDEX_FILE: join(temp, 'index') };
    git(cwd, ['read-tree', '--empty'], { env });
    for (const [name, text] of Object.entries(data)) {
      const hash = git(cwd, ['hash-object', '-w', '--stdin'], { input: text }).trim();
      git(cwd, ['update-index', '--add', '--cacheinfo', '100644', hash, 'public/' + name + '.json'], { env });
    }
    const tree = git(cwd, ['write-tree'], { env }).trim();
    const commit = git(cwd, ['commit-tree', tree, ...(base ? ['-p', base] : []), '-m', 'data: refresh ' + names.join(', ')]).trim();
    // Fast-forward only. A stale writer fails instead of overwriting newer data.
    git(cwd, ['push', 'origin', commit + ':refs/heads/travel-data']);
    git(cwd, ['update-ref', REF, commit]);
    console.log('Published data snapshot ' + commit);
    return commit;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export function install(cwd, destination) {
  // Parse/validate every blob before opening any destination file.
  const data = snapshot(cwd);
  mkdirSync(destination, { recursive: true });
  const pending = [];
  try {
    for (const [name, text] of Object.entries(data)) {
      const path = join(destination, name + '.json');
      const temporary = path + '.' + randomUUID() + '.next';
      writeFileSync(temporary, text, { flag: 'wx', mode: 0o644 });
      pending.push([temporary, path]);
    }
    for (const [temporary, path] of pending) renameSync(temporary, path);
    console.log('Installed validated travel-data snapshot');
  } finally {
    for (const [temporary] of pending) rmSync(temporary, { force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const cwd = process.cwd();
    if (command === 'prepare' && !args.length) prepare(cwd);
    else if (command === 'publish') publish(cwd, args);
    else if (command === 'seed' && !args.length) publish(cwd, Object.keys(FEEDS), true);
    else if (command === 'install' && args.length === 1) install(cwd, resolve(args[0]));
    else throw new Error('Use prepare, publish <feeds>, seed, or install <destination>');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
