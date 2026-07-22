import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerTickPayload, TimerMode, TimerType, ThemeName, TimeUpEffect, Profile } from '../shared/types';
import { themeColors, contrastColor, BREAK_COLOR } from '../shared/constants';
import Settings from './components/Settings';
import FloatingTomatoes from './components/FloatingTomatoes';
import TomatoBurst from './components/TomatoBurst';
import Scene from './components/Scene';
import WeeklyChart from './components/WeeklyChart';
import './styles/app.css';
import './styles/settings.css';



// ====== App Component ======
export default function App() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [theme, setTheme] = useState<ThemeName>('tomato');
  const [customAccent, setCustomAccent] = useState('#E05A33');
  const [timerFont, setTimerFont] = useState('JetBrains Mono');
  const [showAnimation, setShowAnimation] = useState(true);
  const [timeUpEffect, setTimeUpEffect] = useState<TimeUpEffect>('flash');
  const [flashing, setFlashing] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const timeUpEffectRef = useRef<TimeUpEffect>('flash');
  // Settings unfold to the RIGHT via the ">>" edge arrow (mockup) — the panel
  // is exactly as wide as the main view; the window doubles while open.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sceneOn, setSceneOn] = useState(true);
  const [sceneStyle, setSceneStyle] = useState('flight');
  // Time scrubbing: hold LMB on MM or SS and drag to spin that unit.
  // scrubPreview holds the previewed duration in SECONDS.
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);
  const heroTimeRef = useRef<HTMLSpanElement>(null);
  const scrubRef = useRef<{ startY: number; startTotal: number; unit: 60 | 1; field: 'work_time' | 'break_time' | 'long_break_time' } | null>(null);

  // Timer state (received from main process via IPC)
  const [timerState, setTimerState] = useState<TimerTickPayload>({
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    mode: 'focus',
    status: 'idle',
    completedPomos: 0,
    countBackwards: true,
    rounds: 4,
    type: 'timer',
    elapsed: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalPomos, setTotalPomos] = useState(1);
  // Main-view toggles.
  const [pureTime, setPureTime] = useState(true);
  const [activeProfile, setActiveProfile] = useState('Pomodoro');
  const [laps, setLaps] = useState<number[]>([]); // stopwatch lap snapshots (elapsed seconds), newest last
  const [activeProfileData, setActiveProfileData] = useState<Profile | null>(null);
  const [volume, setVolume] = useState(70);
  const [hotkey, setHotkey] = useState('CommandOrControl+Shift+P');
  const [whiteNoise, setWhiteNoise] = useState('off'); // 'off' | 'rain'
  const [ticking, setTicking] = useState('off');       // 'off' | 'low' | 'med' | 'high'

  // Load saved settings on mount
  useEffect(() => {
    window.api.settings.getAll().then(s => {
      if (s.lang) setLang(s.lang);
      if (s.theme) setTheme(s.theme);
      if (s.custom_accent) setCustomAccent(s.custom_accent);
      if (s.timer_font) setTimerFont(s.timer_font);
      if (typeof s.show_animation === 'boolean') setShowAnimation(s.show_animation);
      if (typeof s.scene_on === 'boolean') setSceneOn(s.scene_on);
      if (s.scene_style) setSceneStyle(s.scene_style);
      if (s.time_up_effect) setTimeUpEffect(s.time_up_effect);
      if (typeof s.pure_time === 'boolean') setPureTime(s.pure_time);
      if (s.active_profile) setActiveProfile(s.active_profile);
      if (typeof s.sound_volume === 'number') setVolume(s.sound_volume);
      if (s.hotkey) setHotkey(s.hotkey);
      if (s.white_noise) setWhiteNoise(s.white_noise);
      if (s.ticking) setTicking(s.ticking);
    });
  }, []);

  // Load profiles + keep in sync (re-sync after the settings panel closes,
  // where profiles/timings may have been edited).
  useEffect(() => {
    if (settingsOpen) return;
    window.api.profile.getActive().then(setActiveProfileData).catch(() => { /* ignore */ });
    window.api.settings.getAll().then(s => {
      if (s.active_profile) setActiveProfile(s.active_profile);
      if (typeof s.pure_time === 'boolean') setPureTime(s.pure_time);
    });
  }, [settingsOpen]);

  // Keep the side-panel "mode settings" in sync with the active profile.
  useEffect(() => {
    window.api.profile.getActive().then(setActiveProfileData).catch(() => { /* ignore */ });
  }, [activeProfile, refreshKey]);

  // LIVE settings sync: every settings.set (from the side panel or anywhere)
  // is broadcast by main and applied here immediately — no need to close the
  // panel to see the change.
  useEffect(() => {
    const unsub = window.api.settings.onUpdate(s => {
      if (typeof s.theme === 'string') setTheme(s.theme as ThemeName);
      if (typeof s.custom_accent === 'string') setCustomAccent(s.custom_accent);
      if (typeof s.timer_font === 'string') setTimerFont(s.timer_font);
      if (typeof s.show_animation === 'boolean') setShowAnimation(s.show_animation);
      if (typeof s.scene_on === 'boolean') setSceneOn(s.scene_on);
      if (typeof s.scene_style === 'string') setSceneStyle(s.scene_style);
      if (typeof s.time_up_effect === 'string') setTimeUpEffect(s.time_up_effect as TimeUpEffect);
      if (typeof s.pure_time === 'boolean') setPureTime(s.pure_time);
      if (typeof s.sound_volume === 'number') setVolume(s.sound_volume);
      if (typeof s.white_noise === 'string') setWhiteNoise(s.white_noise);
      if (typeof s.ticking === 'string') setTicking(s.ticking);
      if (typeof s.hotkey === 'string') setHotkey(s.hotkey);
      if (s.lang === 'ru' || s.lang === 'en') setLang(s.lang);
    });
    return unsub;
  }, []);

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

  // Subscribe to timer completions — refresh grid + fire the time-up alert.
  useEffect(() => {
    const unsub = window.api.timer.onComplete((payload) => {
      setRefreshKey(k => k + 1);
      if (!payload?.natural) return; // a manual skip shouldn't alert
      const eff = timeUpEffectRef.current;
      if (eff === 'flash' || eff === 'both') setFlashing(true);
      if (eff === 'tomatoes' || eff === 'both') setBurstKey(k => k + 1);
    });
    return unsub;
  }, []);

  // Keep the latest effect choice available to the (once-subscribed) handler.
  useEffect(() => { timeUpEffectRef.current = timeUpEffect; }, [timeUpEffect]);

  // Stop the flash after a while, on any interaction, or once the next interval
  // is running.
  useEffect(() => {
    if (!flashing) return;
    const stop = () => setFlashing(false);
    const id = setTimeout(stop, 12000);
    window.addEventListener('pointerdown', stop);
    window.addEventListener('keydown', stop);
    return () => {
      clearTimeout(id);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [flashing]);

  useEffect(() => {
    if (timerState.status === 'running') setFlashing(false);
  }, [timerState.status]);

  // Load stats (total pomodoro count feeds the floating-tomatoes density);
  // the weekly chart loads its own data.
  useEffect(() => {
    window.api.db.getStats().then(s => {
      setTotalPomos(s.totalPomodoros || 1);
    }).catch(() => { /* ignore */ });
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

  // Timer display — the timer always counts DOWN (stopwatch counts up); the
  // old "count backwards" profile option is retired.
  const isStopwatch = timerState.type === 'stopwatch';
  const shownSeconds = isStopwatch ? timerState.elapsed : timerState.timeLeft;
  const minutes = Math.floor(shownSeconds / 60);
  const seconds = shownSeconds % 60;
  const hours = Math.floor(shownSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  // mm:ss, or h:mm:ss past an hour — shared by the hero time and lap rows.
  const fmtClock = (total: number) => {
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };
  // Stopwatch past an hour → H:MM:SS. The TIMER always stays MM:SS — 180
  // minutes must read «180:00», not «3:00:00» (and keep the fixed font).
  const timeDisplay = isStopwatch && hours > 0
    ? `${hours}:${pad(minutes % 60)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  // ONE fixed font size for every value: sized so the reference «180:00»
  // spans the column edge-to-edge (the size the manager approved). Shorter
  // values (25:00) render at the same size — no per-value scaling. Only a
  // LONGER string (stopwatch past an hour, 1:05:30) forces a smaller fit.
  const glyphCount = timeDisplay.length;
  const fitRefText = glyphCount > 6 ? timeDisplay : '180:00';
  React.useLayoutEffect(() => {
    const el = heroTimeRef.current; // inline digits wrapper
    if (!el) return;
    const cs = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;';
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.fontVariantNumeric = 'tabular-nums';
    probe.textContent = fitRefText;
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    const target = el.parentElement?.clientWidth || 480;
    if (w > 0) el.style.fontSize = `${Math.floor(100 * (target / w) * 0.99)}px`;
  }, [fitRefText, timerFont]);
  // Ring: timer shows remaining progress; stopwatch sweeps once per minute.
  const progress = isStopwatch
    ? (timerState.elapsed % 60) / 60
    : (timerState.totalTime ? 1 - timerState.timeLeft / timerState.totalTime : 0);
  const isBreak = !isStopwatch && timerState.mode !== 'focus';
  const accent = themeColors(theme, customAccent).accent;
  const ringColor = isBreak ? BREAK_COLOR : accent;
  // Mode/type/profile can only be switched while idle/waiting — lock otherwise.
  const modesLocked = timerState.status !== 'idle' && timerState.status !== 'waiting';

  // Stopwatch laps → rows (newest first) with per-lap split, running total, and
  // the fastest/slowest split flagged (classic stopwatch green/red).
  const lapRows = React.useMemo(() => {
    if (laps.length === 0) return [] as { n: number; total: number; split: number; tone: string }[];
    const splits = laps.map((t, i) => t - (laps[i - 1] ?? 0));
    const min = Math.min(...splits), max = Math.max(...splits);
    return laps
      .map((t, i) => ({
        n: i + 1, total: t, split: splits[i],
        tone: laps.length >= 2 ? (splits[i] === min ? 'fast' : splits[i] === max ? 'slow' : '') : '',
      }))
      .reverse();
  }, [laps]);

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
    setLaps([]);
  }, []);

  // Record a stopwatch lap — renderer-side snapshot of the elapsed seconds.
  const handleLap = useCallback(() => {
    setLaps(prev => [...prev, timerState.elapsed]);
  }, [timerState.elapsed]);

  const handleSkip = useCallback(() => {
    window.api.timer.skip();
  }, []);

  const handleModeClick = useCallback((m: TimerMode) => {
    if (timerState.status === 'idle' || timerState.status === 'waiting') {
      window.api.timer.setMode(m);
    }
  }, [timerState.status]);

  // Switch timer ⇄ stopwatch (only when not actively running).
  const setType = useCallback((t: TimerType) => {
    if (timerState.status === 'running') return;
    if (timerState.type !== t) { window.api.timer.setType(t); setLaps([]); }
  }, [timerState.status, timerState.type]);

  // Toggle "чистое время" (idle-pause) live.
  const togglePureTime = useCallback(() => {
    setPureTime(prev => { const next = !prev; window.api.settings.set('pure_time', next); return next; });
  }, []);

  // Side-panel controls.
  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    window.api.settings.set('sound_volume', v);
  }, []);
  const cycleTicking = useCallback(() => {
    const order = ['off', 'low', 'med', 'high'];
    setTicking(prev => {
      const next = order[(order.indexOf(prev) + 1) % order.length];
      window.api.settings.set('ticking', next);
      return next;
    });
  }, []);
  const cycleWhiteNoise = useCallback(() => {
    const order = ['off', 'rain'];
    setWhiteNoise(prev => {
      const next = order[(order.indexOf(prev) + 1) % order.length];
      window.api.settings.set('white_noise', next);
      return next;
    });
  }, []);
  // Toggle the settings panel (">>" edge arrow) — the window widens by the
  // main-view width while it is open. The IPC call lives in an effect, NOT in
  // the setState updater: StrictMode double-invokes updaters, which stacked
  // the window wider and wider (the "растёт вправо" bug).
  const toggleSettings = useCallback((open?: boolean) => {
    setSettingsOpen(prev => (typeof open === 'boolean' ? open : !prev));
  }, []);
  useEffect(() => {
    window.api.window.setSidebar(settingsOpen);
  }, [settingsOpen]);

  // Escape closes the settings panel.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settingsOpen) toggleSettings(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settingsOpen, toggleSettings]);

  // === Time scrubbing ===
  // Hold LMB on the MINUTES or SECONDS half of the digits and drag vertically
  // to spin that unit (Фокус → work_time, Пауза → break_time). Durations are
  // stored as fractional minutes so seconds survive the round-trip. Only
  // while the timer is not running.
  const scrubField: 'work_time' | 'break_time' | 'long_break_time' =
    timerState.mode === 'focus' ? 'work_time'
      : timerState.mode === 'long_break' ? 'long_break_time' : 'break_time';
  const canScrub = !modesLocked && timerState.type === 'timer' && !!activeProfileData;

  const onScrubDown = useCallback((unit: 60 | 1) => (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!canScrub || e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrubRef.current = {
      startY: e.clientY,
      startTotal: Math.max(10, Math.round(timerState.totalTime)),
      unit,
      field: scrubField,
    };
    setScrubPreview(scrubRef.current.startTotal);
  }, [canScrub, timerState.totalTime, scrubField]);

  const onScrubMove = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    const sc = scrubRef.current;
    if (!sc) return;
    // 6 px per step; dragging up increases. Step = the segment's unit.
    const delta = Math.round((sc.startY - e.clientY) / 6) * sc.unit;
    setScrubPreview(Math.max(10, Math.min(180 * 60, sc.startTotal + delta)));
  }, []);

  const onScrubUp = useCallback(() => {
    const sc = scrubRef.current;
    scrubRef.current = null;
    setScrubPreview(prev => {
      if (sc && prev != null && prev !== sc.startTotal) {
        // Merge into the FRESH profile (the side panel may have just edited
        // other fields); fractional minutes keep the seconds.
        window.api.profile.getActive().then(p => {
          if (!p) return;
          const updated = { ...p, [sc.field]: prev / 60 };
          setActiveProfileData(updated);
          window.api.profile.update(updated);
        }).catch(() => { /* ignore */ });
      }
      return null;
    });
  }, []);

  // Side-panel display helpers.
  const tickingLabel = (v: string) => lang === 'ru'
    ? ({ off: 'Выкл', low: 'Низкое', med: 'Среднее', high: 'Высокое' }[v] ?? 'Выкл')
    : ({ off: 'Off', low: 'Low', med: 'Medium', high: 'High' }[v] ?? 'Off');
  const whiteNoiseLabel = (v: string) => lang === 'ru'
    ? ({ off: 'Выкл', rain: 'Дождь' }[v] ?? 'Выкл')
    : ({ off: 'Off', rain: 'Rain' }[v] ?? 'Off');
  // Human keycaps for the global hotkey string.
  const hotkeyCaps = hotkey.split('+').map(k => {
    const map: Record<string, string> = { CommandOrControl: '⌘', Command: '⌘', Control: 'Ctrl', Ctrl: 'Ctrl', Shift: '⇧', Alt: 'Alt', Option: '⌥' };
    return map[k] ?? k;
  });

  return (
    <div className={`app app-wide${showAnimation ? ' anim' : ''}`}>
      {/* Floating tomatoes when running (respect the animation toggle) */}
      <FloatingTomatoes active={timerState.status === 'running' && showAnimation} accentColor={accent} count={totalPomos} />

      {/* Time-up alert (system notifications get ignored): a contrasting flash
          and/or a scatter of tomatoes, per the time_up_effect setting. */}
      {flashing && <div className="time-up-flash" aria-hidden="true" />}
      <TomatoBurst trigger={burstKey} />

      {/* === Top bar === */}
      <header className="topbar app-drag">
        <div className="topbar-left app-no-drag">
          <img src="./assets/icon.png" alt="" className="header-logo" width={22} height={22} />
          <span className="header-title header-title--brand">POMODORO</span>
        </div>

        <div className="topbar-right app-no-drag">
          <button className="header-lang" onClick={() => changeLang(lang === 'ru' ? 'en' : 'ru')}>
            {lang === 'ru' ? 'RU' : 'EN'} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div className="window-controls">
            <button className="win-btn" onClick={() => window.api.window.toOverlay()} aria-label={lang === 'ru' ? 'Свернуть в оверлей' : 'Collapse to overlay'} title={lang === 'ru' ? 'Оверлей' : 'Overlay'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><rect x="12.5" y="12.5" width="6" height="5" rx="1" fill="currentColor" stroke="none"/></svg>
            </button>
            <button className="win-btn" onClick={() => window.api.window.minimize()} aria-label="Minimize">
              <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
            {/* Maximize removed: it secretly minimized, and full-screen would
                break the fixed 9:16 proportions anyway. */}
            <button className="win-btn win-close" onClick={() => window.api.window.close()} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.3"/><line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* === Two-column workspace === */}
      <div className="workspace">
        <main className="main-col app-no-drag">

      {/* === Row 1 (mockup): Таймер | Секундомер === */}
      <div className="grid-row grid-row--2">
        <button role="tab" aria-selected={!isStopwatch} disabled={modesLocked}
          className={`box-btn ${!isStopwatch ? 'active' : ''}`} onClick={() => setType('timer')}>
          {lang === 'ru' ? 'Таймер' : 'Timer'}
        </button>
        <button role="tab" aria-selected={isStopwatch} disabled={modesLocked}
          className={`box-btn ${isStopwatch ? 'active' : ''}`} onClick={() => setType('stopwatch')}>
          {lang === 'ru' ? 'Секундомер' : 'Stopwatch'}
        </button>
      </div>

      {/* === Row 2 (mockup): Фокус | Пауза — only two visible modes === */}
      {!isStopwatch && (
        <div className="grid-row grid-row--2" role="tablist">
          <button role="tab" aria-selected={timerState.mode === 'focus'} disabled={modesLocked}
            className={`box-btn ${timerState.mode === 'focus' ? 'active' : ''}`}
            onClick={() => handleModeClick('focus')}>
            {lang === 'ru' ? 'Фокус' : 'Focus'}
          </button>
          <button role="tab" aria-selected={timerState.mode !== 'focus'} disabled={modesLocked}
            className={`box-btn box-btn--break ${timerState.mode !== 'focus' ? 'active' : ''}`}
            onClick={() => handleModeClick('short_break')}>
            {lang === 'ru' ? 'Пауза' : 'Break'}
          </button>
        </div>
      )}

      {/* === Row 3 (mockup): ЧИСТОЕ ВРЕМЯ — same box style as the tabs === */}
      <div className="grid-row">
        <button className={`box-btn ${pureTime ? 'active' : ''}`} onClick={togglePureTime}
          aria-pressed={pureTime}
          title={lang === 'ru' ? 'Чистое время: пауза при бездействии 10 с' : 'Pure time: pause after 10 s idle'}>
          {lang === 'ru' ? 'ЧИСТОЕ ВРЕМЯ' : 'PURE TIME'}
        </button>
      </div>

      {/* === Hero: huge time (hold LMB + drag to spin minutes) === */}
      <div className="hero2">
        <div
          className={`hero2-time${canScrub ? ' scrubbable' : ''}${scrubPreview != null ? ' scrubbing' : ''}`}
          role="timer" aria-live="polite"
          aria-label={`${minutes} ${lang === 'ru' ? 'минут' : 'minutes'} ${seconds} ${lang === 'ru' ? 'секунд' : 'seconds'}`}
          title={canScrub ? (lang === 'ru' ? 'Зажми минуты или секунды и тяни' : 'Hold minutes or seconds and drag') : undefined}
        >
          <span className="hero2-digits" ref={heroTimeRef}>
            {canScrub ? (
              // Two independent scrub segments: minutes and seconds.
              <>
                <span
                  className="scrub-seg"
                  onPointerDown={onScrubDown(60)}
                  onPointerMove={onScrubMove}
                  onPointerUp={onScrubUp}
                  onPointerCancel={onScrubUp}
                >
                  {pad(scrubPreview != null ? Math.floor(scrubPreview / 60) : minutes)}
                </span>
                :
                <span
                  className="scrub-seg"
                  onPointerDown={onScrubDown(1)}
                  onPointerMove={onScrubMove}
                  onPointerUp={onScrubUp}
                  onPointerCancel={onScrubUp}
                >
                  {pad(scrubPreview != null ? scrubPreview % 60 : seconds)}
                </span>
              </>
            ) : timeDisplay}
          </span>
        </div>
        <div className="hero2-track" aria-hidden="true">
          <span
            className="hero2-fill"
            style={{
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              background: ringColor,
              transition: timerState.status === 'running' ? 'width 1s linear, background 0.4s ease' : 'background 0.4s ease',
            }}
          />
        </div>
        {/* Idle-pause badge (чистое время) — styled like the other boxes. */}
        {timerState.idle && (
          <div className="idle-pill" role="status">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.4"/><rect x="14" y="4" width="4" height="16" rx="1.4"/></svg>
            {lang === 'ru' ? 'ПАУЗА — НЕТ АКТИВНОСТИ' : 'PAUSED — NO ACTIVITY'}
          </div>
        )}
      </div>

      {/* === Controls — rectangular, labels inside (mockup style) === */}
      {isStopwatch ? (
        <div className="controls-rect app-no-drag">
          {timerState.status === 'running' ? (
            <button className="ctrl-rect" onClick={handleLap}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1.5-1 4-1 4 2 8 2 4-1 4-1V3s-1.5 1-4 1-4-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              {lang === 'ru' ? 'Круг' : 'Lap'}
            </button>
          ) : (
            <button className="ctrl-rect" onClick={handleReset}
              disabled={timerState.elapsed === 0 && laps.length === 0}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 9 9"/><polyline points="1 17 3 21 7 19"/></svg>
              {lang === 'ru' ? 'Сброс' : 'Reset'}
            </button>
          )}
          <button className="ctrl-rect ctrl-rect--play" onClick={handlePlayPause}
            style={{ background: accent, borderColor: accent, color: contrastColor(accent) }}>
            {timerState.status === 'running'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>}
            {timerState.status === 'running' ? (lang === 'ru' ? 'Пауза' : 'Pause') : (lang === 'ru' ? 'Старт' : 'Start')}
          </button>
        </div>
      ) : (
        <div className="controls-rect app-no-drag">
          <button className="ctrl-rect" onClick={handleReset}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 9 9"/><polyline points="1 17 3 21 7 19"/></svg>
            {lang === 'ru' ? 'Сброс' : 'Reset'}
          </button>
          <button className="ctrl-rect ctrl-rect--play" onClick={handlePlayPause}
            style={{ background: accent, borderColor: accent, color: contrastColor(accent) }}>
            {timerState.status === 'running'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>}
            {timerState.status === 'running' ? (lang === 'ru' ? 'Пауза' : 'Pause') : (lang === 'ru' ? 'Старт' : 'Start')}
          </button>
          <button className="ctrl-rect" onClick={handleSkip}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
            {lang === 'ru' ? 'Пропустить' : 'Skip'}
          </button>
        </div>
      )}

      {/* === Stopwatch laps (newest first · fastest green · slowest red) === */}
      {isStopwatch && lapRows.length > 0 && (
        <div className="laps app-no-drag">
          {lapRows.map(row => (
            <div key={row.n} className={`lap-row ${row.tone}`}>
              <span className="lap-n">{lang === 'ru' ? 'Круг' : 'Lap'} {row.n}</span>
              <span className="lap-split">{fmtClock(row.split)}</span>
              <span className="lap-total">{fmtClock(row.total)}</span>
            </div>
          ))}
        </div>
      )}

      {/* === Scene: pixel animation (сцена) — style picked in settings === */}
      {sceneOn && (
        <div className="scene-box app-no-drag">
          <Scene
            mode={isBreak ? 'break' : 'focus'}
            running={timerState.status === 'running'}
            idle={!!timerState.idle}
            accent={accent}
            style={sceneStyle}
          />
        </div>
      )}

      {/* === Статистика: недельный график (числовая полоса убрана) === */}
      <div className="stats-box app-no-drag">
        <WeeklyChart accentColor={accent} lang={lang} refreshKey={refreshKey} />
      </div>

      {/* === Выбор цвета === */}
      <div className="color-row app-no-drag" role="radiogroup" aria-label={lang === 'ru' ? 'Выбор цвета' : 'Color'}>
        <span className="color-row__label">{lang === 'ru' ? 'Выбор цвета' : 'Color'}</span>
        <div className="color-row__swatches">
          {(['tomato', 'ocean', 'forest', 'violet'] as ThemeName[]).map(t => (
            <button
              key={t}
              role="radio"
              aria-checked={theme === t}
              className={`color-swatch ${theme === t ? 'active' : ''}`}
              style={{ background: themeColors(t, customAccent).accent }}
              onClick={() => changeTheme(t)}
              aria-label={t}
            />
          ))}
          <label className={`color-swatch color-swatch--custom ${theme === 'custom' ? 'active' : ''}`}
            style={theme === 'custom' ? { background: customAccent } : {}}
            title={lang === 'ru' ? 'Свой цвет' : 'Custom color'}>
            <input
              type="color"
              value={customAccent}
              onChange={e => {
                setCustomAccent(e.target.value);
                window.api.settings.set('custom_accent', e.target.value);
                changeTheme('custom');
              }}
            />
            {theme !== 'custom' && <span aria-hidden="true">+</span>}
          </label>
        </div>
      </div>

        </main>

        {/* === Edge arrow: unfold settings to the right (mockup: ">>") === */}
        <button
          className="edge-arrow app-no-drag"
          onClick={() => toggleSettings()}
          aria-expanded={settingsOpen}
          aria-label={lang === 'ru' ? (settingsOpen ? 'Скрыть настройки' : 'Настройки') : (settingsOpen ? 'Hide settings' : 'Settings')}
        >
          {settingsOpen ? '«' : '»'}
        </button>

        {/* === Settings panel — same width as the main view === */}
        {settingsOpen && (
          <aside className="settings-side app-no-drag">
            {/* Quick controls strip on top, full settings below. */}
            <section className="side-sec side-sec--quick">
              <div className="side-sec__head">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>
                {lang === 'ru' ? 'Громкость' : 'Volume'}
                <span className="side-sec__aside">{volume}%</span>
              </div>
              <input type="range" min={0} max={100} value={volume}
                onChange={e => changeVolume(Number(e.target.value))}
                className="side-slider" style={{ accentColor: accent }} />
              <button className="side-row side-row--btn" onClick={cycleTicking}>
                <span>{lang === 'ru' ? 'Тикание' : 'Ticking'}</span>
                <span className="side-row__val side-chev">{tickingLabel(ticking)} ›</span>
              </button>
              <button className="side-row side-row--btn" onClick={cycleWhiteNoise}>
                <span>{lang === 'ru' ? 'Белый шум' : 'White noise'}</span>
                <span className="side-row__val side-chev">{whiteNoiseLabel(whiteNoise)} ›</span>
              </button>
              <div className="side-row">
                <span>{lang === 'ru' ? 'Горячая клавиша' : 'Hotkey'}</span>
                <span className="keycaps">
                  {hotkeyCaps.map((k, i) => <kbd key={i} className="keycap">{k}</kbd>)}
                </span>
              </div>
            </section>

            <Settings
              lang={lang}
              theme={theme}
              onThemeChange={changeTheme}
              onLangChange={changeLang}
              onClose={() => toggleSettings(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
