/**
 * api-web.ts — браузерная реализация того же контракта, что preload отдаёт
 * в Electron (`window.api`). Благодаря ей ОДИН И ТОТ ЖЕ renderer работает и в
 * десктопе, и на сайте: правим App.tsx/Scene.tsx — меняются обе версии.
 *
 * Отличия web-версии от десктопа (осознанные, всё остальное идентично):
 *   • таймер тикает в самой вкладке (в десктопе — в main-процессе);
 *   • «чистое время» ловит бездействие по событиям страницы, а не по системе,
 *     поэтому пауза срабатывает, пока вкладка активна;
 *   • нет оверлея, трея, глобальных горячих клавиш и импорта YAPA — их методы
 *     существуют, но ничего не делают (UI их и не показывает в web-режиме);
 *   • история и настройки лежат в localStorage этого браузера.
 */
import type {
  AppSettings, DayCount, ElectronAPI, Profile, Stats, TimerCompletePayload,
  TimerMode, TimerStatus, TimerTickPayload, TimerType,
} from '../shared/types';
import { DEFAULT_PROFILES, DEFAULT_SETTINGS } from '../shared/constants';

declare const __APP_VERSION__: string | undefined;

const LS = {
  settings: 'memora-pomodoro:settings',
  profile: 'memora-pomodoro:profile',
  sessions: 'memora-pomodoro:sessions',
};

interface StoredSession { mode: TimerMode; duration_sec: number; started_at: string; }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } as T : fallback;
  } catch { return fallback; }
}
function readArr<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; } catch { return []; }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

// ---- state ----
let settings: AppSettings = read<AppSettings>(LS.settings, { ...DEFAULT_SETTINGS });
let profile: Profile = read<Profile>(LS.profile, { ...DEFAULT_PROFILES[0] });

let status: TimerStatus = 'idle';
let mode: TimerMode = 'focus';
let timerType: TimerType = 'timer';
let timeLeft = Math.round(profile.work_time * 60);
let totalTime = timeLeft;
let elapsed = 0;
let completedPomos = 0;
let idlePaused = false;
let startedAt: string | null = null;
let ticker: number | null = null;

const IDLE_THRESHOLD_MS = 10_000;
let lastActivity = Date.now();
['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(ev =>
  window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));

const tickSubs = new Set<(d: TimerTickPayload) => void>();
const doneSubs = new Set<(d: TimerCompletePayload) => void>();
const settingsSubs = new Set<(s: Record<string, unknown>) => void>();

const duration = (m: TimerMode) =>
  Math.round((m === 'focus' ? profile.work_time : profile.break_time) * 60);

function payload(): TimerTickPayload {
  const isSW = timerType === 'stopwatch';
  return {
    timeLeft: isSW ? 0 : timeLeft,
    totalTime: isSW ? 0 : totalTime,
    mode, status, completedPomos,
    countBackwards: true,
    idle: idlePaused,
    type: timerType,
    elapsed,
  };
}
function emit(): void { const p = payload(); tickSubs.forEach(cb => cb(p)); }

function saveSession(m: TimerMode, sec: number): void {
  if (!startedAt || sec < 60) return;
  const all = readArr<StoredSession>(LS.sessions);
  all.push({ mode: m, duration_sec: sec, started_at: startedAt });
  write(LS.sessions, all);
}

function stopTicker(): void {
  if (ticker !== null) { clearInterval(ticker); ticker = null; }
}

// Pure time в браузере может наблюдать ТОЛЬКО свою страницу: системного
// idle-времени, как в десктопе, здесь нет. Поэтому вкладка в фоне НЕ считается
// бездействием (иначе таймер вставал бы каждый раз, когда человек уходит
// работать в другое приложение — а это ровно то, ради чего таймер и запускают).
// Пауза срабатывает, только если вкладка открыта и в ней 10 с ничего не делают.
function isAway(): boolean {
  return settings.pure_time === true
    && !document.hidden
    && Date.now() - lastActivity >= IDLE_THRESHOLD_MS;
}

