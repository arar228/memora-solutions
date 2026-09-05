import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneDefines } from '../build/sceneDefines.js';

test('public builds have no artwork key, including when the environment supplies one', () => {
  const publicDefines = sceneDefines(undefined, true);
  assert.deepEqual(sceneDefines('ignored-private-key', true), publicDefines);
  assert.equal(publicDefines.__MEMORA_NINJA_AVAILABLE__, 'false');
  assert.equal(JSON.parse(publicDefines.__MEMORA_SCENE_KEY_A__), '');
  assert.equal(JSON.parse(publicDefines.__MEMORA_SCENE_KEY_B__), '');
});

test('official builds require a matching-length key and retain the artwork', () => {
  assert.throws(() => sceneDefines(), /required/);
  assert.throws(() => sceneDefines('invalid'), /32 bytes/);
  const fixture = Buffer.alloc(32, 7);
  const defines = sceneDefines(fixture.toString('base64'));
  const a = Buffer.from(JSON.parse(defines.__MEMORA_SCENE_KEY_A__), 'base64');
  const b = Buffer.from(JSON.parse(defines.__MEMORA_SCENE_KEY_B__), 'base64');
  assert.deepEqual(Buffer.from(a.map((byte, i) => byte ^ b[i])), fixture);
  assert.equal(defines.__MEMORA_NINJA_AVAILABLE__, 'true');
});
