import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities } from '../scripts/fetch-tours.js';

test('tour text removes markup and decodes each entity once', () => {
  assert.equal(
    decodeEntities('Первая<br>Вторая <<script>alert(1)</script> &amp;lt;b&amp;gt;'),
    'Первая\nВторая alert(1) &lt;b&gt;',
  );
});

test('tour text accepts valid numeric entities and preserves invalid ones', () => {
  assert.equal(decodeEntities('Цена: 10&#160;000 &#128293;'), 'Цена: 10 000 🔥');
  assert.equal(decodeEntities('Код: &#99999999;'), 'Код: &#99999999;');
});
