import React, { useEffect, useState } from 'react';

interface BurstItem {
  id: string;
  tx: number; // viewport-width offset from centre
  ty: number; // viewport-height offset from centre
  rot: number;
  size: number;
  delay: number;
  dur: number;
}

/**
 * One-shot "tomatoes scatter across the screen" alert, shown when an interval
 * finishes (an alternative to the flashing alert). `trigger` should change on
 * every completion to fire a fresh burst.
 */
export default function TomatoBurst({ trigger }: { trigger: number }) {
  const [items, setItems] = useState<BurstItem[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const burst: BurstItem[] = Array.from({ length: 26 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 45; // % of viewport from the centre
      return {
        id: `${trigger}-${i}`,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 8, // bias slightly upward
        rot: (Math.random() * 2 - 1) * 540,
        size: 16 + Math.random() * 26,
        delay: Math.random() * 0.12,
        dur: 1.8 + Math.random() * 1.2,
      };
    });
    setItems(burst);
    const id = setTimeout(() => setItems([]), 3400);
    return () => clearTimeout(id);
  }, [trigger]);

  if (!items.length) return null;
  return (
    <div className="tomato-burst" aria-hidden="true">
      {items.map((t) => (
        <img
          key={t.id}
          src="./assets/icon.png"
          alt=""
          className="burst-tomato"
          style={{
            '--tx': `${t.tx}vw`,
            '--ty': `${t.ty}vh`,
            '--rot': `${t.rot}deg`,
            '--sz': `${t.size}px`,
            '--delay': `${t.delay}s`,
            '--dur': `${t.dur}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
