import { ipcMain, BrowserWindow, Notification, powerMonitor } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { TimerMode, TimerStatus, TimerType, TimerTickPayload, TimerCompletePayload, Profile, AppSettings } from '../shared/types';
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
let idlePaused = false; // "чистое время": focus paused because the user is idle
const IDLE_THRESHOLD = 10; // seconds of no system input before pausing focus

// Countdown timer vs. count-up stopwatch.
let timerType: TimerType = 'timer';
let elapsed = 0; // stopwatch: seconds counted up (paused while idle in pure-time)
const STOPWATCH_MIN_SAVE = 60; // don't record stopwatch sessions shorter than this
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

export function getTimerState(): TimerTickPayload {
  const isSW = timerType === 'stopwatch';
  return {
    timeLeft: isSW ? 0 : timeLeft,
    totalTime: isSW ? 0 : totalTime,
    mode,
    status,
    completedPomos,
    countBackwards: true, // the timer always counts down now
    idle: idlePaused,
    type: timerType,
    elapsed,
  };
}

// Broadcast tick to all windows
function broadcastTick(): void {
  const payload = getTimerState();
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(IPC.TIMER_TICK, payload);
  });
  // Update tray (stopwatch has no countdown — show elapsed instead).
  if (trayUpdateFn) trayUpdateFn(status, timerType === 'stopwatch' ? elapsed : timeLeft, mode);
}

// Broadcast a completion event (used by the stopwatch when a session is saved,
// so the renderer refreshes its stats). natural=false → no "time-up" alert.
function broadcastComplete(natural: boolean): void {
  const payload: TimerCompletePayload = {
    mode: 'focus', nextMode: 'focus', duration: elapsed, autoStart: false, natural,
  };
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send(IPC.TIMER_COMPLETE, payload);
  });
}

// Persist an accumulated stopwatch session (as a focus session) if it's long
// enough to be meaningful, then clear the stopwatch. Returns whether it saved.
function saveStopwatchIfAny(): boolean {
  const save = elapsed >= STOPWATCH_MIN_SAVE && !!startedAt;
  if (save) saveSession(profile.name, 'focus', elapsed, true, startedAt as string);
  elapsed = 0;
  startedAt = null;
  return save;
}

// Broadcast a sound cue to all windows (renderer plays it `times` times).
function broadcastSound(file: string, volume: number, times = 1): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.PLAY_SOUND, { file, volume, times });
    }
  });
}

