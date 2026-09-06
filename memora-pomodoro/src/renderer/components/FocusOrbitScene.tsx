import React, { useEffect, useRef } from 'react';
import type { SceneProps } from '../../shared/types';

interface OrbitParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  depth: number;
}

interface Pulse {
  x: number;
  y: number;
  born: number;
}

const rgba = (color: string, alpha: number) => {
  const hex = color.replace('#', '');
  if (/^[\da-f]{6}$/i.test(hex)) {
    const value = Number.parseInt(hex, 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }
  return color;
};

export default function FocusOrbitScene({
  mode,
  running,
  idle,
  accent,
  speed = 100,
  progress = 0,
  status = 'idle',
  lang = 'ru',
}: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const pulses = useRef<Pulse[]>([]);
  const propsRef = useRef({ mode, running, idle, accent, speed, progress, status });
  propsRef.current = { mode, running, idle, accent, speed, progress, status };

  const particles = useRef<OrbitParticle[]>(
    Array.from({ length: 58 }, (_, index) => ({
      angle: (index / 58) * Math.PI * 2 + Math.sin(index * 9.17) * 0.22,
      radius: 26 + ((index * 37) % 112),
      speed: 0.18 + ((index * 13) % 17) / 35,
      size: 0.7 + ((index * 19) % 10) / 8,
      depth: 0.45 + ((index * 23) % 41) / 55,
    })),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let last = performance.now();
    let time = 0;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (document.hidden) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      const current = propsRef.current;
      const speedRate = Math.max(0.5, Math.min(2, current.speed / 100));
      const motion = current.running && !current.idle ? 1 : current.mode === 'break' ? 0.32 : 0.18;
      time += dt * speedRate * motion;

      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / Math.max(1, rect.width);
      const width = rect.width;
      const height = rect.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const mouse = pointer.current;
      const baseX = width * 0.52;
      const baseY = height * 0.54;
      const centerX = baseX + (mouse.active ? (mouse.x - baseX) * 0.1 : Math.sin(time * 0.5) * 3);
      const centerY = baseY + (mouse.active ? (mouse.y - baseY) * 0.08 : Math.cos(time * 0.42) * 2);
      const compression = 0.34;
      const positions: Array<{ x: number; y: number; size: number; depth: number }> = [];

      for (const particle of particles.current) {
        const angle = particle.angle + time * particle.speed;
        const progressBoost = 0.88 + Math.max(0, Math.min(1, current.progress)) * 0.14;
        let x = centerX + Math.cos(angle) * particle.radius * progressBoost;
        let y = centerY + Math.sin(angle) * particle.radius * compression;

        if (mouse.active) {
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const distance = Math.hypot(dx, dy);
          if (distance < 105) {
            const pull = (1 - distance / 105) * 0.13;
            x += dx * pull;
            y += dy * pull;
          }
        }
        positions.push({ x, y, size: particle.size, depth: particle.depth });
      }

      ctx.lineWidth = 0.65;
      for (let index = 0; index < positions.length; index++) {
        const point = positions[index];
        const next = positions[(index + 7) % positions.length];
        const distance = Math.hypot(point.x - next.x, point.y - next.y);
        if (distance > 76) continue;
        ctx.strokeStyle = rgba(current.accent, (1 - distance / 76) * 0.12);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }

      for (const point of positions) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fillStyle = rgba(current.accent, 0.2 + point.depth * 0.55);
        ctx.fill();
      }

      pulses.current = pulses.current.filter(pulse => now - pulse.born < 900);
      for (const pulse of pulses.current) {
        const age = (now - pulse.born) / 900;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 8 + age * 62, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(current.accent, (1 - age) * 0.38);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 35 + ring * 18, 12 + ring * 6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(current.accent, 0.12 - ring * 0.025);
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      const coreRadius = 9 + Math.max(0, Math.min(1, current.progress)) * 6;
      const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 3.2);
      glow.addColorStop(0, rgba(current.accent, 0.8));
      glow.addColorStop(0.2, rgba(current.accent, 0.32));
      glow.addColorStop(1, rgba(current.accent, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(current.accent, 0.92);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    };

    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const copy = lang === 'ru'
    ? {
        title: 'Орбита фокуса',
        state: idle ? 'нет активности' : running ? 'синхронизация' : status === 'paused' ? 'пауза' : 'готова',
      }
    : {
        title: 'Focus orbit',
        state: idle ? 'idle' : running ? 'synchronized' : status === 'paused' ? 'paused' : 'ready',
      };

  const emitPulse = (x: number, y: number) => {
    pulses.current.push({ x, y, born: performance.now() });
  };

  return (
    <div
      className="scene-orbit"
      role="img"
      aria-label={`${copy.title}: ${copy.state}`}
      tabIndex={0}
      style={{ '--scene-accent': accent } as React.CSSProperties}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointer.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true };
      }}
      onPointerLeave={() => { pointer.current.active = false; }}
      onPointerDown={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        emitPulse(event.clientX - rect.left, event.clientY - rect.top);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          emitPulse(rect.width / 2, rect.height / 2);
        }
      }}
    >
      <canvas ref={canvasRef} className="scene-orbit__canvas" aria-hidden="true" />
      <div className="scene-orbit__head">
        <strong>{copy.title}</strong>
        <span>{copy.state}</span>
      </div>
      <div className="scene-orbit__progress">
        <i style={{ width: `${Math.max(4, Math.min(100, progress * 100))}%` }} />
      </div>
    </div>
  );
}