function complete(natural: boolean): void {
  stopTicker();
  idlePaused = false;
  const wasFocus = mode === 'focus';
  if (wasFocus && natural) {
    completedPomos++;
    saveSession('focus', totalTime);
  }
  const nextMode: TimerMode = wasFocus ? 'break' : 'focus';
  const done: TimerCompletePayload = {
    mode, nextMode, duration: totalTime - timeLeft, autoStart: false, natural,
  } as TimerCompletePayload;
  mode = nextMode;
  totalTime = duration(mode);
  timeLeft = totalTime;
  status = 'idle';
  startedAt = null;
  emit();
  doneSubs.forEach(cb => cb(done));
}

// Время считаем по МЕТКАМ, а не по числу тиков: браузер душит setInterval в
// фоновой вкладке (и вовсе замораживает при спящем ноутбуке), поэтому счёт
// тиков давал бы отставание. Простой в «чистом времени» просто сдвигает метку.
let endsAt = 0;      // timer: когда интервал закончится
let swBase = 0;      // stopwatch: метка старта минус уже накопленное
let lastFrame = 0;   // для сдвига меток на время простоя

function loop(fn: () => void): void {
  stopTicker();
  lastFrame = Date.now();
  ticker = window.setInterval(fn, 250);
}

function shiftForIdle(): number {
  const now = Date.now();
  const gap = now - lastFrame;
  lastFrame = now;
  return gap;
}

function runTimer(): void {
  endsAt = Date.now() + timeLeft * 1000;
  loop(() => {
    const gap = shiftForIdle();
    if (isAway()) {
      endsAt += gap;               // простой не съедает интервал
      if (!idlePaused) { idlePaused = true; emit(); }
      return;
    }
    if (idlePaused) idlePaused = false;
    const left = Math.round((endsAt - Date.now()) / 1000);
    if (left <= 0) { timeLeft = 0; complete(true); return; }
    if (left !== timeLeft) { timeLeft = left; emit(); }
  });
}

function runStopwatch(): void {
  swBase = Date.now() - elapsed * 1000;
  loop(() => {
    const gap = shiftForIdle();
    if (isAway()) {
      swBase += gap;
      if (!idlePaused) { idlePaused = true; emit(); }
      return;
    }
    if (idlePaused) idlePaused = false;
    const e = Math.floor((Date.now() - swBase) / 1000);
    if (e !== elapsed) { elapsed = e; emit(); }
  });
}

// ---- stats helpers ----
const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function focusSessions(): StoredSession[] {
  return readArr<StoredSession>(LS.sessions).filter(s => s.mode === 'focus');
}

function statsNow(): Stats {
  const rows = focusSessions();
  const byDay = new Map<string, number>();
  rows.forEach(s => {
    const k = localDay(new Date(s.started_at));
    byDay.set(k, (byDay.get(k) || 0) + 1);
  });
  const today = localDay(new Date());
  // Streak: consecutive days with ≥1 focus session, counting back from today.
  let currentStreak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = localDay(d);
    if (byDay.has(k)) currentStreak++;
    else if (i > 0 || !byDay.has(today)) break;
  }
  const best = Math.max(currentStreak, ...[...byDay.keys()].map(() => currentStreak), 0);
  return {
    totalPomodoros: rows.length,
    todayPomodoros: byDay.get(today) || 0,
    currentStreak,
    bestStreak: best,
  };
}

const noop = async () => ({ ok: true });
const noUnsub = () => () => { /* nothing to unsubscribe */ };