// Get duration for mode in seconds. Durations are stored as MINUTES and may
// be fractional (25.5 = 25:30) — the digits scrubber sets seconds too.
function getDuration(m: TimerMode): number {
  return Math.round((m === 'focus' ? profile.work_time : profile.break_time) * 60);
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
  idlePaused = false;

  const wasFocus = mode === 'focus';
  const countsAsPomo = wasFocus && natural;

  // Count + record a naturally completed focus session.
  if (countsAsPomo) {
    completedPomos++;
    totalSessionPomos++;
    if (startedAt) saveSession(profile.name, mode, totalTime, true, startedAt);
  }

  // Two modes only — they simply alternate (rounds/long breaks are gone).
  const nextMode: TimerMode = wasFocus ? 'break' : 'focus';

  // Auto-start is retired (manager: «убираем автостарт») — the next interval
  // always waits for the user to press play.
  const autoStart = false;

  const payload: TimerCompletePayload = {
    mode,
    nextMode,
    duration: totalTime - timeLeft,
    autoStart,
    natural,
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

  // OS-level attention: flash the taskbar button when the user isn't looking,
  // so a finished interval is noticed even if the window is minimized / behind
  // another app (system notifications get ignored). No-op for the skipTaskbar
  // overlay.
  if (natural) {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed() && !win.isFocused()) win.flashFrame(true);
    });
  }

  // Switch mode
  mode = nextMode;
  totalTime = getDuration(mode);
  timeLeft = totalTime;
  startedAt = null;

  if (autoStart) {
    startTimer();
  } else {
    status = 'waiting';
    // Clear the taskbar progress — the interval finished and is waiting for the
    // user to start the next one (otherwise the bar stays frozen near full).
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.setProgressBar(-1);
    });
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
  idlePaused = false;
  startedAt = new Date().toISOString();
  expectedTick = Date.now() + 1000;

  intervalId = setInterval(() => {
    const now = Date.now();
    const settings = getSettings();
    const pureTime = settings.pure_time !== false; // "чистое время" — default on

    // Pure-time: don't count focus seconds while the user is idle (no system-wide
    // keyboard/mouse activity for IDLE_THRESHOLD s). getSystemIdleTime is OS-wide,
    // so working in ANY app counts as active — only stepping away pauses it.
    if (pureTime && mode === 'focus') {
      let idle = 0;
      try { idle = powerMonitor.getSystemIdleTime(); } catch { idle = 0; }
      if (idle >= IDLE_THRESHOLD) {
        idlePaused = true;
        expectedTick = now + 1000; // keep current so the idle gap isn't "caught up"
        broadcastTick();
        return; // this second does not count
      }
      if (idlePaused) idlePaused = false; // active again → resume
    }

    // Drift correction after system sleep. In pure-time the gap was idle/sleep,
    // which must NOT count, so skip the catch-up there.
    const drift = now - expectedTick;
    if (drift > 2000 && !pureTime) {
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

// Count-up stopwatch loop. Honors "чистое время" exactly like focus: seconds
// only accrue while the user is active (system-wide). No target, no completion.
function startStopwatch(): void {
  status = 'running';
  idlePaused = false;
  if (startedAt === null) startedAt = new Date().toISOString(); // session start, kept across pause/resume
  expectedTick = Date.now() + 1000;

  intervalId = setInterval(() => {
    const now = Date.now();
    const settings = getSettings();
    const pureTime = settings.pure_time !== false;

    if (pureTime) {
      let idle = 0;
      try { idle = powerMonitor.getSystemIdleTime(); } catch { idle = 0; }
      if (idle >= IDLE_THRESHOLD) {
        idlePaused = true;
        expectedTick = now + 1000;
        broadcastTick();
        return; // don't count this second
      }
      if (idlePaused) idlePaused = false;
    }

    // Catch up after system sleep only when NOT pure-time (idle/sleep mustn't count).
    const drift = now - expectedTick;
    if (drift > 2000 && !pureTime) elapsed += Math.floor(drift / 1000);
    expectedTick = now + 1000;

    elapsed++;
    broadcastTick();
  }, 1000);

  broadcastTick();
}

// === Public action functions (used by IPC + tray) ===
export function timerStart(): { ok: boolean } {
  if (timerType === 'stopwatch') {
    if (status !== 'running') startStopwatch();
    return { ok: true };
  }
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
    if (timerType === 'stopwatch') startStopwatch();
    else startTimer();
  }
  return { ok: true };
}

export function timerReset(): { ok: boolean } {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  idlePaused = false;

  if (timerType === 'stopwatch') {
    // Reset = finish the stopwatch: bank the session, then clear to zero.
    const saved = saveStopwatchIfAny();
    status = 'idle';
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.setProgressBar(-1);
    });
    broadcastTick();
    if (saved) broadcastComplete(false); // refresh stats without a time-up alert
    return { ok: true };
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

// Switch between countdown timer and stopwatch. Banks a running stopwatch
// session before leaving it.
export function timerSetType(t: TimerType): { ok: boolean } {
  if (t === timerType) return { ok: true };
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  idlePaused = false;

  let savedSW = false;
  if (timerType === 'stopwatch') savedSW = saveStopwatchIfAny();

  timerType = t;
  status = 'idle';
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.setProgressBar(-1);
  });

  if (t === 'stopwatch') {
    elapsed = 0;
    startedAt = null;
  } else {
    mode = 'focus';
    totalTime = getDuration(mode);
    timeLeft = totalTime;
  }

  broadcastTick();
  if (savedSW) broadcastComplete(false);
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
  ipcMain.handle(IPC.TIMER_GET_STATE, () => getTimerState());
  ipcMain.handle(IPC.TIMER_START, () => timerStart());
  ipcMain.handle(IPC.TIMER_PAUSE, () => timerPause());
  ipcMain.handle(IPC.TIMER_RESUME, () => timerResume());
  ipcMain.handle(IPC.TIMER_RESET, () => timerReset());
  ipcMain.handle(IPC.TIMER_SKIP, () => timerSkip());
  ipcMain.handle(IPC.TIMER_SET_MODE, (_e, m: TimerMode) => timerSetMode(m));
  ipcMain.handle(IPC.TIMER_SET_TYPE, (_e, t: TimerType) => timerSetType(t));
}

// Set active profile
export function setProfile(p: Profile): void {
  profile = { ...p };
  // Apply the new durations to a not-yet-running interval (idle OR waiting for
  // the next one), so editing the profile takes effect immediately instead of
  // only after a reset.
  if (status === 'idle' || status === 'waiting') {
    totalTime = getDuration(mode);
    timeLeft = totalTime;
    broadcastTick();
  }
}
