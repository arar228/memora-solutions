import { ipcMain, BrowserWindow, Notification } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { TimerMode, TimerStatus, TimerTickPayload, TimerCompletePayload, Profile, AppSettings } from '../shared/types';
import { DEFAULT_PROFILES } from '../shared/constants';
import { saveSession, getAllSettings } from './db';

let status: TimerStatus = 'idle';
let mode: TimerMode = 'focus';
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let completedPomos = 0;
let totalSessionPomos = 0;
let startedAt: string | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let expectedTick = 0; // for drift correction
let trayUpdateFn: ((status: TimerStatus, timeLeft: number, mode: TimerMode) => void) | null = null;

// Cached settings (updated via refreshSettingsCache)
let cachedSettings: AppSettings | null = null;

export function refreshSettingsCache(): void {
  cachedSettings = getAllSettings();
}

function getSettings(): AppSettings {
  if (!cachedSettings) cachedSettings = getAllSettings();
  return cachedSettings;
}

// Called by index.ts to set tray updater (avoids circular import)
export function setTrayUpdater(fn: (status: TimerStatus, timeLeft: number, mode: TimerMode) => void): void {
  trayUpdateFn = fn;
}

// Active profile
let profile: Profile = { ...DEFAULT_PROFILES[0] };

// Broadcast tick to all windows
function broadcastTick(): void {
  const payload: TimerTickPayload = {
    timeLeft,
    totalTime,
    mode,
    status,
    completedPomos,
    countBackwards: profile.count_backwards,
  };
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(IPC.TIMER_TICK, payload);
  });
  // Update tray
  if (trayUpdateFn) trayUpdateFn(status, timeLeft, mode);
}

// Broadcast a sound cue to all windows (renderer plays it `times` times).
function broadcastSound(file: string, volume: number, times = 1): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.PLAY_SOUND, { file, volume, times });
    }
  });
}

// Get duration for mode in seconds
function getDuration(m: TimerMode): number {
  switch (m) {
    case 'focus': return profile.work_time * 60;
    case 'short_break': return profile.break_time * 60;
    case 'long_break': return profile.long_break_time * 60;
  }
}

// Complete current interval.
// `natural` = the interval ran down to zero on its own. A *skipped* focus
// (natural=false) must NOT count as a finished pomodoro: it's neither saved to
// the DB/grid nor counted toward the round, and fires no completion sound /
// notification.
function completeInterval(natural = true): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  const wasFocus = mode === 'focus';
  const countsAsPomo = wasFocus && natural;

  // Count + record a naturally completed focus session.
  if (countsAsPomo) {
    completedPomos++;
    totalSessionPomos++;
    if (startedAt) saveSession(profile.name, mode, totalTime, true, startedAt);
  }

  // Decide the next mode from the (possibly updated) round counter.
  let nextMode: TimerMode;
  if (wasFocus) {
    if (completedPomos >= profile.rounds) {
      nextMode = 'long_break';
      completedPomos = 0; // start a fresh cycle of rounds
    } else {
      nextMode = 'short_break';
    }
  } else {
    nextMode = 'focus';
  }

  const autoStart = wasFocus ? profile.auto_start_break : profile.auto_start_work;

  const payload: TimerCompletePayload = {
    mode,
    nextMode,
    duration: totalTime - timeLeft,
    autoStart,
  };

  // Desktop notification + sound only on a natural completion (skipping is a
  // deliberate user action — no "complete!" alert).
  try {
    const s = getSettings();
    if (natural && s.desktop_notifications) {
      const isRu = s.lang === 'ru';
      const title = mode === 'focus'
        ? (isRu ? 'Фокус завершён!' : 'Focus complete!')
        : (isRu ? 'Перерыв окончен!' : 'Break is over!');
      const body = mode === 'focus'
        ? (isRu ? `Отдохните ${profile.break_time} минут` : `Take a ${profile.break_time} min break`)
        : (isRu ? 'Время работать!' : 'Time to work!');
      new Notification({ title, body }).show();
    }

    // Play completion sound (repeat the work sound if enabled).
    if (natural && s.sound_notifications) {
      const soundFile = wasFocus ? s.sound_work : s.sound_break;
      broadcastSound(soundFile, s.sound_volume / 100, wasFocus && s.sound_repeat ? 2 : 1);
    }
  } catch { /* notifications may not be available */ }

  // Broadcast completion
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(IPC.TIMER_COMPLETE, payload);
  });

  // Switch mode
  mode = nextMode;
  totalTime = getDuration(mode);
  timeLeft = totalTime;
  startedAt = null;

  if (autoStart) {
    startTimer();
  } else {
    status = 'waiting';
    broadcastTick();
  }
}

