import type { Profile, AppSettings, ThemeName, PresetTheme } from './types';

// Default profiles
export const DEFAULT_PROFILES: Profile[] = [
  {
    name: 'Pomodoro',
    work_time: 25,
    break_time: 5,
    long_break_time: 15,
    rounds: 4,
    auto_start_break: true,
    auto_start_work: false,
    count_backwards: true,
  },
  {
    name: 'Deep Work',
    work_time: 50,
    break_time: 10,
    long_break_time: 30,
    rounds: 4,
    auto_start_break: true,
    auto_start_work: false,
    count_backwards: true,
  },
];

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  lang: 'ru',
  theme: 'tomato',
  active_profile: 'Pomodoro',
  always_on_top: false,
  minimize_to_tray: true,
  launch_on_startup: false,
  hotkey: 'CommandOrControl+Shift+P',
  taskbar_progress: true,
  desktop_notifications: true,
  overlay_opacity: 90,
  overlay_size: 100,
  overlay_show_bg: true,
  overlay_show_seconds: true,
  overlay_show_controls: true,
  overlay_mode: 'compact',
  overlay_visible: false,
  sound_volume: 70,
  sound_notifications: true,
  sound_start: false,
  sound_repeat: false,
  sound_work: 'bell-gentle.wav',
  sound_break: 'chime-soft.wav',
  timer_font: 'Outfit',
  show_animation: true,
  custom_accent: '#E05A33',
};

// Theme colors (presets only; 'custom' resolves to AppSettings.custom_accent).
export const THEME_COLORS: Record<PresetTheme, { accent: string; dim: string; glow: string }> = {
  tomato:  { accent: '#E05A33', dim: 'rgba(224,90,51,0.15)', glow: 'rgba(224,90,51,0.25)' },
  ocean:   { accent: '#378ADD', dim: 'rgba(55,138,221,0.15)', glow: 'rgba(55,138,221,0.25)' },
  forest:  { accent: '#1D9E75', dim: 'rgba(29,158,117,0.15)', glow: 'rgba(29,158,117,0.25)' },
  violet:  { accent: '#7F77DD', dim: 'rgba(127,119,221,0.15)', glow: 'rgba(127,119,221,0.25)' },
};

// Hex → rgba helper for deriving dim/glow from a custom accent.
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(224,90,51,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Resolve the accent triple for any theme, including 'custom'.
export function themeColors(theme: ThemeName, customAccent: string): { accent: string; dim: string; glow: string } {
  if (theme === 'custom') {
    return { accent: customAccent, dim: hexToRgba(customAccent, 0.15), glow: hexToRgba(customAccent, 0.25) };
  }
  return THEME_COLORS[theme] ?? THEME_COLORS.tomato;
}

// Break color (always green regardless of theme)
export const BREAK_COLOR = '#1D9E75';

// Ring geometry
export const RING_RADIUS = 90;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // 565.49

// Timer limits
export const TIMER_LIMITS = {
  work: { min: 1, max: 60 },
  break: { min: 1, max: 30 },
  long_break: { min: 1, max: 60 },
  rounds: { min: 1, max: 8 },
};

// Contribution grid levels (pomodoros per day)
export const GRID_LEVELS = [
  { min: 0, max: 0, class: '' },
  { min: 1, max: 2, class: 'l1' },
  { min: 3, max: 4, class: 'l2' },
  { min: 5, max: 6, class: 'l3' },
  { min: 7, max: Infinity, class: 'l4' },
];

// Window dimensions
export const MAIN_WINDOW = { width: 400, height: 750 };
export const OVERLAY_SIZES = {
  pill:    { width: 200, height: 42 },
  compact: { width: 300, height: 64 },
  bar:     { width: 420, height: 40 },
} as const;
