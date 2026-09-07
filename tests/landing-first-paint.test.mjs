import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('landing heading and actions render as visible native elements', () => {
  const source = readFileSync(new URL('../src/pages/Creator/CreatorPage.jsx', import.meta.url), 'utf8');
  for (const [tag, name] of [['span', 'portfolio-eyebrow'], ['span', 'portfolio-hero__title-primary'], ['span', 'portfolio-hero__title-secondary'], ['div', 'portfolio-hero__meta']]) {
    assert.ok(source.includes(`<${tag} className="${name}">`), name);
  }
  const copy = source.split('<div className="portfolio-hero__copy">')[1].split('<motion.div ref={showcaseRef}')[0];
  assert.doesNotMatch(copy, /initial=|animate=|transition=/);
});

test('landing route opts into an immediately visible page wrapper', () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('<Route path="/" element={<PageTransition immediate><CreatorPage /></PageTransition>} />'));
  assert.ok(source.includes('initial={immediate ? false : { opacity: 0, y: 12 }}'));
});
