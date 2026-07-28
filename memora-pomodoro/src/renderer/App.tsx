import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerTickPayload, TimerMode, TimerType, ThemeName, TimeUpEffect, Profile } from '../shared/types';
import { themeColors, contrastColor, BREAK_COLOR } from '../shared/constants';
import { IS_WEB } from '../shared/target';
import { applyTokens } from '../shared/applyTokens';
import Settings from './components/Settings';
import FloatingTomatoes from './components/FloatingTomatoes';
import TomatoBurst from './components/TomatoBurst';
import Scene from './components/Scene';
import WeeklyChart from './components/WeeklyChart';
import { APP_ICON_URL } from './assets';
import './styles/app.css';
import './styles/settings.css';

const SCENE_STYLES = ['ninja', 'chart', 'orbit', 'garden'] as const;
type SceneStyle = (typeof SCENE_STYLES)[number];
const isSceneStyle = (value: unknown): value is SceneStyle =>
  typeof value === 'string' && SCENE_STYLES.includes(value as SceneStyle);

// ====== App Component ======
export default function App() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [theme, setTheme] = useState<ThemeName>('tomato');
  const [customAccent, setCustomAccent] = useState('#E05A33');
  const [timerFont, setTimerFont] = useState('JetBrains Mono');
  const [timeUpEffect, setTimeUpEffect] = useState<TimeUpEffect>('flash');
  const [flashing, setFlashing] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [summaryKey, setSummaryKey] = useState(0); // итоговый график сцены
  const timeUpEffectRef = useRef<TimeUpEffect>('flash');
  // Settings unfold to the RIGHT via the ">>" edge arrow (mockup) — the panel
  // is exactly as wide as the main view; the window doubles while open.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sceneOn, setSceneOn] = useState(true);
  const [sceneStyle, setSceneStyle] = useState<SceneStyle>('ninja');
  const [sceneSpeed, setSceneSpeed] = useState(100);
  // Time scrubbing: hold LMB on MM or SS and drag to spin that unit.
  // scrubPreview holds the previewed duration in SECONDS.
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);
  const scrubPreviewRef = useRef<number | null>(null);
  const heroTimeRef = useRef<HTMLSpanElement>(null);
  const scrubRef = useRef<{ startY: number; startTotal: number; unit: 60 | 1; field: 'work_time' | 'break_time' } | null>(null);

  // Timer state (received from main process via IPC)
  const [timerReady, setTimerReady] = useState(false);
  const [timerState, setTimerState] = useState<TimerTickPayload>({
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    mode: 'focus',
    status: 'idle',
    completedPomos: 0,
    countBackwards: true,
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

  // Load saved settings on mount
  useEffect(() => {
    window.api.settings.getAll().then(s => {
      if (s.lang) setLang(s.lang);
      if (s.theme) setTheme(s.theme);
      if (s.custom_accent) setCustomAccent(s.custom_accent);
      if (s.timer_font) setTimerFont(s.timer_font);
      if (typeof s.scene_on === 'boolean') setSceneOn(s.scene_on);
      if (isSceneStyle(s.scene_style)) setSceneStyle(s.scene_style);
      if (typeof s.scene_speed === 'number') setSceneSpeed(s.scene_speed);
      if (s.time_up_effect) setTimeUpEffect(s.time_up_effect);
      if (typeof s.pure_time === 'boolean') setPureTime(s.pure_time);
      if (s.active_profile) setActiveProfile(s.active_profile);
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
      if (typeof s.scene_on === 'boolean') setSceneOn(s.scene_on);
      if (isSceneStyle(s.scene_style)) setSceneStyle(s.scene_style);
      if (typeof s.scene_speed === 'number') setSceneSpeed(s.scene_speed);
      if (typeof s.time_up_effect === 'string') setTimeUpEffect(s.time_up_effect as TimeUpEffect);
      if (typeof s.pure_time === 'boolean') setPureTime(s.pure_time);
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

  // Subscribe first, then request an explicit snapshot. The active profile is
  // loaded before the Electron window exists, so its initial broadcast has no
  // renderer recipient. Without this snapshot the UI briefly lies with 25:00
  // and only reveals the stored duration after the first Start click.
  useEffect(() => {
    let active = true;
    let receivedLiveTick = false;
    const unsub = window.api.timer.onTick((data) => {
      receivedLiveTick = true;
      setTimerState(data);
      setTimerReady(true);
    });
    window.api.timer.getState()
      .then(data => {
        if (!active || receivedLiveTick) return;
        setTimerState(data);
        setTimerReady(true);
      })
      .catch(() => {
        if (active) setTimerReady(true);
      });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Subscribe to timer completions — refresh grid + fire the time-up alert.
  useEffect(() => {
    const unsub = window.api.timer.onComplete((payload) => {
      setRefreshKey(k => k + 1);
      if (!payload?.natural) return; // a manual skip shouldn't alert
      // Досидел интервал до конца → сцена «График активности» показывает
      // итоговый график за весь отрезок.
      if (payload.mode === 'focus') setSummaryKey(k => k + 1);
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

  // Токены раскладки (ширина колонки, зазоры, высоты) — из shared/tokens.json.
  useEffect(() => { applyTokens(); }, []);

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
  const engineSeconds = isStopwatch ? timerState.elapsed : timerState.timeLeft;
  const shownSeconds = scrubPreview ?? engineSeconds;
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
  const timeDisplay = !timerReady
    ? '--:--'
    : isStopwatch && hours > 0
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
    let active = true;
    const fit = () => {
      if (!active) return;
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
    };
    fit();
    document.fonts?.ready.then(fit).catch(() => { /* fallback fit already ran */ });
    const ro = new ResizeObserver(fit);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => {
      active = false;
      ro.disconnect();
    };
  }, [fitRefText, timerFont]);
  // Ring: timer shows remaining progress; stopwatch sweeps once per minute.
  const progress = isStopwatch
    ? (timerState.elapsed % 60) / 60
    : (timerState.totalTime ? 1 - timerState.timeLeft / timerState.totalTime : 0);
  const isBreak = !isStopwatch && timerState.mode !== 'focus';
  const accent = themeColors(theme, customAccent).accent;
  const ringColor = isBreak ? BREAK_COLOR : accent;
  // Mode/type/profile can only be switched while idle/waiting — lock otherwise.
  const modesLocked = !timerReady || (timerState.status !== 'idle' && timerState.status !== 'waiting');

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
  const scrubField: 'work_time' | 'break_time' =
    timerState.mode === 'focus' ? 'work_time' : 'break_time';
  const canScrub = timerReady && !modesLocked && timerState.type === 'timer' && !!activeProfileData;

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
    scrubPreviewRef.current = scrubRef.current.startTotal;
    setScrubPreview(scrubRef.current.startTotal);
  }, [canScrub, timerState.totalTime, scrubField]);

  const onScrubMove = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    const sc = scrubRef.current;
    if (!sc) return;
    // A dead zone and truncation prevent ±1 jitter around the grab point.
    const delta = Math.trunc((sc.startY - e.clientY) / 8) * sc.unit;
    const next = Math.max(10, Math.min(180 * 60, sc.startTotal + delta));
    if (scrubPreviewRef.current !== next) {
      scrubPreviewRef.current = next;
      setScrubPreview(next);
    }
  }, []);

  const onScrubUp = useCallback(() => {
    const sc = scrubRef.current;
    const committed = scrubPreviewRef.current;
    scrubRef.current = null;
    scrubPreviewRef.current = null;
    if (sc && committed != null && committed !== sc.startTotal) {
      // Keep the committed number on screen while persistence and the main
      // process catch up. This removes the one-frame jump back to the old value.
      setTimerState(prev => ({ ...prev, timeLeft: committed, totalTime: committed }));
      window.api.profile.getActive().then(p => {
        if (!p) return;
        const updated = { ...p, [sc.field]: committed / 60 };
        setActiveProfileData(updated);
        return window.api.profile.update(updated);
      }).catch(() => {
        window.api.timer.getState().then(setTimerState).catch(() => { /* ignore */ });
      });
    }
    setScrubPreview(null);
  }, []);

  const changeScene = useCallback((direction: -1 | 1) => {
    setSceneStyle(current => {
      const currentIndex = SCENE_STYLES.indexOf(current);
      const nextIndex = (currentIndex + direction + SCENE_STYLES.length) % SCENE_STYLES.length;
      const next = SCENE_STYLES[nextIndex];
      window.api.settings.set('scene_style', next);
      return next;
    });
  }, []);
  const sceneLabels: Record<SceneStyle, { ru: string; en: string }> = {
    ninja: { ru: 'Ниндзя-помидорка', en: 'Tomato ninja' },
    chart: { ru: 'График активности', en: 'Activity chart' },
    orbit: { ru: 'Орбита фокуса', en: 'Focus orbit' },
    garden: { ru: 'Световой сад', en: 'Light garden' },
  };
  const sceneLabel = sceneLabels[sceneStyle][lang];

  return (
    <div className="app app-wide anim">
      <FloatingTomatoes active={timerState.status === 'running'} accentColor={accent} count={totalPomos} />

      {/* Time-up alert (system notifications get ignored): a contrasting flash
          and/or a scatter of tomatoes, per the time_up_effect setting. */}
      {flashing && <div className="time-up-flash" aria-hidden="true" />}
      <TomatoBurst trigger={burstKey} />

      {/* === Top bar === */}
      <header className="topbar app-drag">
        <div className="topbar-left app-no-drag">
          <img src={APP_ICON_URL} alt="" className="header-logo" width={22} height={22} />
          <span className="header-title header-title--brand">POMODORO</span>
        </div>

        <div className="topbar-right app-no-drag">
          <button className="header-lang" onClick={() => changeLang(lang === 'ru' ? 'en' : 'ru')}>
            {lang === 'ru' ? 'RU' : 'EN'} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {/* Кнопки окна существуют только в десктопе. */}
          <div className="window-controls" hidden={IS_WEB} style={IS_WEB ? { display: 'none' } : undefined}>
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
            onClick={() => handleModeClick('break')}>
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
          aria-label={timerReady ? `${minutes} ${lang === 'ru' ? 'минут' : 'minutes'} ${seconds} ${lang === 'ru' ? 'секунд' : 'seconds'}` : (lang === 'ru' ? 'Таймер загружается' : 'Timer is loading')}
          title={canScrub ? (lang === 'ru' ? 'Зажми минуты или секунды и тяни' : 'Hold minutes or seconds and drag') : undefined}
        >
          <span className="hero2-digits" ref={heroTimeRef}>{timeDisplay}</span>
          {canScrub && (
            <span className="scrub-zones" aria-hidden="true">
              <span
                className="scrub-hit scrub-hit--minutes"
                onPointerDown={onScrubDown(60)}
                onPointerMove={onScrubMove}
                onPointerUp={onScrubUp}
                onPointerCancel={onScrubUp}
              />
              <span
                className="scrub-hit scrub-hit--seconds"
                onPointerDown={onScrubDown(1)}
                onPointerMove={onScrubMove}
                onPointerUp={onScrubUp}
                onPointerCancel={onScrubUp}
              />
            </span>
          )}
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
            <button className="ctrl-rect ctrl-rect--play" onClick={handlePlayPause} disabled={!timerReady}
            style={{ background: accent, borderColor: accent, color: contrastColor(accent) }}>
            {timerState.status === 'running'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>}
            {timerState.status === 'running' ? (lang === 'ru' ? 'Пауза' : 'Pause') : (lang === 'ru' ? 'Старт' : 'Start')}
          </button>
        </div>
      ) : (
        <div className="controls-rect app-no-drag">
          <button className="ctrl-rect" onClick={handleReset} disabled={!timerReady}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 9 9"/><polyline points="1 17 3 21 7 19"/></svg>
            {lang === 'ru' ? 'Сброс' : 'Reset'}
          </button>
          <button className="ctrl-rect ctrl-rect--play" onClick={handlePlayPause} disabled={!timerReady}
            style={{ background: accent, borderColor: accent, color: contrastColor(accent) }}>
            {timerState.status === 'running'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>}
            {timerState.status === 'running' ? (lang === 'ru' ? 'Пауза' : 'Pause') : (lang === 'ru' ? 'Старт' : 'Start')}
          </button>
          <button className="ctrl-rect" onClick={handleSkip} disabled={!timerReady}>
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

      {/* === Scene: switch the animation directly on the main screen === */}
      {sceneOn && (
        <div className="scene-box app-no-drag">
          <button
            className="scene-arrow scene-arrow--prev"
            onClick={() => changeScene(-1)}
            aria-label={lang === 'ru' ? 'Предыдущая сцена' : 'Previous scene'}
            title={lang === 'ru' ? 'Предыдущая сцена' : 'Previous scene'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <Scene
            mode={isBreak ? 'break' : 'focus'}
            running={timerState.status === 'running'}
            idle={!!timerState.idle}
            accent={accent}
            style={sceneStyle}
            speed={sceneSpeed}
            summaryKey={summaryKey}
            status={timerState.status}
            lang={lang}
            progress={progress}
          />
          {(sceneStyle === 'ninja' || sceneStyle === 'chart') && (
            <span className="scene-style-label" aria-live="polite">{sceneLabel}</span>
          )}
          <button
            className="scene-arrow scene-arrow--next"
            onClick={() => changeScene(1)}
            aria-label={lang === 'ru' ? 'Следующая сцена' : 'Next scene'}
            title={lang === 'ru' ? 'Следующая сцена' : 'Next scene'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
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
            <Settings lang={lang} />
          </aside>
        )}
      </div>
    </div>
  );
}
