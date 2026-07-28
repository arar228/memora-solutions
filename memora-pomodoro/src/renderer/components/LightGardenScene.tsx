import React from 'react';
import type { SceneProps } from './Scene';

const STEMS = [
  { path: 'M82 166 C78 137 90 116 118 88', tipX: 118, tipY: 88, gate: 0.2 },
  { path: 'M143 166 C151 126 144 101 163 66', tipX: 163, tipY: 66, gate: 0.36 },
  { path: 'M212 166 C198 128 207 91 238 54', tipX: 238, tipY: 54, gate: 0.52 },
  { path: 'M278 166 C295 132 288 102 312 77', tipX: 312, tipY: 77, gate: 0.68 },
  { path: 'M344 166 C337 139 350 119 376 96', tipX: 376, tipY: 96, gate: 0.82 },
  { path: 'M404 166 C414 146 417 127 409 111', tipX: 409, tipY: 111, gate: 0.92 },
] as const;

export default function LightGardenScene({
  mode,
  running,
  idle,
  accent,
  speed = 100,
  progress = 0,
  status = 'idle',
  lang = 'ru',
}: SceneProps) {
  const measuredProgress = Math.max(0, Math.min(1, progress));
  const growth = mode === 'break' ? 1 : 0.18 + measuredProgress * 0.82;
  const speedSeconds = 10 / Math.max(0.5, Math.min(2, speed / 100));
  const copy = lang === 'ru'
    ? {
        title: 'Световой сад',
        hint: mode === 'break'
          ? 'Сад сохраняет энергию фокуса'
          : running && !idle
            ? 'Каждая минута раскрывает новый свет'
            : status === 'paused' || idle
              ? 'Рост приостановлен'
              : 'Сад готов расти вместе с фокусом',
      }
    : {
        title: 'Light garden',
        hint: mode === 'break'
          ? 'The garden holds your focus energy'
          : running && !idle
            ? 'Every minute reveals a new light'
            : status === 'paused' || idle
              ? 'Growth is suspended'
              : 'The garden is ready to grow with your focus',
      };

  return (
    <div
      className={`scene-garden${mode === 'break' ? ' scene-garden--break' : ''}`}
      role="img"
      aria-label={`${copy.title}. ${copy.hint}`}
      style={{
        '--scene-accent': accent,
        '--garden-speed': `${speedSeconds}s`,
      } as React.CSSProperties}
    >
      <div className="scene-garden__aurora scene-garden__aurora--one" aria-hidden="true" />
      <div className="scene-garden__aurora scene-garden__aurora--two" aria-hidden="true" />
      <svg className="scene-garden__art" viewBox="0 0 480 185" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="garden-ground" x1="0" x2="1">
            <stop offset="0" stopColor="var(--scene-accent)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--scene-accent)" stopOpacity="0.52" />
            <stop offset="1" stopColor="var(--scene-accent)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="garden-bloom">
            <stop offset="0" stopColor="#fff" stopOpacity="0.92" />
            <stop offset="0.24" stopColor="var(--scene-accent)" stopOpacity="0.72" />
            <stop offset="1" stopColor="var(--scene-accent)" stopOpacity="0" />
          </radialGradient>
          <filter id="garden-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.4" />
          </filter>
        </defs>

        <path className="scene-garden__ground" d="M36 166 C126 158 354 174 444 164" stroke="url(#garden-ground)" />
        <path className="scene-garden__ground scene-garden__ground--echo" d="M72 172 C164 165 320 177 409 169" stroke="url(#garden-ground)" />
        <g className="scene-garden__seeds">
          {[82, 143, 212, 278, 344, 404].map((x, index) => (
            <g key={x}>
              <circle cx={x} cy={166} r={7 + (index % 2) * 2} className="scene-garden__seed-glow" />
              <circle cx={x} cy={166} r={1.6} />
            </g>
          ))}
        </g>
        <g className="scene-garden__motes">
          {Array.from({ length: 18 }, (_, index) => (
            <circle
              key={index}
              cx={34 + ((index * 83) % 410)}
              cy={44 + ((index * 47) % 105)}
              r={index % 4 === 0 ? 1.25 : 0.72}
              style={{ animationDelay: `${-(index % 7) * 0.9}s` }}
            />
          ))}
        </g>

        {STEMS.map((stem, index) => {
          const localGrowth = Math.max(0, Math.min(1, (growth - stem.gate * 0.38) / (1 - stem.gate * 0.38)));
          const bloom = Math.max(0, Math.min(1, (growth - stem.gate) / 0.16));
          return (
            <g key={stem.path}>
              <path className="scene-garden__stem-guide" d={stem.path} />
              <path
                className="scene-garden__stem scene-garden__stem--glow"
                d={stem.path}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - localGrowth}
              />
              <path
                className="scene-garden__stem"
                d={stem.path}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - localGrowth}
              />
              <g
                className="scene-garden__flower"
                style={{
                  opacity: bloom,
                  transform: `translate(${stem.tipX}px, ${stem.tipY}px) scale(${0.5 + bloom * 0.5})`,
                }}
              >
                <ellipse rx="13" ry="4.5" transform={`rotate(${index % 2 ? 26 : -24})`} />
                <ellipse rx="13" ry="4.5" transform={`rotate(${index % 2 ? 116 : 66})`} />
                <circle r="15" fill="url(#garden-bloom)" filter="url(#garden-soft-glow)" />
                <circle r="2.1" className="scene-garden__seed" />
              </g>
            </g>
          );
        })}

        <g
          className="scene-garden__crown"
          style={{ opacity: Math.max(0, (growth - 0.76) / 0.24) }}
        >
          <circle cx="238" cy="54" r="31" fill="none" />
          <circle cx="238" cy="54" r="21" fill="none" />
          <circle cx="238" cy="54" r="3" />
        </g>
      </svg>

      <div className="scene-garden__head">
        <strong>{copy.title}</strong>
        <span>{mode === 'break' ? (lang === 'ru' ? 'покой' : 'rest') : `${Math.round(measuredProgress * 100)}%`}</span>
      </div>
      <div className="scene-garden__caption">{copy.hint}</div>
    </div>
  );
}
