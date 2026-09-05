// Preload only the static entry graph. Lazy pages/scenes stay demand-loaded.
export function entryModules(bundle, entry) {
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    for (const dependency of bundle[file]?.imports || []) {
      if (bundle[dependency]?.type === 'chunk') visit(dependency);
    }
  }
  visit(entry);
  return [...visited];
}
