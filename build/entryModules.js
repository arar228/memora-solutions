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

// Start the landing route's static graph with the entry, only on that route.
// Other pages and their dynamic dependencies retain demand loading.
export function landingAssets(bundle) {
  const landing = Object.values(bundle).find(item => item.type === 'chunk'
    && /\/src\/pages\/Creator\/index\.jsx$/.test(item.facadeModuleId?.replaceAll('\\', '/') || ''));
  if (!landing) return { modules: [], styles: [] };
  const modules = entryModules(bundle, landing.fileName);
  const styles = [...new Set(modules.flatMap(file => [...(bundle[file]?.viteMetadata?.importedCss || [])]))];
  return { modules, styles };
}
