import React, { useMemo } from 'react';

interface FloatingTomatoesProps {
  active: boolean;
  accentColor: string;
  count: number; // total pomodoros earned — determines how many tomatoes fly
}

const MIN_TOMATOES = 1;
const MAX_TOMATOES = 20;

interface Tomato {
  id: number;
  size: number;
  x: number;
  delay: number;
  duration: number;
  rotate: number;
  opacity: number;
}

function generateTomatoes(n: number): Tomato[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    size: 14 + Math.random() * 18,
    x: 5 + Math.random() * 90,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
    opacity: 0.15 + Math.random() * 0.35,
  }));
}

export default function FloatingTomatoes({ active, accentColor, count }: FloatingTomatoesProps) {
  // Clamp count: min 1, max 20
  const numTomatoes = Math.max(MIN_TOMATOES, Math.min(MAX_TOMATOES, count));

  const tomatoes = useMemo<Tomato[]>(() => {
    return generateTomatoes(numTomatoes);
  }, [numTomatoes]);

  return (
    <div className="floating-tomatoes" aria-hidden="true">
      {tomatoes.map(t => (
        <span
          key={t.id}
          className="floating-tomato"
          style={{
            left: `${t.x}%`,
            fontSize: `${t.size}px`,
            animationDelay: `${t.delay}s`,
            animationDuration: `${t.duration}s`,
            opacity: t.opacity,
            animationPlayState: active ? 'running' : 'paused',
            ['--rotate' as string]: `${t.rotate}deg`,
          }}
        >
          🍅
        </span>
      ))}
    </div>
  );
}