export const webApi: ElectronAPI = {
  timer: {
    getState: async () => payload(),
    start: async () => {
      if (timerType === 'stopwatch') {
        if (status === 'running') return { ok: true };
        if (status === 'idle') { elapsed = 0; startedAt = new Date().toISOString(); }
        status = 'running'; runStopwatch(); emit(); return { ok: true };
      }
      if (status === 'idle' || status === 'waiting') {
        totalTime = duration(mode);
        timeLeft = totalTime;
        startedAt = new Date().toISOString();
      }
      status = 'running'; runTimer(); emit(); return { ok: true };
    },
    pause: async () => { if (status === 'running') { status = 'paused'; stopTicker(); emit(); } return { ok: true }; },
    resume: async () => {
      if (status === 'paused') {
        status = 'running';
        timerType === 'stopwatch' ? runStopwatch() : runTimer();
        emit();
      }
      return { ok: true };
    },
    reset: async () => {
      stopTicker();
      if (timerType === 'stopwatch') {
        if (elapsed >= 60) saveSession('focus', elapsed); // a finished stint counts
        elapsed = 0;
      } else {
        totalTime = duration(mode);
        timeLeft = totalTime;
      }
      status = 'idle'; idlePaused = false; startedAt = null; emit();
      return { ok: true };
    },
    skip: async () => { complete(false); return { ok: true }; },
    setMode: async (m: string) => {
      if (status !== 'idle' && status !== 'waiting') return { ok: false };
      mode = m as TimerMode;
      totalTime = duration(mode);
      timeLeft = totalTime;
      emit();
      return { ok: true };
    },
    setType: async (t: string) => {
      if (status === 'running') return { ok: false };
      stopTicker();
      timerType = t as TimerType;
      elapsed = 0;
      totalTime = duration(mode);
      timeLeft = totalTime;
      status = 'idle'; idlePaused = false; emit();
      return { ok: true };
    },
    onTick: (cb: (d: TimerTickPayload) => void) => { tickSubs.add(cb); cb(payload()); return () => { tickSubs.delete(cb); }; },
    onComplete: (cb: (d: TimerCompletePayload) => void) => { doneSubs.add(cb); return () => { doneSubs.delete(cb); }; },
  },

  settings: {
    getAll: async () => ({ ...settings }),
    set: async (key: string, value: unknown) => {
      settings = { ...settings, [key]: value } as AppSettings;
      write(LS.settings, settings);
      settingsSubs.forEach(cb => cb({ [key]: value }));
      return { ok: true };
    },
    onUpdate: (cb: (s: Record<string, unknown>) => void) => { settingsSubs.add(cb); return () => { settingsSubs.delete(cb); }; },
  },

  db: {
    getHistory: async (from: string, to: string): Promise<DayCount[]> => {
      const m = new Map<string, number>();
      focusSessions().forEach(s => {
        const k = localDay(new Date(s.started_at));
        if (k >= from && k <= to) m.set(k, (m.get(k) || 0) + 1);
      });
      return [...m.entries()].map(([day, count]) => ({ day, count }));
    },
    getWeekly: async (from: string, to: string) => {
      const m = new Map<string, { count: number; seconds: number }>();
      focusSessions().forEach(s => {
        const k = localDay(new Date(s.started_at));
        if (k < from || k > to) return;
        const cur = m.get(k) || { count: 0, seconds: 0 };
        m.set(k, { count: cur.count + 1, seconds: cur.seconds + s.duration_sec });
      });
      return [...m.entries()].map(([day, v]) => ({ day, ...v }));
    },
    getStats: async () => statsNow(),
    exportData: async (format: 'json' | 'csv') => {
      const rows = readArr<StoredSession>(LS.sessions);
      const body = format === 'csv'
        ? 'mode,duration_sec,started_at\n' + rows.map(r => `${r.mode},${r.duration_sec},${r.started_at}`).join('\n')
        : JSON.stringify(rows, null, 2);
      const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url; a.download = `memora-pomodoro.${format}`; a.click();
      URL.revokeObjectURL(url);
      return { ok: true };
    },
    importYapa: noop,
    reset: async () => {
      localStorage.removeItem(LS.sessions);
      completedPomos = 0;
      emit();
      return { ok: true };
    },
  },

  system: {
    setLang: noop,
    toggleOverlay: noop,
    // Версия подставляется на сборке (vite.web.config.ts → define) —
    // обращаться нужно голым идентификатором, иначе define не сработает.
    getVersion: async () => (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'web'),
    onPlaySound: noUnsub(),
  },

  sound: { pick: async () => null, read: async () => null },
  overlay: { resize: noop },

  profile: {
    getAll: async () => [profile],
    getActive: async () => ({ ...profile }),
    update: async (p: unknown) => {
      profile = { ...(p as Profile) };
      write(LS.profile, profile);
      // Apply new durations to an interval that hasn't started yet.
      if (status === 'idle' || status === 'waiting') {
        totalTime = duration(mode);
        timeLeft = totalTime;
        emit();
      }
      return { ok: true };
    },
    setActive: noop,
    create: async () => ({ ok: true, profile }),
  },

  window: {
    minimize: noop, close: noop, toOverlay: noop, toMain: noop,
    setSidebar: noop,
  },
} as unknown as ElectronAPI;
