// === Timer Types ===
export type TimerMode = 'focus' | 'short_break' | 'long_break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed' | 'waiting';

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
}

export interface TimerCompletePayload {
  mode: TimerMode;
  nextMode: TimerMode;
  duration: number;
  autoStart: boolean;
}

// === Profile ===
export interface Profile {
  name: string;
  work_time: number;
  break_time: number;
  long_break_time: number;
  rounds: number;
  auto_start_break: boolean;
  auto_start_work: boolean;
  count_backwards: boolean;
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
  custom_accent: string;
}

// === Electron API (exposed via preload) ===
export interface ElectronAPI {
  timer: {
    start: () => Promise<{ ok: boolean }>;
    pause: () => Promise<{ ok: boolean }>;
    resume: () => Promise<{ ok: boolean }>;
    reset: () => Promise<{ ok: boolean }>;
    skip: () => Promise<{ ok: boolean }>;
    setMode: (mode: TimerMode) => Promise<{ ok: boolean }>;
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
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
