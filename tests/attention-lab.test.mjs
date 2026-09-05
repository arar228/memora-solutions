import test from 'node:test';
import assert from 'node:assert/strict';
import { EXHIBITS, REFERENCES, OUTPUTS, readSelection, getInsight, createBrief, say } from '../src/pages/AttentionLab/labData.js';

test('lab selection accepts existing bookmarks and validated study IDs only', () => {
  assert.deepEqual(readSelection('["ft","compare","ft","pudding","unknown",null,{},3]'), ['ft', 'compare', 'pudding']);
  for (const value of ['', 'bad json', '{}', 'null', '5', '"compare"']) assert.deepEqual(readSelection(value), []);
  const all = [...EXHIBITS, ...REFERENCES].map(item => item.id);
  assert.deepEqual(readSelection(JSON.stringify(all)), all);
});

test('lab demonstration datasets have unique IDs, valid focus and bilingual copy', () => {
  const allIds = [...EXHIBITS, ...REFERENCES].map(item => item.id);
  assert.equal(new Set(allIds).size, allIds.length);
  for (const exhibit of EXHIBITS) {
    assert.equal(new Set(exhibit.rows.map(row => row.id)).size, exhibit.rows.length);
    assert.ok(exhibit.rows.some(row => row.id === exhibit.focusId));
    assert.ok(exhibit.rows.every(row => Number.isFinite(row.value) && row.value >= 0));
    for (const field of ['name', 'title', 'subject', 'form', 'principle', 'explanation', 'application']) {
      for (const lang of ['ru', 'en']) assert.ok(say(exhibit[field], lang));
    }
    for (const lang of ['ru', 'en']) for (const row of exhibit.rows) {
      const insight = getInsight(exhibit, row.id, lang);
      assert.ok(insight.value && insight.label && insight.detail);
      assert.doesNotMatch(insight.detail, /undefined|NaN/);
    }
  }
});

test('lab ranking and parts use their own totals; chronology is retained', () => {
  const [compare, change, parts] = EXHIBITS;
  assert.equal(compare.rows.reduce((sum, row) => sum + row.value, 0), 108);
  assert.equal(getInsight(compare, 'catalog', 'ru').value, '43%');
  assert.equal(getInsight(compare, 'account', 'en').value, '11%');
  assert.equal(parts.rows.reduce((sum, row) => sum + row.value, 0), 100);
  assert.equal(getInsight(parts, 'frontend', 'ru').value, '36%');
  assert.deepEqual(change.rows.map(row => row.id), ['jan', 'feb', 'mar', 'apr', 'may', 'jun']);
  assert.match(getInsight(change, 'jun', 'ru').detail, /^\+32 п.п./);
  assert.match(getInsight(change, 'mar', 'en').detail, /^-2 pp/);
});

test('lab flow uses the common entrance and the actual previous-step difference', () => {
  const flow = EXHIBITS.find(item => item.id === 'flow');
  assert.equal(getInsight(flow, 'action', 'ru').value, '41%');
  assert.match(getInsight(flow, 'explore', 'ru').detail, /−280 человек/);
  assert.match(getInsight(flow, 'choose', 'en').detail, /−180 people/);
  assert.match(getInsight(flow, 'visit', 'en').detail, /visitors\. The baseline/);
  assert.equal(getInsight(flow, 'invalid', 'ru').value, '100%');
});

test('lab briefs contain reusable links, chosen output and demo-data disclosure', () => {
  for (const lang of ['ru', 'en']) {
    for (const output of OUTPUTS) {
      const brief = createBrief(['compare', 'ft', 'compare', 'untrusted'], output.id, lang);
      assert.match(brief, /https:\/\/memorasolutions.ru\/attention-lab\?example=compare/);
      assert.match(brief, /https:\/\/github.com\/Financial-Times\/chart-doctor/);
      assert.equal(brief.split('?example=compare').length, 2);
      assert.ok(brief.includes(output.engine));
      assert.doesNotMatch(brief, /untrusted|undefined|NaN/);
      assert.match(brief, lang === 'ru' ? /демонстрационные/ : /illustrative/);
    }
  }
  assert.match(createBrief([], 'unknown'), /Observable Plot/);
});
