export function staticAsset(path) {
    const value = String(path || '');
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;

    const base = String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
    return `${base}${value.replace(/^\/+/, '')}`;
}
