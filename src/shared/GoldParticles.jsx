import { useEffect, useRef } from 'react';
import './GoldParticles.css';

export default function GoldParticles() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Respect the user's reduced-motion preference — skip the animation
        // entirely (no canvas, no rAF loop) for those who opt out.
        const reduceMotion = typeof window !== 'undefined'
            && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        const ctx = canvas.getContext('2d');
        let animId = null;
        const particles = [];

        // Size from the actual viewport. The old version read canvas.offsetWidth
        // inside the effect before layout had settled, which returned 0 → a 0×0
        // canvas with every particle seeded into nothing (invisible particles).
        const resize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const changed = canvas.width !== w || canvas.height !== h;
            canvas.width = w;
            canvas.height = h;
            // (Re)seed only when we first get real dimensions or the size changed.
            if (changed && particles.length === 0) {
                for (let i = 0; i < 50; i++) {
                    particles.push({
                        x: Math.random() * w,
                        y: Math.random() * h,
                        r: Math.random() * 2.5 + 0.5,
                        dx: (Math.random() - 0.5) * 0.3,
                        dy: (Math.random() - 0.5) * 0.3,
                        opacity: Math.random() * 0.4 + 0.1,
                    });
                }
            }
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(6, 182, 212, ${p.opacity})`;
                ctx.fill();
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            animId = requestAnimationFrame(draw);
        };

        const start = () => { if (animId === null) animId = requestAnimationFrame(draw); };
        const stop = () => { if (animId !== null) { cancelAnimationFrame(animId); animId = null; } };

        // Pause the loop while the tab is hidden — no point burning CPU/GPU
        // painting a full-screen canvas no one can see (matters on mobile).
        const onVisibility = () => { document.hidden ? stop() : start(); };
        document.addEventListener('visibilitychange', onVisibility);

        if (!document.hidden) start();

        return () => {
            stop();
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);
    return <canvas ref={canvasRef} className="global-particles" />;
}
