import { app, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { IPC } from '../shared/ipc-channels';
import type { DayCount, Stats, AppSettings, Profile } from '../shared/types';
import { DEFAULT_SETTINGS, DEFAULT_PROFILES } from '../shared/constants';

// Profile sync callback (set by index.ts to avoid circular imports)
let profileSyncFn: ((profile: Profile) => void) | null = null;
export function setProfileSyncCallback(fn: (profile: Profile) => void): void {
  profileSyncFn = fn;
}

// Settings cache invalidation callback (set by index.ts)
let settingsCacheInvalidator: (() => void) | null = null;
export function setSettingsCacheInvalidator(fn: () => void): void {
  settingsCacheInvalidator = fn;
}

let db: SqlJsDatabase | null = null;
const DB_PATH = path.join(app.getPath('userData'), 'memora-pomodoro.db');

// Initialize database
export async function initDB(): Promise<void> {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile TEXT NOT NULL DEFAULT 'Pomodoro',
      mode TEXT NOT NULL CHECK(mode IN ('focus','short_break','long_break')),
      duration_sec INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 1,
      started_at TEXT NOT NULL,
      finished_at TEXT
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(started_at)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      name TEXT PRIMARY KEY,
      work_time INTEGER NOT NULL DEFAULT 25,
      break_time INTEGER NOT NULL DEFAULT 5,
      long_break_time INTEGER NOT NULL DEFAULT 15,
      rounds INTEGER NOT NULL DEFAULT 4,
      auto_start_break INTEGER NOT NULL DEFAULT 1,
      auto_start_work INTEGER NOT NULL DEFAULT 0,
      count_backwards INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Seed default profiles
  for (const p of DEFAULT_PROFILES) {
    db.run(
      `INSERT OR IGNORE INTO profiles (name, work_time, break_time, long_break_time, rounds, auto_start_break, auto_start_work, count_backwards) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.name, p.work_time, p.break_time, p.long_break_time, p.rounds, p.auto_start_break ? 1 : 0, p.auto_start_work ? 1 : 0, p.count_backwards ? 1 : 0]
    );
  }

  // Seed default settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    db.run(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, JSON.stringify(value)]
    );
  }

  saveDB();
}

// Save DB to disk
function saveDB(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// === Session queries ===
export function saveSession(profile: string, mode: string, duration: number, completed: boolean, startedAt: string): void {
  if (!db) return;
  db.run(
    `INSERT INTO sessions (profile, mode, duration_sec, completed, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [profile, mode, duration, completed ? 1 : 0, startedAt, new Date().toISOString()]
  );
  saveDB();
}

export function getHistory(from: string, to: string): DayCount[] {
  if (!db) return [];
  const stmt = db.prepare(
    `SELECT date(started_at) as day, COUNT(*) as count
     FROM sessions
     WHERE mode = 'focus' AND completed = 1
       AND date(started_at) >= ? AND date(started_at) <= ?
     GROUP BY date(started_at)
     ORDER BY day`
  );
  stmt.bind([from, to]);
  const results: DayCount[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { day: string; count: number };
    results.push({ day: row.day, count: row.count });
  }
  stmt.free();
  return results;
}

export function getStats(): Stats {
  if (!db) return { totalPomodoros: 0, todayPomodoros: 0, currentStreak: 0, bestStreak: 0 };

  const total = (db.exec(`SELECT COUNT(*) FROM sessions WHERE mode='focus' AND completed=1`)[0]?.values[0]?.[0] as number) || 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = (db.exec(`SELECT COUNT(*) FROM sessions WHERE mode='focus' AND completed=1 AND date(started_at)='${today}'`)[0]?.values[0]?.[0] as number) || 0;

  // Streak calculation
  const days = db.exec(
    `SELECT DISTINCT date(started_at) as day FROM sessions WHERE mode='focus' AND completed=1 ORDER BY day DESC`
  )[0]?.values?.map((v: unknown[]) => v[0] as string) || [];

  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  const todayDate = new Date();

  for (let i = 0; i < days.length; i++) {
    const expected = new Date(todayDate);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (days[i] === expectedStr) {
      streak++;
    } else {
      if (i === 0 && streak === 0) {
        // Today doesn't have pomodoros, check yesterday
        continue;
      }
      if (currentStreak === 0) currentStreak = streak;
      bestStreak = Math.max(bestStreak, streak);
      streak = 0;
      // Don't break — continue to find best streak in history
    }
  }
  bestStreak = Math.max(bestStreak, streak);
  if (currentStreak === 0) currentStreak = streak;

  return { totalPomodoros: total, todayPomodoros: todayCount, currentStreak, bestStreak };
}

// === Settings ===
export function getAllSettings(): AppSettings {
  if (!db) return { ...DEFAULT_SETTINGS };
  const result: Record<string, unknown> = {};
  const rows = db.exec(`SELECT key, value FROM settings`);
  if (rows[0]) {
    for (const row of rows[0].values) {
      try { result[row[0] as string] = JSON.parse(row[1] as string); }
      catch { result[row[0] as string] = row[1]; }
    }
  }
  return { ...DEFAULT_SETTINGS, ...result } as AppSettings;
}

export function setSetting(key: string, value: unknown): void {
  if (!db) return;
  db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, JSON.stringify(value)]);
  saveDB();
}

// === Profiles ===
export function getAllProfiles(): Profile[] {
  if (!db) return [...DEFAULT_PROFILES];
  const rows = db.exec(`SELECT name, work_time, break_time, long_break_time, rounds, auto_start_break, auto_start_work, count_backwards FROM profiles ORDER BY created_at`);
  if (!rows[0] || rows[0].values.length === 0) return [...DEFAULT_PROFILES];
  return rows[0].values.map((r: unknown[]) => ({
    name: r[0] as string,
    work_time: r[1] as number,
    break_time: r[2] as number,
    long_break_time: r[3] as number,
    rounds: r[4] as number,
    auto_start_break: !!(r[5] as number),
    auto_start_work: !!(r[6] as number),
    count_backwards: !!(r[7] as number),
  }));
}

export function getActiveProfile(): Profile {
  const settings = getAllSettings();
  const profiles = getAllProfiles();
  return profiles.find(p => p.name === settings.active_profile) || profiles[0] || DEFAULT_PROFILES[0];
}

export function updateProfile(profile: Profile): void {
  if (!db) return;
  db.run(
    `INSERT OR REPLACE INTO profiles (name, work_time, break_time, long_break_time, rounds, auto_start_break, auto_start_work, count_backwards)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [profile.name, profile.work_time, profile.break_time, profile.long_break_time, profile.rounds, profile.auto_start_break ? 1 : 0, profile.auto_start_work ? 1 : 0, profile.count_backwards ? 1 : 0]
  );
  saveDB();
}

// === Export ===
function exportJSON(): string {
  if (!db) return '{}';
  const sessions = db.exec(`SELECT * FROM sessions WHERE mode='focus' AND completed=1 ORDER BY started_at`);
  const mapped = sessions[0]?.values.map((r: unknown[]) => ({
    profile: r[1], mode: r[2], duration_sec: r[3], completed: !!r[4], started_at: r[5], finished_at: r[6],
  })) || [];
  return JSON.stringify({ app: 'Memora Pomodoro', version: '1.0.0', exported_at: new Date().toISOString(), sessions: mapped, total_pomodoros: mapped.length }, null, 2);
}

function exportCSV(): string {
  if (!db) return '';
  const sessions = db.exec(`SELECT profile, mode, duration_sec, completed, started_at, finished_at FROM sessions ORDER BY started_at`);
  const header = 'profile,mode,duration_sec,completed,started_at,finished_at\n';
  const rows = sessions[0]?.values.map((r: unknown[]) => r.join(',')).join('\n') || '';
  return header + rows;
}

// === Register IPC handlers ===
export function registerDBIPC(): void {
  ipcMain.handle(IPC.DB_GET_HISTORY, (_e, from: string, to: string) => getHistory(from, to));
  ipcMain.handle(IPC.DB_GET_STATS, () => getStats());
  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => getAllSettings());
  ipcMain.handle(IPC.SETTINGS_SET, async (_e, key: string, value: unknown) => {
    setSetting(key, value);

    // Invalidate timer settings cache
    if (settingsCacheInvalidator) settingsCacheInvalidator();

    // Apply setting change in real-time
    try {
      const { BrowserWindow, app: electronApp } = await import('electron');

      switch (key) {
        case 'always_on_top': {
          // Apply only to main window (overlay is always on top by design)
          const wins = BrowserWindow.getAllWindows();
          wins.forEach(w => {
            if (!w.isDestroyed() && !w.isAlwaysOnTop()) {
              w.setAlwaysOnTop(value as boolean);
            }
          });
          break;
        }
        case 'launch_on_startup':
          electronApp.setLoginItemSettings({ openAtLogin: value as boolean });
          break;
        case 'overlay_opacity':
        case 'overlay_size':
        case 'overlay_show_bg':
        case 'overlay_show_seconds':
        case 'overlay_show_controls':
        case 'overlay_mode': {
          const { updateOverlaySettings } = await import('./overlay');
          updateOverlaySettings({ [key]: value });
          break;
        }
        case 'taskbar_progress': {
          if (!(value as boolean)) {
            BrowserWindow.getAllWindows().forEach(w => {
              if (!w.isDestroyed()) w.setProgressBar(-1);
            });
          }
          break;
        }
        // desktop_notifications, sound settings — checked at usage time
        case 'hotkey': {
          const { updateHotkey } = await import('./hotkeys');
          updateHotkey(value as string);
          break;
        }
      }
    } catch { /* ignore apply errors */ }

    return { ok: true };
  });

  ipcMain.handle(IPC.DB_EXPORT, async (_e, format: string) => {
    const content = format === 'csv' ? exportCSV() : exportJSON();
    const ext = format === 'csv' ? 'csv' : 'json';
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `memora-pomodoro-export.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  });

  ipcMain.handle(IPC.DB_RESET, () => {
    if (!db) return { deleted: 0 };
    const count = (db.exec(`SELECT COUNT(*) FROM sessions`)[0]?.values[0]?.[0] as number) || 0;
    db.run(`DELETE FROM sessions`);
    saveDB();
    return { deleted: count };
  });

  // YAPA import (placeholder — schema needs verification with real Yapa.db)
  ipcMain.handle(IPC.DB_IMPORT_YAPA, async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import YAPA database',
      filters: [{ name: 'SQLite DB', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (!filePaths?.length || !db) return { imported: 0 };

    try {
      const SQL = (await import('sql.js')).default;
      const sqlInit = await SQL();
      const yapaBuffer = fs.readFileSync(filePaths[0]);
      const yapaDb = new sqlInit.Database(yapaBuffer);

      // Try reading YAPA's PomodoroHistory table
      const rows = yapaDb.exec(`SELECT DateOfWork, Count FROM PomodoroHistory`);
      let imported = 0;
      if (rows[0]) {
        for (const row of rows[0].values) {
          const dateStr = row[0] as string;
          const count = row[1] as number;
          for (let i = 0; i < count; i++) {
            db.run(
              `INSERT INTO sessions (profile, mode, duration_sec, completed, started_at, finished_at) VALUES (?, 'focus', 1500, 1, ?, ?)`,
              ['Imported (YAPA)', dateStr, dateStr]
            );
            imported++;
          }
        }
        saveDB();
      }
      yapaDb.close();
      return { imported };
    } catch (err) {
      console.error('YAPA import failed:', err);
      return { imported: 0 };
    }
  });

  // === Profile IPC ===
  ipcMain.handle(IPC.PROFILE_GET_ALL, () => getAllProfiles());
  ipcMain.handle(IPC.PROFILE_GET_ACTIVE, () => getActiveProfile());
  ipcMain.handle(IPC.PROFILE_UPDATE, (_e, profile: Profile) => {
    updateProfile(profile);
    // Sync to timer if this is the active profile
    const settings = getAllSettings();
    if (profile.name === settings.active_profile && profileSyncFn) {
      profileSyncFn(profile);
    }
    return { ok: true };
  });
  ipcMain.handle(IPC.PROFILE_SET_ACTIVE, (_e, name: string) => {
    setSetting('active_profile', name);
    // Load and sync new active profile to timer
    const profile = getAllProfiles().find(p => p.name === name);
    if (profile && profileSyncFn) {
      profileSyncFn(profile);
    }
    return { ok: true };
  });
}
