import { useEffect, useRef, useState } from 'react';
import { scrollProgress } from './sculptureMath';

// Scroll is native. Frames update graphics directly, without a React render per pixel.
export default function AttentionSculpture({ trackRef, reduced, onArrive, onUnavailable, copy }) {
  const hostRef = useRef(null);
  const progressRef = useRef(0);
  const callbacks = useRef({ onArrive, onUnavailable });
  const [status, setStatus] = useState('loading');
  useEffect(() => { callbacks.current = { onArrive, onUnavailable }; }, [onArrive, onUnavailable]);
  useEffect(() => {
    let cancelled = false;
    let scrollFrame = 0;
    let engine;
    let lastArrived = null;
    const track = trackRef.current;
    const stage = hostRef.current.parentElement.parentElement;
    setStatus('loading');
    const update = () => {
      scrollFrame = 0;
      if (cancelled) return;
      const rect = track.getBoundingClientRect();
      const headerValue = Number.parseFloat(getComputedStyle(track).getPropertyValue('--header-height'));
      const header = Number.isFinite(headerValue) ? headerValue : 60;
      const progress = scrollProgress(rect.top, rect.height, window.innerHeight, header);
      progressRef.current = progress;
      track.style.setProperty('--intro-opacity', Math.max(0, 1 - progress / .1));
      track.style.setProperty('--travel', progress);
      engine?.setProgress(progress);
      const arrived = progress >= .94;
      if (lastArrived !== arrived) { lastArrived = arrived; callbacks.current.onArrive(arrived); }
    };
    const onScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Browser viewport chrome can change sticky height without a window resize.
    const resize = new ResizeObserver(onScroll);
    resize.observe(track); resize.observe(stage);
    update();
    import('./sculptureRenderer').then(async ({ createSculpture }) => {
      if (cancelled) return;
      const created = await createSculpture(hostRef.current, {
        reduced,
        onError: () => { if (!cancelled) { setStatus('error'); callbacks.current.onUnavailable(true); } },
      });
      // Leaving the route during the separate light-table import must release
      // the completed graphics instance without updating an unmounted page.
      if (cancelled) { created.destroy(); return; }
      engine = created;
      engine.setProgress(progressRef.current);
      setStatus('ready');
      callbacks.current.onUnavailable(false);
    }).catch(() => { if (!cancelled) { setStatus('error'); callbacks.current.onUnavailable(true); } });
    return () => {
      cancelled = true;
      cancelAnimationFrame(scrollFrame);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll);
      resize.disconnect(); engine?.destroy();
    };
  }, [reduced, trackRef]);
  return <div className="tunnel-visual" data-status={status}>
    <div className="tunnel-canvas" ref={hostRef} aria-hidden="true" />
    <p className="tunnel-description">{copy.description}</p>
    {status !== 'ready' && <div className="tunnel-loading" role="status"><p>{status === 'error' ? copy.fallback : copy.loading}</p></div>}
  </div>;
}
