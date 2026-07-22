import React, { useRef, useEffect } from 'react';

// «Сцена» — ambient pixel-art animation under the timer.
//
// Styles (each bundles variants for the work modes):
//   'flight' — кораблик летит вправо и уклоняется от препятствий;
//              в паузе — спокойный дрейф; при БЕЗДЕЙСТВИИ (чистое время
//              поставило таймер на паузу) анимация полностью замирает.
//   'chart'  — график активности: пока пользователь работает (таймер идёт,
//              бездействия нет) — линия растёт вверх с зелёной стрелкой;
//              стоит отойти — график ползёт вниз с красной стрелкой.
//
// Rendering: a tiny logical grid scaled up with smoothing off — chunky pixels.

interface SceneProps {
  mode: 'focus' | 'break';
  running: boolean;
  idle: boolean;   // pure-time auto-pause: the user is away from the keyboard
  accent: string;
  style?: string;  // 'flight' | 'chart'
}

const W = 192;
const H = 72;

// 8×6 pixel ship sprite (0 = empty, 1 = hull, 2 = accent, 3 = window glow).
const SHIP: number[][] = [
  [0, 0, 1, 0, 0, 0, 0, 0],
  [0, 1, 2, 1, 1, 0, 0, 0],
  [1, 2, 2, 3, 2, 1, 1, 1],
  [1, 2, 2, 3, 2, 1, 1, 1],
  [0, 1, 2, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0],
];

const GREEN = '#3FAE79';
const RED = '#D95757';

interface Obstacle { x: number; gapY: number; gapH: number; w: number }
interface Star { x: number; y: number; speed: number; tone: number }

