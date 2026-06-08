import React, { useMemo } from 'react';

interface FloatingTomatoesProps {
  active: boolean;
  accentColor: string;
  count: number; // total pomodoros earned — determines how many tomatoes fly
}

const MIN_TOMATOES = 1;
const MAX_TOMATOES = 12;

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
  // Slow, faint, ambient — a gentle drift up the background, not a fast swarm.
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    size: 12 + Math.random() * 16,
    x: 4 + Math.random() * 92,
    delay: Math.random() * 22,
    duration: 30 + Math.random() * 25,
    rotate: Math.random() * 160 - 80,
    opacity: 0.05 + Math.random() * 0.1,
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
            animationPlayState: active ? 'running' : 'paused',
            ['--rotate' as string]: `${t.rotate}deg`,
            ['--tomato-opacity' as string]: `${t.opacity}`,
          }}
        >
          🍅
        </span>
      ))}
    </div>
  );
}