// Start the timer
function startTimer(): void {
  // Start cue on a fresh interval (timeLeft===totalTime), not on resume.
  if (timeLeft === totalTime) {
    try {
      const s = getSettings();
      if (s.sound_notifications && s.sound_start) {
        broadcastSound(mode === 'focus' ? s.sound_work : s.sound_break, s.sound_volume / 100, 1);
      }
    } catch { /* ignore */ }
  }
  status = 'running';
  startedAt = new Date().toISOString();
  expectedTick = Date.now() + 1000;

  intervalId = setInterval(() => {
    // Drift correction
    const now = Date.now();
    const drift = now - expectedTick;
    if (drift > 2000) {
      // System was asleep — correct timeLeft
      const missedSeconds = Math.floor(drift / 1000);
      timeLeft = Math.max(0, timeLeft - missedSeconds);
    }
    expectedTick = now + 1000;

    timeLeft--;

    if (timeLeft <= 0) {
      timeLeft = 0;
      broadcastTick();
      completeInterval();
      return;
    }

    broadcastTick();

    // Update taskbar progress (uses cached settings)
    try {
      const s = getSettings();
      if (s.taskbar_progress) {
        const progress = 1 - timeLeft / totalTime;
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.setProgressBar(progress);
          }
        });
      }
    } catch { /* ignore */ }
  }, 1000);

  broadcastTick();
}

// === Public action functions (used by IPC + tray) ===
export function timerStart(): { ok: boolean } {
  if (status === 'idle' || status === 'waiting') {
    if (status === 'idle') {
      totalTime = getDuration(mode);
      timeLeft = totalTime;
    }
    startTimer();
  }
  return { ok: true };
}

export function timerPause(): { ok: boolean } {
  if (status === 'running' && intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    status = 'paused';
    broadcastTick();
  }
  return { ok: true };
}

export function timerResume(): { ok: boolean } {
  if (status === 'paused') {
    startTimer();
  }
  return { ok: true };
}

export function timerReset(): { ok: boolean } {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  status = 'idle';
  timeLeft = getDuration(mode);
  totalTime = timeLeft;
  startedAt = null;
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.setProgressBar(-1);
  });
  broadcastTick();
  return { ok: true };
}

export function timerSkip(): { ok: boolean } {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  completeInterval(false); // skip — don't count as a finished pomodoro
  return { ok: true };
}

export function timerSetMode(newMode: TimerMode): { ok: boolean } {
  if (status !== 'idle' && status !== 'waiting') return { ok: false };
  mode = newMode;
  totalTime = getDuration(mode);
  timeLeft = totalTime;
  status = 'idle';
  broadcastTick();
  return { ok: true };
}

// Register IPC handlers
export function registerTimerIPC(): void {
  ipcMain.handle(IPC.TIMER_START, () => timerStart());
  ipcMain.handle(IPC.TIMER_PAUSE, () => timerPause());
  ipcMain.handle(IPC.TIMER_RESUME, () => timerResume());
  ipcMain.handle(IPC.TIMER_RESET, () => timerReset());
  ipcMain.handle(IPC.TIMER_SKIP, () => timerSkip());
  ipcMain.handle(IPC.TIMER_SET_MODE, (_e, m: TimerMode) => timerSetMode(m));
}

// Set active profile
export function setProfile(p: Profile): void {
  profile = { ...p };
  if (status === 'idle') {
    totalTime = getDuration(mode);
    timeLeft = totalTime;
    broadcastTick();
  }
}
