const PRODUCTION_STATIC_ROOT = 'https://arar228.github.io/memora-solutions';

export function staticAsset(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return import.meta.env.DEV
        ? normalizedPath
        : `${PRODUCTION_STATIC_ROOT}${normalizedPath}`;
}
