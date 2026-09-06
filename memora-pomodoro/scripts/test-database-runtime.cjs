// Exercise the actual WASM dependency without opening a user's profile.
const assert = require('node:assert/strict');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const original = new SQL.Database();
  original.run('CREATE TABLE sessions (id INTEGER PRIMARY KEY, profile TEXT, duration_sec INTEGER)');
  original.run('INSERT INTO sessions VALUES (?, ?, ?)', [1, 'Фокус', 1500]);
  const bytes = original.export();
  original.close();
  const restored = new SQL.Database(bytes);
  const statement = restored.prepare('SELECT profile, duration_sec FROM sessions WHERE id = ?');
  statement.bind([1]);
  assert.equal(statement.step(), true);
  assert.deepEqual(statement.getAsObject(), { profile: 'Фокус', duration_sec: 1500 });
  statement.free();
  restored.run('BEGIN');
  restored.run('UPDATE sessions SET duration_sec = 1');
  restored.run('ROLLBACK');
  assert.equal(restored.exec('SELECT duration_sec FROM sessions')[0].values[0][0], 1500);
  restored.close();
  console.log('sql.js WASM, Unicode, parameter binding, export/reopen and rollback: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
