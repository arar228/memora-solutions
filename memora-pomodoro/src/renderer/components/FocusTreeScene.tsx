import React from 'react';
import type { SceneProps } from './Scene';

const BRANCHES = [
  { d: 'M240 168 C239 139 240 109 239 72', start: 0, end: 0.4 },
  { d: 'M239 126 C218 113 201 99 187 79', start: 0.24, end: 0.52 },
  { d: 'M239 116 C263 103 280 89 291 68', start: 0.3, end: 0.58 },
  { d: 'M224 106 C213 91 207 76 207 61', start: 0.44, end: 0.68 },
  { d: 'M255 104 C268 91 274 79 278 57', start: 0.48, end: 0.72 },
  { d: 'M239 88 C228 76 224 64 226 48', start: 0.58, end: 0.8 },
  { d: 'M240 86 C250 73 255 61 253 43', start: 0.62, end: 0.84 },
] as const;

const LEAVES = [
  { x: 186, y: 77, r: 16, start: 0.46, end: 0.68 },
  { x: 292, y: 68, r: 16, start: 0.52, end: 0.72 },
  { x: 205, y: 61, r: 18, start: 0.62, end: 0.8 },
  { x: 278, y: 56, r: 20, start: 0.66, end: 0.84 },
  { x: 225, y: 47, r: 19, start: 0.74, end: 0.9 },
  { x: 253, y: 42, r: 18, start: 0.78, end: 0.94 },
  { x: 211, y: 82, r: 18, start: 0.72, end: 0.88 },
  { x: 276, y: 86, r: 17, start: 0.76, end: 0.91 },
  { x: 233, y: 72, r: 22, start: 0.82, end: 0.96 },
  { x: 260, y: 70, r: 21, start: 0.85, end: 0.98 },
] as const;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const smoothstep = (start: number, end: number, value: number) => {
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
};

export default function FocusTreeScene({
  mode,
  running,
  idle,
  accent,
  speed = 100,
  progress = 0,
  status = 'idle',
  lang = 'ru',
}: SceneProps) {
  const measuredProgress = clamp01(progress);
  const growth = mode === 'break' ? 1 : measuredProgress;
  const motionSeconds = 12 / Math.max(0.5, Math.min(2, speed / 100));
  const treeMature = growth >= 0.999;
  const treeMaturity = smoothstep(0.96, 1, growth);
  const state = mode === 'break'
    ? (lang === 'ru' ? 'восстановление' : 'renewal')
    : running && !idle
      ? `${Math.round(measuredProgress * 100)}%`
      : status === 'paused' || idle
        ? (lang === 'ru' ? 'пауза' : 'paused')
        : (lang === 'ru' ? 'семя' : 'seed');
  const title = lang === 'ru' ? 'Дерево фокуса' : 'Focus tree';

  return (
    <div
      className={`scene-tree${mode === 'break' ? ' scene-tree--break' : ''}`}
      role="img"
      aria-label={`${title}. ${state}`}
      style={{
        '--scene-accent': accent,
        '--tree-speed': `${motionSeconds}s`,
        '--tree-growth': growth,
        '--tree-maturity': treeMaturity,
      } as React.CSSProperties}
    >
      <div className="scene-tree__light" aria-hidden="true" />
      <svg className="scene-tree__art" viewBox="0 0 480 185" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="tree-trunk" x1="0" y1="1" x2="0.6" y2="0">
            <stop offset="0" stopColor="var(--scene-accent)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--scene-accent)" stopOpacity="0.86" />
          </linearGradient>
          <radialGradient id="tree-leaf">
            <stop offset="0" stopColor="#fff" stopOpacity="0.42" />
            <stop offset="0.35" stopColor="var(--scene-accent)" stopOpacity="0.72" />
            <stop offset="1" stopColor="var(--scene-accent)" stopOpacity="0.08" />
          </radialGradient>
          <filter id="tree-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <path className="scene-tree__ground" d="M96 169 C178 162 304 162 386 169" />
        <ellipse className="scene-tree__root-glow" cx="240" cy="167" rx="72" ry="9" />
        <circle className="scene-tree__seed-ring" cx="240" cy="165" r="7" />
        <circle className="scene-tree__seed" cx="240" cy="165" r="2.2" />
        <g className={`scene-tree__sway${treeMature ? ' is-mature' : ''}`}>
          {BRANCHES.map(branch => {
            const branchGrowth = smoothstep(branch.start, branch.end, growth);
            return (
              <g key={branch.d}>
                <path
                  className="scene-tree__branch scene-tree__branch--glow"
                  d={branch.d}
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - branchGrowth}
                />
                <path
                  className="scene-tree__branch"
                  d={branch.d}
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - branchGrowth}
                />
              </g>
            );
          })}

          <g className="scene-tree__canopy">
            {LEAVES.map((leaf, index) => {
              const reveal = smoothstep(leaf.start, leaf.end, growth);
              return (
                <g
                  key={`${leaf.x}-${leaf.y}`}
                  className="scene-tree__leaf"
                  style={{
                    opacity: reveal,
                    transform: `translate(${leaf.x}px, ${leaf.y}px) scale(${0.08 + reveal * 0.92})`,
                    animationDelay: `${index * -0.72}s`,
                  }}
                >
                  <circle r={leaf.r + 5} fill="var(--scene-accent)" opacity="0.08" filter="url(#tree-glow)" />
                  <circle r={leaf.r} fill="url(#tree-leaf)" />
                  <circle r={Math.max(1.4, leaf.r * 0.1)} className="scene-tree__spark" />
                </g>
              );
            })}
          </g>
        </g>

        <g className={`scene-tree__motes${treeMature ? ' is-mature' : ''}`}>
          {Array.from({ length: 13 }, (_, index) => (
            <circle
              key={index}
              cx={126 + ((index * 71) % 236)}
              cy={38 + ((index * 43) % 112)}
              r={index % 3 === 0 ? 1.2 : 0.65}
              style={{ animationDelay: `${index * -0.83}s` }}
            />
          ))}
        </g>
      </svg>
      <div className="scene-tree__head">
        <strong>{title}</strong>
        <span>{state}</span>
      </div>
    </div>
  );
}
