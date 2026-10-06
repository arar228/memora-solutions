import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GOALS, INITIAL_JOURNEY, journeyReducer, goalFromSearch, goalBrief, pointInTarget } from '../src/pages/AttentionLab/journey.js';

test('attention journey requires all actions and preserves every chosen goal', () => {
  for (const goal of GOALS) {
    let state = INITIAL_JOURNEY;
    assert.equal(journeyReducer(state, { type: 'connect' }), state);
    assert.equal(journeyReducer(state, { type: 'choose', goal: goal.id }), state);
    state = journeyReducer(state, { type: 'start' });
    assert.deepEqual(state, { step: 1, goal: null });
    assert.equal(journeyReducer(state, { type: 'choose', goal: 'untrusted' }), state);
    state = journeyReducer(state, { type: 'choose', goal: goal.id });
    assert.deepEqual(state, { step: 2, goal: goal.id });
    state = journeyReducer(state, { type: 'connect' });
    assert.deepEqual(state, { step: 3, goal: goal.id });
    assert.equal(journeyReducer(state, { type: 'connect' }), state);
    assert.equal(journeyReducer(state, { type: 'choose', goal: 'act' }), state);
    assert.equal(journeyReducer(state, { type: 'restart' }), INITIAL_JOURNEY);
  }
});

test('restart clears choices at every stage and repeated actions are harmless', () => {
  for (const state of [INITIAL_JOURNEY, { step: 1, goal: null }, { step: 2, goal: 'act' }, { step: 3, goal: 'choose' }]) {
    assert.deepEqual(journeyReducer(state, { type: 'restart' }), { step: 0, goal: null });
    assert.equal(journeyReducer(state, { type: 'unknown' }), state);
  }
  const started = journeyReducer(INITIAL_JOURNEY, { type: 'start' });
  assert.equal(journeyReducer(started, { type: 'start' }), started);
});

test('contact handoff accepts only known public IDs, with a bilingual editable brief', () => {
  for (const goal of GOALS) {
    assert.equal(goalFromSearch(`?labGoal=${goal.id}&extra=ignored`), goal);
    for (const lang of ['ru', 'en']) {
      assert.ok(goal[lang].title && goal[lang].detail && goal[lang].result);
      assert.ok(goalBrief(goal.id, lang).includes(goal[lang].title.toLowerCase()));
      assert.doesNotMatch(goalBrief(goal.id, lang), /undefined|NaN/);
    }
  }
  for (const search of ['', '?labGoal=unknown', '?labGoal=%3Cscript%3E', '?labGoal=act%26admin%3Dtrue']) assert.equal(goalFromSearch(search), null);
  assert.equal(goalBrief(undefined), '');
  assert.equal(goalBrief('unknown'), '');
});

test('drag success is based on a finite pointer position inside the target', () => {
  const rect = { left: 100, right: 220, top: 40, bottom: 160 };
  for (const point of [{ x: 100, y: 40 }, { x: 220, y: 160 }, { x: 150, y: 100 }]) assert.equal(pointInTarget(point, rect), true);
  for (const point of [null, { x: NaN, y: 100 }, { x: Infinity, y: 80 }, { x: 99, y: 100 }, { x: 150, y: 161 }]) assert.equal(pointInTarget(point, rect), false);
});

test('Lab respects site typography, reduced motion and a tunnel-only experience', () => {
  for (const file of ['AttentionLabPage.jsx', 'ReferenceLibrary.jsx', 'LabWorkbench.jsx']) {
    assert.doesNotMatch(readFileSync(new URL(`../src/pages/AttentionLab/${file}`, import.meta.url), 'utf8'), /data-typography-exempt/);
  }
  const source = readFileSync(new URL('../src/pages/AttentionLab/AttentionLabPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /useReducedMotion/);
  assert.doesNotMatch(source, /ReferenceLibrary|libraryMounted|libraryOpen|useSearchParams|playground|<details|<summary/);
  assert.doesNotMatch(source, /Референсы и инфографика|References and information design/);
  assert.match(source, /className="tunnel-contact"/);
  assert.doesNotMatch(source, /type="range"|sculpture-steps/);
  assert.match(source, /<AttentionSculpture/);
  assert.doesNotMatch(source, /setInterval|fetch\(|localStorage|repeat: Infinity/);
  const css = readFileSync(new URL('../src/pages/AttentionLab/AttentionJourney.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /font-size\s*:/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /journey-library|tunnel-library-wrap/);
  assert.match(css, /\.attention-lab\.attention-journey \{ padding: 0;/);
  for (const path of ['../src/pages/AttentionLab/AttentionLabPage.css', '../src/shared/AttentionPortal.css']) assert.doesNotMatch(readFileSync(new URL(path, import.meta.url), 'utf8'), /font-size\s*:/);
});
