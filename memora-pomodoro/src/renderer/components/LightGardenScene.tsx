import React from 'react';
import type { SceneProps } from '../../shared/types';

type Point = readonly [number, number];

const STEMS = [
  { points: [[82, 166], [78, 137], [90, 116], [118, 88]], start: 0, stemEnd: 0.36, bloomEnd: 0.5 },
  { points: [[143, 166], [151, 126], [144, 101], [163, 66]], start: 0.08, stemEnd: 0.44, bloomEnd: 0.58 },
  { points: [[212, 166], [198, 128], [207, 91], [238, 54]], start: 0.16, stemEnd: 0.52, bloomEnd: 0.66 },
  { points: [[278, 166], [295, 132], [288, 102], [312, 77]], start: 0.25, stemEnd: 0.61, bloomEnd: 0.75 },
  { points: [[344, 166], [337, 139], [350, 119], [376, 96]], start: 0.34, stemEnd: 0.7, bloomEnd: 0.84 },
  { points: [[404, 166], [414, 146], [417, 127], [409, 111]], start: 0.43, stemEnd: 0.79, bloomEnd: 0.93 },
] as const satisfies ReadonlyArray<{
  points: readonly [Point, Point, Point, Point];
  start: number;
  stemEnd: number;
  bloomEnd: number;
}>;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const smoothstep = (start: number, end: number, value: number) => {
  const normalized = clamp01((value - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
};

const cubicPoint = (points: readonly [Point, Point, Point, Point], progress: number) => {
  const [start, controlOne, controlTwo, end] = points;
  const inverse = 1 - progress;
  const x = inverse ** 3 * start[0]
    + 3 * inverse ** 2 * progress * controlOne[0]
    + 3 * inverse * progress ** 2 * controlTwo[0]
    + progress ** 3 * end[0];
  const y = inverse ** 3 * start[1]
    + 3 * inverse ** 2 * progress * controlOne[1]
    + 3 * inverse * progress ** 2 * controlTwo[1]
    + progress ** 3 * end[1];
  return { x, y };
};

const pathFor = (points: readonly [Point, Point, Point, Point]) => {
  const [start, controlOne, controlTwo, end] = points;
  return `M${start[0]} ${start[1]} C${controlOne[0]} ${controlOne[1]} ${controlTwo[0]} ${controlTwo[1]} ${end[0]} ${end[1]}`;
};

const stagesFor = (stem: (typeof STEMS)[number], growth: number) => {
  const stemGrowth = smoothstep(stem.start, stem.stemEnd, growth);
  const stemDuration = stem.stemEnd - stem.start;
  const budStart = stem.start + stemDuration * 0.48;
  const bloomStart = stem.start + stemDuration * 0.56;
  const bud = smoothstep(budStart, bloomStart + stemDuration * 0.18, growth);
  const bloom = smoothstep(bloomStart, stem.bloomEnd, growth);
  const resonance = smoothstep(stem.bloomEnd - 0.012, stem.bloomEnd, growth);
  return { stemGrowth, bud, bloom, resonance };
};

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
  const measuredProgress = clamp01(progress);
  const growth = mode === 'break' ? 1 : measuredProgress;
  const speedSeconds = 10 / Math.max(0.5, Math.min(2, speed / 100));
  const haloScale = mode === 'break' ? 1.18 : 1.1 + measuredProgress * 0.08;
  const stages = STEMS.map(stem => stagesFor(stem, growth));
  const gardenMature = stages.some(stage => stage.resonance >= 0.999);
  const centerResonance = stages[2].resonance;
  const copy = lang === 'ru'
    ? {
        title: 'Световой сад',
        state: mode === 'break' ? 'покой' : running && !idle ? `${Math.round(measuredProgress * 100)}%` : status === 'paused' || idle ? 'пауза' : 'готов',
      }
    : {
        title: 'Light garden',
        state: mode === 'break' ? 'rest' : running && !idle ? `${Math.round(measuredProgress * 100)}%` : status === 'paused' || idle ? 'paused' : 'ready',
      };

  return (
    <div
      className={`scene-garden${mode === 'break' ? ' scene-garden--break' : ''}`}
      role="img"
      aria-label={`${copy.title}. ${copy.state}`}
      style={{
        '--scene-accent': accent,
        '--garden-speed': `${speedSeconds}s`,
        '--garden-halo-scale': haloScale,
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
        <g className={`scene-garden__motes${gardenMature ? ' is-mature' : ''}`}>
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
          const { stemGrowth, bud, bloom, resonance } = stages[index];
          const tip = cubicPoint(stem.points, stemGrowth);
          const path = pathFor(stem.points);
          const flowerScale = 0.16 + bloom * 0.84;
          const mature = resonance >= 0.999;
          return (
            <g key={path}>
              <path
                className="scene-garden__stem scene-garden__stem--glow"
                d={path}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - stemGrowth}
              />
              <path
                className="scene-garden__stem"
                d={path}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - stemGrowth}
              />
              <g
                className="scene-garden__bud"
                style={{
                  opacity: bud * (1 - bloom * 0.72),
                  transform: `translate(${tip.x}px, ${tip.y}px) scale(${0.4 + bud * 0.6})`,
                }}
              >
                <ellipse rx="3.1" ry="5.2" />
              </g>
              <g
                className="scene-garden__flower"
                style={{
                  opacity: bloom,
                  transform: `translate(${tip.x}px, ${tip.y}px) scale(${flowerScale})`,
                }}
              >
                <g
                  className={`scene-garden__flower-motion${mature ? ' is-mature' : ''}`}
                  style={{ animationDelay: `${index * -1.35}s` }}
                >
                  <circle r="20" className="scene-garden__halo" />
                  <circle r="14.5" className="scene-garden__halo scene-garden__halo--inner" />
                  <ellipse rx="13" ry="4.5" transform={`rotate(${index % 2 ? 26 : -24})`} />
                  <ellipse rx="13" ry="4.5" transform={`rotate(${index % 2 ? 116 : 66})`} />
                  <circle r="15" fill="url(#garden-bloom)" filter="url(#garden-soft-glow)" />
                  <circle r="2.1" className="scene-garden__seed" />
                </g>
              </g>
            </g>
          );
        })}

        <g
          className={`scene-garden__crown${centerResonance >= 0.999 ? ' is-mature' : ''}`}
          style={{ opacity: centerResonance }}
        >
          <circle cx="238" cy="54" r="31" fill="none" />
          <circle cx="238" cy="54" r="21" fill="none" />
          <circle cx="238" cy="54" r="3" />
        </g>
      </svg>

      <div className="scene-garden__head">
        <strong>{copy.title}</strong>
        <span>{copy.state}</span>
      </div>
    </div>
  );
}
