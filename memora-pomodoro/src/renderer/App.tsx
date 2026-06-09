import React, { useState, useEffect, useCallback } from 'react';
import type { TimerTickPayload, TimerMode, TimerStatus, ThemeName, PresetTheme } from '../shared/types';
import { THEME_COLORS, themeColors, BREAK_COLOR, RING_CIRCUMFERENCE, RING_RADIUS } from '../shared/constants';
import ContribGrid from './components/ContribGrid';
import Settings from './components/Settings';
import FloatingTomatoes from './components/FloatingTomatoes';
import './styles/app.css';
import './styles/settings.css';

// ====== Mode Labels ======
const MODE_LABELS: Record<string, Record<TimerMode, string>> = {
  ru: { focus: 'Фокус', short_break: 'Короткий', long_break: 'Длинный' },
  en: { focus: 'Focus', short_break: 'Short Break', long_break: 'Long Break' },
};

// ====== App Component ======
export default function App() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [theme, setTheme] = useState<ThemeName>('tomato');
  const [customAccent, setCustomAccent] = useState('#E05A33');
  const [timerFont, setTimerFont] = useState('JetBrains Mono');
  const [showAnimation, setShowAnimation] = useState(true);
  const [view, setView] = useState<'timer' | 'settings'>('timer');

  // Timer state (received from main process via IPC)
  const [timerState, setTimerState] = useState<TimerTickPayload>({
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    mode: 'focus',
    status: 'idle',
    completedPomos: 0,
    countBackwards: true,
    rounds: 4,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalPomos, setTotalPomos] = useState(1);

  // Load saved settings on mount
  useEffect(() => {
    window.api.settings.getAll().then(s => {
      if (s.lang) setLang(s.lang);
      if (s.theme) setTheme(s.theme);
      if (s.custom_accent) setCustomAccent(s.custom_accent);
      if (s.timer_font) setTimerFont(s.timer_font);
      if (typeof s.show_animation === 'boolean') setShowAnimation(s.show_animation);
    });
  }, []);

  // Re-sync appearance when returning from the Settings view (rounds come live
  // from the timer tick payload).
  useEffect(() => {
    if (view !== 'timer') return;
    window.api.settings.getAll().then(s => {
      if (s.theme) setTheme(s.theme);
      if (s.custom_accent) setCustomAccent(s.custom_accent);
      if (s.timer_font) setTimerFont(s.timer_font);
      if (typeof s.show_animation === 'boolean') setShowAnimation(s.show_animation);
    });
  }, [view]);

  // Escape closes settings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'settings') setView('timer');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  // Sound playback listener — bundled sounds load from /assets/sounds; custom
  // (imported) files are read from userData via IPC and played from a blob.
  useEffect(() => {
    const BUNDLED = ['bell-gentle.wav', 'chime-soft.wav'];
    const unsub = window.api.system.onPlaySound(async ({ file, volume, times }) => {
      const playOnce = async () => {
        try {
          let src = `./assets/sounds/${file}`;
          if (!BUNDLED.includes(file)) {
            const data = await window.api.sound.read(file);
            if (!data) return;
            src = URL.createObjectURL(new Blob([data as unknown as BlobPart]));
          }
          const audio = new Audio(src);
          audio.volume = Math.max(0, Math.min(1, volume));
          const isBlob = src.startsWith('blob:');
          if (isBlob) audio.addEventListener('ended', () => URL.revokeObjectURL(src), { once: true });
          // Revoke on play failure too, otherwise the blob URL leaks (no 'ended').
          try { await audio.play(); }
          catch { if (isBlob) URL.revokeObjectURL(src); }
        } catch { /* ignore */ }
      };
      const n = Math.max(1, times || 1);
      for (let i = 0; i < n; i++) {
        await playOnce();
        if (i < n - 1) await new Promise(r => setTimeout(r, 700));
      }
    });
    return unsub;
  }, []);

  // Subscribe to timer ticks from main process
  useEffect(() => {
    const unsub = window.api.timer.onTick((data) => {
      setTimerState(data);
    });
    return unsub;
  }, []);

  // Subscribe to timer completions — refresh grid
  useEffect(() => {
    const unsub = window.api.timer.onComplete(() => {
      setRefreshKey(k => k + 1);
    });
    return unsub;
  }, []);

  // Load total pomodoro count (for flying tomatoes)
  useEffect(() => {
    window.api.db.getStats().then(stats => {
      setTotalPomos(stats.totalPomodoros || 1);
    });
  }, [refreshKey]);

  // Apply theme (presets + custom) to CSS variables.
  useEffect(() => {
    const colors = themeColors(theme, customAccent);
    const root = document.documentElement;
    root.style.setProperty('--a', colors.accent);
    root.style.setProperty('--a-dim', colors.dim);
    root.style.setProperty('--a-glow', colors.glow);
  }, [theme, customAccent]);

  // Apply the chosen timer font.
  useEffect(() => {
    document.documentElement.style.setProperty('--timer-font', `'${timerFont}'`);
  }, [timerFont]);

  // Persist lang/theme when changed
  const changeLang = useCallback((l: 'ru' | 'en') => {
    setLang(l);
    window.api.settings.set('lang', l);
    window.api.system.setLang(l);
  }, []);
  const changeTheme = useCallback((t: ThemeName) => {
    setTheme(t);
    window.api.settings.set('theme', t);
  }, []);

  // Timer display — count down (remaining) or up (elapsed) per the profile's
  // "count backwards" setting. The progress ring always reflects elapsed.
  const shownSeconds = timerState.countBackwards
    ? timerState.timeLeft
    : timerState.totalTime - timerState.timeLeft;
  const minutes = Math.floor(shownSeconds / 60);
  const seconds = shownSeconds % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progress = 1 - timerState.timeLeft / timerState.totalTime;
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progress);
  const isBreak = timerState.mode !== 'focus';
  const accent = themeColors(theme, customAccent).accent;
  const ringColor = isBreak ? BREAK_COLOR : accent;
  // Mode can only be switched while idle/waiting — lock the tabs otherwise.
  const modesLocked = timerState.status !== 'idle' && timerState.status !== 'waiting';

  // Controls
  const handlePlayPause = useCallback(() => {
    if (timerState.status === 'running') {
      window.api.timer.pause();
    } else if (timerState.status === 'paused') {
      window.api.timer.resume();
    } else {
      window.api.timer.start();
    }
  }, [timerState.status]);

  const handleReset = useCallback(() => {
    window.api.timer.reset();
  }, []);

  const handleSkip = useCallback(() => {
    window.api.timer.skip();
  }, []);

  const handleModeClick = useCallback((m: TimerMode) => {
    if (timerState.status === 'idle' || timerState.status === 'waiting') {
      window.api.timer.setMode(m);
    }
  }, [timerState.status]);

  if (view === 'settings') {
    return (
      <div className="app">
        <header className="app-header app-drag">
          <div className="header-left app-no-drag">
            <img src="./assets/icon.png" alt="" className="header-logo" width={20} height={20} />
            <span className="header-title">memora pomodoro</span>
          </div>
        </header>
        <Settings
          lang={lang}
          theme={theme}
          onThemeChange={changeTheme}
          onLangChange={changeLang}
          onClose={() => setView('timer')}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Floating tomatoes when running (respect the animation toggle) */}
      <FloatingTomatoes active={timerState.status === 'running' && showAnimation} accentColor={accent} count={totalPomos} />

      {/* === Header (drag zone) === */}
      <header className="app-header app-drag">
        <div className="header-left app-no-drag">
          <img src="./assets/icon.png" alt="" className="header-logo" width={20} height={20} />
          <span className="header-title">memora pomodoro</span>
        </div>
        <div className="header-right app-no-drag">
          <button
            className="header-lang"
            onClick={() => changeLang(lang === 'ru' ? 'en' : 'ru')}
          >
            {lang === 'ru' ? 'RU' : 'EN'}
          </button>
          <button
            className="header-settings"
            onClick={() => setView(v => v === 'timer' ? 'settings' : 'timer')}
            aria-label={lang === 'ru' ? 'Настройки' : 'Settings'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          {/* Window controls */}
          <div className="window-controls">
            <button
              className="win-btn"
              onClick={() => window.api.window.toOverlay()}
              aria-label={lang === 'ru' ? 'Свернуть в оверлей' : 'Collapse to overlay'}
              title={lang === 'ru' ? 'Оверлей' : 'Overlay'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><rect x="12.5" y="12.5" width="6" height="5" rx="1" fill="currentColor" stroke="none"/></svg>
            </button>
            <button className="win-btn" onClick={() => window.api.window.minimize()} aria-label="Minimize">
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
            <button className="win-btn win-close" onClick={() => window.api.window.close()} aria-label="Close">
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* === Mode Tabs === */}
      <nav className="mode-tabs" role="tablist">
        {(['focus', 'short_break', 'long_break'] as TimerMode[]).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={timerState.mode === m}
            disabled={modesLocked}
            className={`mode-tab ${timerState.mode === m ? 'active' : ''}`}
            onClick={() => handleModeClick(m)}
          >
            {MODE_LABELS[lang][m]}
          </button>
        ))}
      </nav>

      {/* === Ring Timer === */}
      <div className="ring-container" role="timer" aria-live="polite"
        aria-label={`${minutes} ${lang === 'ru' ? 'минут' : 'minutes'} ${seconds} ${lang === 'ru' ? 'секунд' : 'seconds'}`}
      >
        <svg className="ring-svg" viewBox="0 0 200 200" width={200} height={200}>
          {/* Background circle */}
          <circle
            cx="100" cy="100" r={RING_RADIUS}
            fill="none"
            stroke="var(--sf2)"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="100" cy="100" r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            style={{ transition: timerState.status === 'running'
              ? 'stroke-dashoffset 1s linear, stroke 0.5s ease'
              : 'stroke 0.5s ease' }}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="ring-time">
          {timeDisplay}
        </div>
        <div className="ring-label" style={{ color: 'var(--t2)' }}>
          {MODE_LABELS[lang][timerState.mode]}
        </div>
      </div>

      {/* === Controls === */}
      <div className="controls">
        <button className="ctrl-btn" onClick={handleReset} aria-label={lang === 'ru' ? 'Сбросить' : 'Reset'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 9 9"/><polyline points="1 17 3 21 7 19"/></svg>
        </button>
        <button className="ctrl-btn ctrl-play" onClick={handlePlayPause}
          aria-label={timerState.status === 'running'
            ? (lang === 'ru' ? 'Пауза' : 'Pause')
            : (lang === 'ru' ? 'Начать' : 'Start')
          }
        >
          {timerState.status === 'running'
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
          }
        </button>
        <button className="ctrl-btn" onClick={handleSkip} aria-label={lang === 'ru' ? 'Пропустить' : 'Skip'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
        </button>
      </div>

      {/* === Session Dots === */}
      <div className="session-dots">
        {Array.from({ length: timerState.rounds }).map((_, i) => (
          <div
            key={i}
            className={`dot ${i < timerState.completedPomos ? 'filled' : ''}`}
            style={i < timerState.completedPomos ? { background: accent } : {}}
          />
        ))}
      </div>

      {/* === Contribution Grid === */}
      <ContribGrid accentColor={accent} lang={lang} refreshKey={refreshKey} />

      {/* === Theme Pills === */}
      <div className="theme-pills">
        {(Object.keys(THEME_COLORS) as PresetTheme[]).map(t => (
          <button
            key={t}
            className={`theme-pill ${theme === t ? 'active' : ''}`}
            style={{ background: THEME_COLORS[t].accent }}
            onClick={() => changeTheme(t)}
            aria-label={t}
          />
        ))}
        <button
          className={`theme-pill ${theme === 'custom' ? 'active' : ''}`}
          style={{ background: customAccent }}
          onClick={() => changeTheme('custom')}
          aria-label="custom"
        />
      </div>
    </div>
  );
}
