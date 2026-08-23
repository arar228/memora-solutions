export function staticAsset(path) {
    const value = String(path || '');
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;

    const runtimeBase = typeof window !== 'undefined' ? window.__memoraAssetBase : '';
    const configuredBase = String(runtimeBase || import.meta.env.BASE_URL || '/');
    const base = new URL(configuredBase.replace(/\/?$/, '/'), document.baseURI).href;
    return new URL(value.replace(/^\/+/, ''), base).href;
}
