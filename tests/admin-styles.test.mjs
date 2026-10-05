import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import postcss from 'postcss';

const root = fileURLToPath(new URL('../', import.meta.url));

test('admin Tailwind migration preserves tokens and unlayered utilities without preflight', async () => {
  const output = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    publicDir: false,
    plugins: [tailwindcss()],
    build: {
      write: false,
      minify: false,
      cssMinify: false,
      rollupOptions: { input: fileURLToPath(new URL('../scripts/fixtures/admin-styles.html', import.meta.url)) },
    },
  });
  const css = output.output.filter(file => file.type === 'asset' && file.fileName.endsWith('.css'))
    .map(file => file.source).join('\n');
  const ast = postcss.parse(css);
  function rule(selector) {
    const rules = [];
    ast.walkRules(node => {
      if (node.selector.split(',').map(value => value.trim()).includes(selector)) rules.push(node);
    });
    assert.equal(rules.length, 1, `Expected generated ${selector}`);
    return rules[0];
  }
  function declaration(selector, property) {
    return rule(selector).nodes.find(node => node.prop === property)?.value;
  }
  assert.equal(declaration('.bg-bg', 'background-color').toUpperCase(), '#F3F7F8');
  assert.equal(declaration('.bg-brand', 'background-color').toUpperCase(), '#06798A');
  assert.match(declaration('.bg-surface', 'background-color'), /^(?:#FFFFFF|#fff)$/i);
  assert.equal(declaration('.text-ui', 'font-size'), '18px');
  assert.equal(declaration('.text-admin-heading', 'font-size'), '22px');
  assert.equal(declaration('.rounded-control', 'border-radius'), '10px');
  assert.equal(declaration('.h-12', 'height'), '3rem');
  assert.match(declaration('.px-3', 'padding-inline'), /^0?\.75rem$/);
  for (let parent = rule('.px-3').parent; parent; parent = parent.parent) {
    assert.notEqual(parent.name, 'layer', 'Utilities must override the public unlayered reset');
  }
  // Only the public CSS owns body/html; Tailwind preflight must stay excluded.
  assert.equal(declaration('body', 'overflow-y'), 'visible');
  assert.equal(declaration('html', 'scrollbar-gutter'), 'stable');
  assert.doesNotMatch(css, /-webkit-text-size-adjust|tab-size:\s*4|list-style:\s*none/);
});

test('admin utility generation stays limited to admin and shared UI sources', async () => {
  const css = await readFile(new URL('../src/admin/admin.css', import.meta.url), 'utf8');
  assert.match(css, /utilities\.css"\s+source\(none\)/);
  assert.deepEqual([...css.matchAll(/@source "([^"]+)"/g)].map(match => match[1]), [
    './**/*.{js,jsx}', '../ui/**/*.{js,jsx}',
  ]);
  assert.doesNotMatch(css, /preflight\.css/);
});
