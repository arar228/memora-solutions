import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEEDS, prepare, publish, install, snapshot, validate } from '../scripts/travel-feed-branch.mjs';

const validator = fileURLToPath(new URL('../scripts/validate-feeds.js', import.meta.url));
function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function payload(name, count = 1) {
  return JSON.stringify({ updatedAt: new Date().toISOString(), ...Object.fromEntries(
    Object.entries(FEEDS[name]).map(([key, minimum]) => [key, Array(Math.max(minimum, count)).fill({ price: 100 })]),
  ) }) + '\n';
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'memora-feed-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cwd = join(root, 'code');
  const remote = join(root, 'origin.git');
  mkdirSync(cwd);
  git(root, 'init', '--bare', remote);
  git(cwd, 'init', '-b', 'master');
  git(cwd, 'config', 'user.name', 'Feed fixture');
  git(cwd, 'config', 'user.email', 'fixture@example.invalid');
  git(cwd, 'config', 'core.autocrlf', 'false');
  mkdirSync(join(cwd, 'public'));
  for (const name of Object.keys(FEEDS)) writeFileSync(join(cwd, 'public', name + '.json'), payload(name));
  writeFileSync(join(cwd, 'server.js'), 'export const value = 1;\n');
  git(cwd, 'add', '.'); git(cwd, 'commit', '-m', 'Code baseline');
  git(cwd, 'remote', 'add', 'origin', remote);
  git(cwd, 'push', 'origin', 'master');
  const main = git(cwd, 'rev-parse', 'HEAD');
  publish(cwd, Object.keys(FEEDS), true);
  return { root, cwd, remote, main };
}

test('data publication keeps code, working index and main branch intact', t => {
  const { cwd, main } = fixture(t);
  writeFileSync(join(cwd, 'server.js'), 'export const value = 2;\n');
  git(cwd, 'add', 'server.js');
  const index = git(cwd, 'write-tree');
  const before = snapshot(cwd);
  writeFileSync(join(cwd, 'public', 'flights.json'), payload('flights', 9));
  publish(cwd, ['flights']);
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), main);
  assert.equal(git(cwd, 'rev-parse', 'origin/master'), main);
  assert.equal(git(cwd, 'write-tree'), index);
  assert.equal(JSON.parse(snapshot(cwd).flights).items.length, 9);
  assert.equal(snapshot(cwd).tours, before.tours);
  assert.throws(() => publish(cwd, ['../server']), /allowlisted/);
});

test('stale writers cannot overwrite a newer feed snapshot', t => {
  const { cwd } = fixture(t);
  const baseline = git(cwd, 'rev-parse', 'refs/remotes/origin/travel-data');
  writeFileSync(join(cwd, 'public', 'flights.json'), payload('flights', 9));
  const newest = publish(cwd, ['flights']);
  git(cwd, 'update-ref', 'refs/remotes/origin/travel-data', baseline);
  writeFileSync(join(cwd, 'public', 'flights.json'), payload('flights', 12));
  assert.throws(() => publish(cwd, ['flights']));
  assert.match(git(cwd, 'ls-remote', 'origin', 'refs/heads/travel-data'), new RegExp('^' + newest));
});

test('prepare restores the data baseline; validation rolls back to data, not old code', t => {
  const { cwd } = fixture(t);
  writeFileSync(join(cwd, 'public', 'flights.json'), payload('flights', 8));
  publish(cwd, ['flights']);
  const text = snapshot(cwd).flights;
  prepare(cwd);
  assert.equal(readFileSync(join(cwd, 'public', 'flights.json'), 'utf8'), text);
  writeFileSync(join(cwd, 'public', 'flights.json'), '{bad json');
  assert.throws(() => execFileSync(process.execPath, [validator, 'flights'], {
    cwd, env: { ...process.env, FEED_BASE_REF: 'refs/remotes/origin/travel-data' }, stdio: 'pipe',
  }));
  assert.equal(readFileSync(join(cwd, 'public', 'flights.json'), 'utf8'), text);
  assert.equal(existsSync(join(cwd, '.feed-validation-fatal')), false);
});

test('installer validates the entire data tree before replacing any live file', t => {
  const { cwd, root } = fixture(t);
  const destination = join(root, 'dist');
  install(cwd, destination);
  const before = Object.fromEntries(Object.keys(FEEDS).map(name => [name, readFileSync(join(destination, name + '.json'), 'utf8')]));
  // A branch containing executable code must be rejected, even with valid JSON.
  git(cwd, 'update-ref', 'refs/remotes/origin/travel-data', 'HEAD');
  assert.throws(() => install(cwd, destination), /exactly four/);
  for (const [name, text] of Object.entries(before)) assert.equal(readFileSync(join(destination, name + '.json'), 'utf8'), text);
  assert.throws(() => validate('flights', '{"updatedAt":"bad","items":[]}'), /updatedAt/);
  assert.throws(() => validate('tours', JSON.stringify({ updatedAt: new Date().toISOString(), items: [] })), /items/);
  assert.throws(() => validate('flights', '{'), SyntaxError);
});
