import React, { useState, useEffect } from 'react';
import type { TimerTickPayload, OverlayMode, AppSettings } from '../../shared/types';
import { BREAK_COLOR } from '../../shared/constants';

const ACCENT = '#E05A33';

function fmt(n: number): string { return String(n).padStart(2, '0'); }

const MODE_LABELS = {
  ru: { focus: 'ФОКУС', short_break: 'ПЕРЕРЫВ', long_break: 'ДЛИННЫЙ' },
  en: { focus: 'FOCUS', short_break: 'BREAK', long_break: 'LONG' },
};

export default function CompactOverlay() {
  const [tick, setTick] = useState<TimerTickPayload>({
    timeLeft: 25 * 60, totalTime: 25 * 60, mode: 'focus', status: 'idle', completedPomos: 0,
  });
  const [mode, setMode] = useState<OverlayMode>('compact');
  const [showBg, setShowBg] = useState(true);
  const [showSeconds, setShowSeconds] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [lang, setLang] = useState<'ru' | 'en'>('ru');

  useEffect(() => {
    const unsub = window.api.timer.onTick((data) => setTick(data));
    return unsub;
  }, []);

  // Listen for settings changes from main
  useEffect(() => {
    const unsub = window.api.settings.onUpdate((s: Record<string, unknown>) => {
      if (s.overlay_mode) setMode(s.overlay_mode as OverlayMode);
      if (s.overlay_show_bg !== undefined) setShowBg(s.overlay_show_bg as boolean);
      if (s.overlay_show_seconds !== undefined) setShowSeconds(s.overlay_show_seconds as boolean);
      if (s.overlay_show_controls !== undefined) setShowControls(s.overlay_show_controls as boolean);
      if (s.lang) setLang(s.lang as 'ru' | 'en');
    });
    // Load initial settings
    window.api.settings.getAll().then((s: AppSettings) => {
      setMode(s.overlay_mode || 'compact');
      setShowBg(s.overlay_show_bg !== false);
      setShowSeconds(s.overlay_show_seconds !== false);
      setShowControls(s.overlay_show_controls !== false);
      setLang(s.lang || 'ru');
    });
    return unsub;
  }, []);

  const mins = Math.floor(tick.timeLeft / 60);
  const secs = tick.timeLeft % 60;
  const timeStr = showSeconds ? `${fmt(mins)}:${fmt(secs)}` : `${fmt(mins)}`;
  const progress = tick.totalTime > 0 ? 1 - tick.timeLeft / tick.totalTime : 0;
  const pct = Math.round(progress * 100);
  const isBreak = tick.mode !== 'focus';
  const color = isBreak ? BREAK_COLOR : ACCENT;
  const modeLabel = MODE_LABELS[lang][tick.mode];

  const handlePlayPause = () => {
    if (tick.status === 'running') window.api.timer.pause();
    else if (tick.status === 'paused') window.api.timer.resume();
    else window.api.timer.start();
  };

  const PlayIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  );
  const PauseIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
  );
  const SkipIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="17" y="4" width="3" height="16" rx="1"/></svg>
  );
  const ResetIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
  );

  // === PILL (micro) ~120×32 ===
  if (mode === 'pill') {
    const R = 9, C = 2 * Math.PI * R;
    return (
      <div className={`ov ov-pill ${showBg ? '' : 'no-bg'}`} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="ov-pill-icon" style={{ background: color }}>M</div>
        <div className="ov-mini-ring">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r={R} fill="none" stroke="var(--sf2, #1E1E24)" strokeWidth="2.5"/>
            <circle cx="12" cy="12" r={R} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 1s linear' }} transform="rotate(-90 12 12)"/>
          </svg>
        </div>
        <span className="ov-pill-time">{timeStr}</span>
        {showControls && (
          <button className="ov-pill-btn" onClick={handlePlayPause}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {tick.status === 'running' ? <PauseIcon/> : <PlayIcon/>}
          </button>
        )}
      </div>
    );
  }

  // === BAR (wide) ~340×30 ===
  if (mode === 'bar') {
    const dots = Array.from({ length: 4 }, (_, i) => i < (tick.completedPomos % 4));
    return (
      <div className={`ov ov-bar ${showBg ? '' : 'no-bg'}`} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="ov-bar-logo" style={{ background: color }}>M</div>
        <span className="ov-bar-time">{timeStr}</span>
        <div className="ov-bar-progress">
          <div className="ov-bar-fill" style={{ width: `${pct}%`, background: color }}/>
        </div>
        <span className="ov-bar-mode" style={{ color }}>{modeLabel}</span>
        <div className="ov-bar-sep"/>
        <div className="ov-bar-dots">
          {dots.map((done, i) => (
            <span key={i} className={`ov-dot ${done ? 'done' : ''}`}
              style={done ? { background: color } : {}}/>
          ))}
        </div>
        {showControls && (
          <>
            <div className="ov-bar-sep"/>
            <div className="ov-bar-controls" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <button className="ov-bar-btn" onClick={handlePlayPause}>
                {tick.status === 'running' ? <PauseIcon/> : <PlayIcon/>}
              </button>
              <button className="ov-bar-btn" onClick={() => window.api.timer.skip()}>
                <SkipIcon/>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // === COMPACT (default) ~220×52 ===
  const R = 15, C = 2 * Math.PI * R;
  return (
    <div className={`ov ov-compact ${showBg ? '' : 'no-bg'}`} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="ov-ring-wrap">
        <svg viewBox="0 0 36 36" width="36" height="36">
          <circle cx="18" cy="18" r={R} fill="none" stroke="var(--sf2, #1E1E24)" strokeWidth="3"/>
          <circle cx="18" cy="18" r={R} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1s linear' }} transform="rotate(-90 18 18)"/>
        </svg>
        <span className="ov-pct" style={{ color }}>{pct}%</span>
      </div>
      <div className="ov-info">
        <span className="ov-time">{timeStr}</span>
        <span className="ov-mode" style={{ color }}>{modeLabel}</span>
      </div>
      {showControls && (
        <div className="ov-controls" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button className="ov-btn" onClick={() => window.api.timer.reset()}><ResetIcon/></button>
          <button className="ov-btn ov-btn-play" onClick={handlePlayPause}
            style={{ background: color }}>
            {tick.status === 'running' ? <PauseIcon/> : <PlayIcon/>}
          </button>
          <button className="ov-btn" onClick={() => window.api.timer.skip()}><SkipIcon/></button>
        </div>
      )}
    </div>
  );
}
