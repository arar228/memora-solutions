import { lazy } from 'react';

// After a deploy the user may still be running the previous SPA build whose
// chunk hashes no longer exist on the server. The first dynamic import then
// fails with a "Failed to fetch dynamically imported module" / "Loading chunk
// failed" error. This wrapper retries once with a short delay; if the second
// attempt also fails we force a full reload so the browser pulls the fresh
// index.html and the new chunk hashes.

const isChunkLoadError = (err) => {
    if (!err) return false;
    const msg = err.message || '';
    return (
        err.name === 'ChunkLoadError' ||
        /Loading chunk \d+ failed/.test(msg) ||
        /Failed to fetch dynamically imported module/.test(msg) ||
        /Importing a module script failed/.test(msg)
    );
};

const RELOAD_FLAG = 'memora-chunk-reload';

const storage = {
    get() {
        try { return sessionStorage.getItem(RELOAD_FLAG); } catch { return null; }
    },
    set() {
        try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* storage unavailable */ }
    },
    clear() {
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage unavailable */ }
    },
};

export default function lazyWithRetry(importFn) {
    return lazy(async () => {
        try {
            const mod = await importFn();
            // Successful load — clear any sticky flag from a previous reload.
            storage.clear();
            return mod;
        } catch (err) {
            if (!isChunkLoadError(err)) throw err;

            // First retry after a short delay (often resolves transient network blips).
            try {
                await new Promise((r) => setTimeout(r, 1200));
                const mod = await importFn();
                storage.clear();
                return mod;
            } catch (retryErr) {
                if (!isChunkLoadError(retryErr)) throw retryErr;

                // Avoid an infinite reload loop if the new build is also broken.
                if (storage.get()) throw retryErr;
                storage.set();
                window.location.reload();
                // The promise never resolves; reload will replace the page.
                return new Promise(() => { });
            }
        }
    });
}
