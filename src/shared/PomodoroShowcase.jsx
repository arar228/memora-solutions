import { useState, useEffect } from 'react';
import './devCards.css';

/**
 * PomodoroShowcase — interactive demo card for the Memora Pomodoro timer,
 * displayed in the "Other Developments" section of the Creator page.
 * Shows a simulated timer UI with ring animation and contribution grid.
 */

// Mock contribution heatmap — generated once at module load, not during
// render. (Generating it in render re-randomised the grid every tick while
// the timer ran, causing flicker + needless work; doing it at module scope
// keeps it stable and is pure as far as React's render is concerned.)
const GRID_CELLS = Array.from({ length: 7 * 16 }, () => {
    const rand = Math.random();
    if (rand > 0.7) return 4;
    if (rand > 0.5) return 3;
    if (rand > 0.35) return 2;
    if (rand > 0.2) return 1;
    return 0;
});
export default function PomodoroShowcase({ t }) {
    const isRu = t('creator.s7Label') === '07 / Внутренние разработки';
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [mode, setMode] = useState('focus');

    // Simulate running for demo. The timer is driven by a single effect keyed
    // on `isRunning` so it is always cleaned up — pausing, finishing, or
    // unmounting (e.g. navigating away from the Creator page) clears the
    // interval. The previous version created an interval per "play" press
    // without ever clearing it, stacking many 20Hz setState loops that kept
    // firing after unmount and janked/froze the page on mobile.
    const handleToggle = () => setIsRunning(prev => !prev);

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRunning(false);
                    return 25 * 60;
                }
                return prev - 1;
            });
        }, 50); // Sped up for demo
        return () => clearInterval(interval);
    }, [isRunning]);

    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    const progress = 1 - timeLeft / (25 * 60);
    const circumference = 2 * Math.PI * 70;
    const offset = circumference * (1 - progress);

    const gridCells = GRID_CELLS;

    return (
        <div className="creator-dev-card" style={{ marginTop: 24 }}>
            <div className="creator-dev-card__badge" style={{ background: 'linear-gradient(135deg, #E05A33, #c23b18)' }}>
                MEMORA POMODORO
            </div>
            <h3 className="creator-dev-card__title">
                {isRu ? 'Помодоро-таймер для продуктивности' : 'Pomodoro Timer for Productivity'}
            </h3>
            <p className="creator-dev-card__text">
                {isRu
                    ? <>Кросс-платформенный десктопный таймер на <strong>Electron + React + TypeScript</strong>. Always-on-top overlay, GitHub-style heatmap статистики, профили таймеров, системный трей, горячие клавиши, импорт из YAPA.</>
                    : <>Cross-platform desktop timer built with <strong>Electron + React + TypeScript</strong>. Always-on-top overlay, GitHub-style heatmap stats, timer profiles, system tray, hotkeys, YAPA import.</>}
            </p>

            {/* Interactive Demo */}
            <div style={{
                background: '#0C0C0F',
                borderRadius: 16,
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                marginTop: 12,
            }}>
                {/* Mode tabs */}
                <div style={{
                    display: 'flex', gap: 4, background: '#16161A',
                    borderRadius: 999, padding: 3,
                }}>
                    {['focus', 'short', 'long'].map(m => (
                        <button key={m} onClick={() => setMode(m)} style={{
                            fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500,
                            color: mode === m ? '#E05A33' : '#8A8A8D',
                            background: mode === m ? 'rgba(224,90,51,0.15)' : 'transparent',
                            border: 'none', padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
                            transition: 'all 150ms ease',
                        }}>
                            {m === 'focus' ? (isRu ? 'Фокус' : 'Focus')
                                : m === 'short' ? (isRu ? 'Короткий' : 'Short')
                                    : (isRu ? 'Длинный' : 'Long')}
                        </button>
                    ))}
                </div>

                {/* Ring Timer */}
                <div style={{ position: 'relative' }}>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="70" fill="none" stroke="#1E1E24" strokeWidth="5" />
                        <circle cx="80" cy="80" r="70" fill="none" stroke="#E05A33" strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 0.1s linear', filter: 'drop-shadow(0 0 8px rgba(224,90,51,0.3))' }}
                            transform="rotate(-90 80 80)"
                        />
                    </svg>
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -55%)',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700,
                        color: '#E8E6E1', letterSpacing: 2,
                    }}>
                        {mins}:{secs}
                    </div>
                    <div style={{
                        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                        fontSize: 9, fontWeight: 500, textTransform: 'uppercase',
                        letterSpacing: 1, color: '#8A8A8D',
                    }}>
                        {isRu ? 'ФОКУС' : 'FOCUS'}
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={() => setTimeLeft(25 * 60)} style={{
                        width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                        background: '#16161A', color: '#8A8A8D', fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>↺</button>
                    <button onClick={handleToggle} style={{
                        width: 42, height: 42, borderRadius: '50%', border: 'none',
                        background: '#E05A33', color: 'white', fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{isRunning ? '⏸' : '▶'}</button>
                    <button style={{
                        width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                        background: '#16161A', color: '#8A8A8D', fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>⏭</button>
                </div>

                {/* Session dots */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: i < 2 ? '#E05A33' : '#1E1E24',
                            transition: 'all 300ms ease',
                        }} />
                    ))}
                </div>

                {/* Mini contribution grid */}
                <div style={{
                    display: 'grid', gridTemplateRows: 'repeat(7, 8px)',
                    gridAutoFlow: 'column', gap: 2,
                    opacity: 0.8,
                }}>
                    {gridCells.map((level, i) => (
                        <div key={i} style={{
                            width: 8, height: 8, borderRadius: 2,
                            background: level === 0 ? '#1E1E24'
                                : `rgba(224, 90, 51, ${level * 0.25})`,
                        }} />
                    ))}
                </div>

                {/* Stats line */}
                <div style={{ fontSize: 10, color: '#55555A', display: 'flex', gap: 12 }}>
                    <span>🍅 47 {isRu ? 'помидоров' : 'pomodoros'}</span>
                    <span>🔥 5 {isRu ? 'дней подряд' : 'day streak'}</span>
                </div>
            </div>

            {/* Tech stack */}
            <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12,
            }}>
                {['Electron 33', 'React 18', 'TypeScript', 'sql.js', 'Zustand'].map(tech => (
                    <span key={tech} style={{
                        fontSize: 10, color: '#8A8A8D', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 999, padding: '3px 10px',
                    }}>{tech}</span>
                ))}
            </div>
        </div>
    );
}