export default function Scene({ mode, running, idle, accent, style = 'flight' }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    shipY: H / 2, shipVy: 0, t: 0,
    obstacles: [] as Obstacle[],
    stars: [] as Star[],
    nextSpawn: 60,
    // activity chart: scrolling series of 0..1 levels
    level: 0.35,
    points: [] as number[],
    pushAcc: 0,
  });
  const propsRef = useRef({ mode, running, idle, accent, style });
  propsRef.current = { mode, running, idle, accent, style };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = sim.current;
    if (s.stars.length === 0) {
      for (let i = 0; i < 42; i++) {
        s.stars.push({ x: Math.random() * W, y: Math.random() * H, speed: 0.2 + Math.random() * 0.9, tone: Math.random() });
      }
    }
    if (s.points.length === 0) {
      for (let i = 0; i < 64; i++) s.points.push(0.35);
    }

    let raf = 0;
    let last = performance.now();

    const drawFlight = (px: number, speed: number) => {
      const { mode: m, running: run, accent: acc } = propsRef.current;
      const isFocus = m === 'focus';
      s.t += speed;

      for (const st of s.stars) {
        st.x -= st.speed * speed * 1.6;
        if (st.x < 0) { st.x = W + Math.random() * 8; st.y = Math.random() * H; }
      }
      if (isFocus && run) {
        s.nextSpawn -= speed;
        if (s.nextSpawn <= 0) {
          const gapH = 22 + Math.random() * 14;
          s.obstacles.push({ x: W + 6, gapY: 8 + Math.random() * (H - gapH - 16), gapH, w: 7 });
          s.nextSpawn = 55 + Math.random() * 50;
        }
      }
      for (const o of s.obstacles) o.x -= 1.1 * speed;
      s.obstacles = s.obstacles.filter(o => o.x + o.w > -2);

      let targetY = H / 2 + Math.sin(s.t * 0.05) * (isFocus ? 6 : 12);
      const next = s.obstacles.find(o => o.x + o.w > 16);
      if (next && next.x < W * 0.75) targetY = next.gapY + next.gapH / 2;
      s.shipVy += (targetY - s.shipY) * (isFocus ? 0.045 : 0.02);
      s.shipVy *= 0.82;
      s.shipY = Math.max(6, Math.min(H - 10, s.shipY + s.shipVy));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of s.stars) {
        ctx.fillStyle = st.tone > 0.66 ? '#5a5a72' : st.tone > 0.33 ? '#3d3d52' : '#2a2a3a';
        ctx.fillRect(Math.floor(st.x) * px, Math.floor(st.y) * px, px, px);
      }
      ctx.fillStyle = '#3a3f55';
      for (const o of s.obstacles) {
        const x = Math.floor(o.x) * px, w = o.w * px;
        ctx.fillRect(x, 0, w, Math.floor(o.gapY) * px);
        ctx.fillRect(x, Math.floor(o.gapY + o.gapH) * px, w, canvas.height);
        ctx.fillStyle = '#4d5470';
        ctx.fillRect(x, (Math.floor(o.gapY) - 1) * px, w, px);
        ctx.fillRect(x, Math.floor(o.gapY + o.gapH) * px, w, px);
        ctx.fillStyle = '#3a3f55';
      }
      const sx = 18, sy = Math.floor(s.shipY);
      for (let i = 1; i <= 5; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.16 - i * 0.028})`;
        ctx.fillRect((sx - 2 - i * 2) * px, (sy + 2) * px, px * 2, px);
      }
      for (let ry = 0; ry < SHIP.length; ry++) {
        for (let rx = 0; rx < SHIP[ry].length; rx++) {
          const v = SHIP[ry][rx];
          if (!v) continue;
          ctx.fillStyle = v === 1 ? '#d8d8e4' : v === 2 ? acc : '#fff7c9';
          ctx.fillRect((sx + rx) * px, (sy - 3 + ry) * px, px, px);
        }
      }
      if (m === 'break') {
        ctx.fillStyle = 'rgba(120,200,160,0.7)';
        const zx = (sx + 12 + Math.sin(s.t * 0.03) * 3) | 0;
        const zy = (sy - 8 - ((s.t * 0.1) % 6)) | 0;
        if (zy > 2) { ctx.fillRect(zx * px, zy * px, px, px); ctx.fillRect((zx + 2) * px, (zy - 2) * px, px, px); }
      }
    };

    const drawChart = (px: number, dtn: number) => {
      const { running: run, idle: away } = propsRef.current;
      const active = run && !away;
      // Level climbs while the user works, sinks while they are away (or the
      // timer is stopped it drifts to the baseline).
      const target = active ? 1 : run ? 0.05 : 0.35;
      const rate = active ? 0.0045 : run ? 0.006 : 0.002;
      s.level += (target - s.level) * rate * dtn * (0.7 + Math.random() * 0.6);
      s.level = Math.max(0.03, Math.min(0.97, s.level));
      // Push a new point a few times a second → the line scrolls left.
      s.pushAcc += dtn;
      if (s.pushAcc >= 3) {
        s.pushAcc = 0;
        s.points.push(s.level + (Math.random() - 0.5) * 0.03);
        if (s.points.length > 64) s.points.shift();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // dotted grid
      ctx.fillStyle = '#23232f';
      for (let gy = 12; gy < H; gy += 16) {
        for (let gx = 2; gx < W; gx += 8) ctx.fillRect(gx * px, gy * px, px, px);
      }
      // trend of the visible tail decides the color and the arrow
      const tail = s.points.slice(-8);
      const rising = tail[tail.length - 1] >= tail[0];
      const col = rising ? GREEN : RED;
      // line: one pixel column per point, 3px thick, with a soft fill below
      const step = W / 64;
      let prevY = 0;
      s.points.forEach((v, i) => {
        const x = Math.floor(i * step);
        const y = Math.floor(6 + (1 - v) * (H - 16));
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x * px, (y + 2) * px, Math.ceil(step) * px, (H - y - 2) * px);
        ctx.fillStyle = i > 48 ? col : '#7d7d92';
        const from = i ? Math.min(prevY, y) : y;
        const to = i ? Math.max(prevY, y) : y;
        ctx.fillRect(x * px, from * px, Math.ceil(step) * px, Math.max(px, (to - from + 1) * px));
        prevY = y;
      });
      // arrow head at the line's end: ▲ green when growing, ▼ red when not
      const headY = Math.floor(6 + (1 - s.points[s.points.length - 1]) * (H - 16));
      const ax = W - 14;
      const ay = Math.max(8, Math.min(H - 10, headY));
      ctx.fillStyle = col;
      for (let r = 0; r < 4; r++) {
        const w2 = 7 - r * 2;
        const yy = rising ? ay - r : ay + r;
        ctx.fillRect((ax - Math.floor(w2 / 2)) * px, yy * px, w2 * px, px);
      }
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (now - last < 33) return;
      const dtn = Math.min(3, (now - last) / 33);
      last = now;
      if (document.hidden) return;

      const { mode: m, running: run, idle: away, style: st } = propsRef.current;
      const px = canvas.width / W;
      ctx.imageSmoothingEnabled = false;

      if (st === 'chart') {
        drawChart(px, dtn);
        return;
      }
      // flight: freeze the WHOLE scene while the user is away (чистое время
      // paused the timer) — the world stops with them.
      if (away) return;
      const speed = (run ? (m === 'focus' ? 1.6 : 0.7) : 0.25) * dtn;
      drawFlight(px, speed);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [style]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(2, Math.floor((rect.width * window.devicePixelRatio) / W));
      canvas.width = W * scale;
      canvas.height = H * scale;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />;
}
