// === Timer Types ===
// Two modes only: Фокус / Пауза. (Short vs. long breaks and rounds были
// убраны — сессии в БД мигрируются на 'break' в db.ts, миграция v4.)
export type TimerMode = 'focus' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed' | 'waiting';
// Countdown timer (Pomodoro) vs. count-up stopwatch.
export type TimerType = 'timer' | 'stopwatch';

export interface TimerState {
  status: TimerStatus;
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  completedPomos: number;
  totalSessionPomos: number;
  startedAt: string | null;
  profile: string;
  countBackwards: boolean;
}

export interface TimerTickPayload {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  status: TimerStatus;
  completedPomos: number;
  countBackwards: boolean;
  idle?: boolean; // pure-time: focus paused because the user is idle
  type: TimerType; // countdown timer vs. count-up stopwatch
  elapsed: number; // stopwatch: seconds counted up so far
}

export interface TimerCompletePayload {
  mode: TimerMode;
  nextMode: TimerMode;
  duration: number;
  autoStart: boolean;
  natural: boolean; // true on a real time-up, false on a manual skip
}

// Visual "time is up" alert shown in addition to (or instead of) ignored OS
// notifications.
export type TimeUpEffect = 'flash' | 'tomatoes' | 'both' | 'off';

// === Profile ===
// Only two durations exist now: Фокус and Пауза. Long breaks, rounds,
// auto-start and count-backwards were retired — the DB columns stay (with
// their defaults) but nothing reads them.
export interface Profile {
  name: string;
  work_time: number;
  break_time: number;
}

// === Session ===
export interface Session {
  id?: number;
  profile: string;
  mode: TimerMode;
  duration_sec: number;
  completed: boolean;
  started_at: string;
  finished_at: string | null;
}

// === Stats ===
export interface DayCount {
  day: string;
  count: number;
}

// Per-day focus totals for the weekly bar chart (count of pomodoros + total
// focus seconds, so a chart can show either pomodoros or time).
export interface DayStat {
  day: string;
  count: number;
  seconds: number;
}

export interface Stats {
  totalPomodoros: number;
  todayPomodoros: number;
  currentStreak: number;
  bestStreak: number;
}

// === Settings ===
export type PresetTheme = 'tomato' | 'ocean' | 'forest' | 'violet';
export type ThemeName = PresetTheme | 'custom';
export type Lang = 'ru' | 'en';
export type OverlayMode = 'pill' | 'compact' | 'bar';

export interface AppSettings {
  lang: Lang;
  theme: ThemeName;
  active_profile: string;
  always_on_top: boolean;
  minimize_to_tray: boolean;
  launch_on_startup: boolean;
  hotkey: string;
  taskbar_progress: boolean;
  desktop_notifications: boolean;
  overlay_opacity: number;
  overlay_size: number;
  overlay_show_bg: boolean;
  overlay_show_seconds: boolean;
  overlay_show_controls: boolean;
  overlay_mode: OverlayMode;
  overlay_visible: boolean;
  sound_volume: number;
  sound_notifications: boolean;
  sound_start: boolean;
  sound_repeat: boolean;
  sound_work: string;
  sound_break: string;
  // Appearance
  timer_font: string;
  show_animation: boolean;
  scene_on: boolean;   // ambient pixel scene under the timer (mockup: «сцена»)
  scene_style: string; // which scene animation: 'flight' | (future: 'battle' | 'run' | 'focus')
  scene_speed: number; // scene playback speed in percent (50–200)
  custom_accent: string;
  time_up_effect: TimeUpEffect;
  pure_time: boolean; // "чистое время" — auto-pause focus when the user is idle
  white_noise: string; // ambient background sound: 'off' | 'rain' | … (UI wired; audio asset pending)
  ticking: string;     // focus ticking: 'off' | 'low' | 'med' | 'high' (UI wired; audio asset pending)
}

// === Electron API (exposed via preload) ===
export interface ElectronAPI {
  timer: {
    getState: () => Promise<TimerTickPayload>;
    start: () => Promise<{ ok: boolean }>;
    pause: () => Promise<{ ok: boolean }>;
    resume: () => Promise<{ ok: boolean }>;
    reset: () => Promise<{ ok: boolean }>;
    skip: () => Promise<{ ok: boolean }>;
    setMode: (mode: TimerMode) => Promise<{ ok: boolean }>;
    setType: (type: TimerType) => Promise<{ ok: boolean }>;
    onTick: (cb: (data: TimerTickPayload) => void) => () => void;
    onComplete: (cb: (data: TimerCompletePayload) => void) => () => void;
  };
  settings: {
    getAll: () => Promise<AppSettings>;
    set: (key: string, value: unknown) => Promise<{ ok: boolean }>;
    onUpdate: (cb: (settings: Record<string, unknown>) => void) => () => void;
  };
  db: {
    getHistory: (from: string, to: string) => Promise<DayCount[]>;
    getWeekly: (from: string, to: string) => Promise<DayStat[]>;
    getStats: () => Promise<Stats>;
    exportData: (format: 'json' | 'csv') => Promise<void>;
    importYapa: () => Promise<{ imported: number }>;
    reset: () => Promise<{ deleted: number }>;
  };
  system: {
    setLang: (lang: Lang) => Promise<void>;
    toggleOverlay: () => Promise<void>;
    getVersion: () => Promise<string>;
    onPlaySound: (cb: (data: { file: string; volume: number; times?: number }) => void) => () => void;
  };
  sound: {
    pick: () => Promise<string | null>;
    read: (file: string) => Promise<Uint8Array | null>;
  };
  overlay: {
    resize: (width: number, height: number) => Promise<void>;
  };
  profile: {
    getAll: () => Promise<Profile[]>;
    getActive: () => Promise<Profile>;
    update: (profile: Profile) => Promise<{ ok: boolean }>;
    setActive: (name: string) => Promise<{ ok: boolean }>;
    create: (name?: string) => Promise<{ ok: boolean; profile?: Profile }>;
  };
  window: {
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    toOverlay: () => Promise<void>;
    toMain: () => Promise<void>;
    setSidebar: (open: boolean) => Promise<void>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
