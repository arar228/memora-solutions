import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { isolatedModule } from './helpers/isolated.mjs';

test('database initialization retries after recovery, with backoff and shared attempts', async () => {
  let available = false;
  let time = 10000;
  let attempts = 0;
  let pool;
  class Clock extends Date { static now() { return time; } }
  class Pool extends EventEmitter {
    constructor() { super(); pool = this; }
    async query(sql) {
      if (sql.includes('CREATE TABLE')) attempts++;
      if (!available) throw new Error('database unavailable');
      return { rowCount: 1, rows: [{ value: 'stored-value' }] };
    }
  }
  const store = await isolatedModule('server/admin-store.js', {
    pg: { default: { Pool } },
    '../src/data/kanbanConfig.js': { cloneDefaultKanbanBoard: () => ({}) },
  }, { env: { ADMIN_DATABASE_URL: 'postgres://test@127.0.0.1/test' }, globals: { Date: Clock, console: { error() {} } } });

  await assert.rejects(store.getState('test'), /database unavailable/);
  available = true;
  await assert.rejects(store.getState('test'), /database unavailable/);
  assert.equal(attempts, 1, 'retry cooldown protects an unavailable database');
  time += 1001;
  const values = await Promise.all([store.getState('test'), store.getState('test')]);
  assert.deepEqual(values, ['stored-value', 'stored-value']);
  assert.equal(attempts, 2, 'concurrent requests share initialization');
  assert.doesNotThrow(() => pool.emit('error', new Error('idle disconnect')));
  assert.equal(await store.getState('test'), 'stored-value');
  assert.equal(attempts, 2, 'an idle client error preserves successful schema initialization');
});

test('Bday pool handles idle errors and bounds SQL execution', async () => {
  let pool;
  let options;
  class Pool extends EventEmitter {
    constructor(config) { super(); pool = this; options = config; }
    async query() { return { rowCount: 0, rows: [] }; }
  }
  const bday = await isolatedModule('server/bday-store.js', { pg: { default: { Pool } } }, {
    env: { BDAY_DATABASE_URL: 'postgres://test@127.0.0.1/test' },
    globals: { console: { error() {} } },
  });
  // A harmless lookup initializes the pool; the fake database has no users.
  await assert.rejects(bday.sendBdayMessage({ telegramId: '123456', message: 'test' }), /Пользователь не найден/);
  assert.equal(options.statement_timeout, 15000);
  assert.doesNotThrow(() => pool.emit('error', new Error('idle disconnect')));
});
