export function staticAsset(path) {
    return path.startsWith('/') ? path : `/${path}`;
}
