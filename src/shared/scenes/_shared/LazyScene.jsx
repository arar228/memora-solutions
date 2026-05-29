import { useEffect, useRef, useState } from 'react';

/**
 * Mounts a heavy (WebGL) child only while it's near the viewport, and
 * unmounts it once it scrolls far away. This caps the number of *live*
 * WebGL contexts on a page: with six Three.js scenes stacked on the
 * Creator page, mounting all of them at once spins up six GPU contexts +
 * six bloom composers simultaneously — enough to exhaust VRAM / hit the
 * mobile WebGL-context limit and freeze the device (scroll included).
 *
 * The wrapper keeps its own box size at all times (the parent
 * `.creator-scene` has a fixed height), so unmounting the child never
 * shifts layout or jumps the scroll position.
 *
 * `rootMargin` is generous so the scene is created slightly before it
 * enters and disposed slightly after it leaves — which also gives natural
 * hysteresis against mount/unmount thrash at the exact boundary.
 */
export default function LazyScene({ children, rootMargin = '400px 0px' }) {
    const ref = useRef(null);
    const [active, setActive] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // No IntersectionObserver (very old browser) → just render eagerly.
        if (typeof IntersectionObserver === 'undefined') {
            setActive(true);
            return;
        }

        const io = new IntersectionObserver(
            ([entry]) => setActive(entry.isIntersecting),
            { rootMargin }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [rootMargin]);

    return (
        <div ref={ref} style={{ width: '100%', height: '100%' }}>
            {active ? children : null}
        </div>
    );
}
