import { app, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { IPC } from '../shared/ipc-channels';
import type { DayCount, DayStat, Stats, AppSettings, Profile } from '../shared/types';
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

  // Create tables. Modes are 'focus' | 'break' — the old short/long break
  // split is gone (migration v4 below rewrites pre-existing rows).
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile TEXT NOT NULL DEFAULT 'Pomodoro',
      mode TEXT NOT NULL CHECK(mode IN ('focus','break')),
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

  // Seed the default profile (other columns keep their table defaults).
  for (const p of DEFAULT_PROFILES) {
    db.run(
      `INSERT OR IGNORE INTO profiles (name, work_time, break_time) VALUES (?, ?, ?)`,
      [p.name, p.work_time, p.break_time]
    );
  }

  // Seed default settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    db.run(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, JSON.stringify(value)]
    );
  }

  // One-time settings migrations (keyed by a stored version).
  const verRow = db.exec(`SELECT value FROM settings WHERE key='_settings_version'`);
  const ver = verRow[0]?.values?.length ? Number(JSON.parse(verRow[0].values[0][0] as string)) : 1;
  if (ver < 2) {
    // v2: default timer font changed from JetBrains Mono → Outfit (Sans).
    db.run(`UPDATE settings SET value='"Outfit"' WHERE key='timer_font' AND value='"JetBrains Mono"'`);
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('_settings_version', '2')`);
  }
  if (ver < 3) {
    // v3: reset overlay size to 100% (the new auto-fit makes scaling opt-in).
    db.run(`UPDATE settings SET value='100' WHERE key='overlay_size'`);
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('_settings_version', '3')`);
  }
  if (ver < 4) {
    // v4: short_break/long_break → break. An existing sessions table still
    // carries the OLD CHECK constraint, so rebuild it (SQLite can't alter a
    // constraint in place) and fold both break kinds into one. History is
    // preserved — focus rows (the ones stats count) are untouched.
    db.run('BEGIN');
    try {
      db.run(`
        CREATE TABLE sessions_v4 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile TEXT NOT NULL DEFAULT 'Pomodoro',
          mode TEXT NOT NULL CHECK(mode IN ('focus','break')),
          duration_sec INTEGER NOT NULL,
          completed INTEGER NOT NULL DEFAULT 1,
          started_at TEXT NOT NULL,
          finished_at TEXT
        )
      `);
      db.run(`
        INSERT INTO sessions_v4 (id, profile, mode, duration_sec, completed, started_at, finished_at)
        SELECT id, profile,
               CASE WHEN mode = 'focus' THEN 'focus' ELSE 'break' END,
               duration_sec, completed, started_at, finished_at
        FROM sessions
      `);
      db.run(`DROP TABLE sessions`);
      db.run(`ALTER TABLE sessions_v4 RENAME TO sessions`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(started_at)`);
      db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('_settings_version', '4')`);
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      console.error('v4 migration failed:', err);
    }
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

// Local calendar date (YYYY-MM-DD) for a Date — used everywhere day-bucketing
// happens, so a session is attributed to the user's local day (not UTC).
function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function getHistory(from: string, to: string): DayCount[] {
  if (!db) return [];
  const stmt = db.prepare(
    `SELECT date(started_at, 'localtime') as day, COUNT(*) as count
     FROM sessions
     WHERE mode = 'focus' AND completed = 1
       AND date(started_at, 'localtime') >= ? AND date(started_at, 'localtime') <= ?
     GROUP BY day
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

// Per-day focus totals (count + seconds) for the weekly bar chart. Includes
// stopwatch sessions (saved as focus), so the time bars reflect real work time.
export function getWeekly(from: string, to: string): DayStat[] {
  if (!db) return [];
  const stmt = db.prepare(
    `SELECT date(started_at, 'localtime') as day, COUNT(*) as count, COALESCE(SUM(duration_sec), 0) as seconds
     FROM sessions
     WHERE mode = 'focus' AND completed = 1
       AND date(started_at, 'localtime') >= ? AND date(started_at, 'localtime') <= ?
     GROUP BY day
     ORDER BY day`
  );
  stmt.bind([from, to]);
  const results: DayStat[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { day: string; count: number; seconds: number };
    results.push({ day: row.day, count: row.count, seconds: row.seconds });
  }
  stmt.free();
  return results;
}

export function getStats(): Stats {
  if (!db) return { totalPomodoros: 0, todayPomodoros: 0, currentStreak: 0, bestStreak: 0 };

  const total = (db.exec(`SELECT COUNT(*) FROM sessions WHERE mode='focus' AND completed=1`)[0]?.values[0]?.[0] as number) || 0;

  const today = localDateStr(new Date());
  const todayCount = (db.exec(`SELECT COUNT(*) FROM sessions WHERE mode='focus' AND completed=1 AND date(started_at, 'localtime')='${today}'`)[0]?.values[0]?.[0] as number) || 0;

  // Streak calculation (distinct local focus days, newest first)
  const days = db.exec(
    `SELECT DISTINCT date(started_at, 'localtime') as day FROM sessions WHERE mode='focus' AND completed=1 ORDER BY day DESC`
  )[0]?.values?.map((v: unknown[]) => v[0] as string) || [];

  // Day gaps measured from local midnight so a single missing day breaks a run.
  const DAY = 86400000;
  const toMs = (s: string) => Date.parse(`${s}T00:00:00`);
  const yesterday = localDateStr(new Date(Date.now() - DAY));

  // Current streak: consecutive days ending today (or yesterday if nothing yet
  // today). If the most recent activity is older than yesterday, the streak is 0.
  let currentStreak = 0;
  if (days.length && (days[0] === today || days[0] === yesterday)) {
    currentStreak = 1;
    for (let i = 1; i < days.length; i++) {
      if (Math.round((toMs(days[i - 1]) - toMs(days[i])) / DAY) === 1) currentStreak++;
      else break;
    }
  }

  // Best streak: longest run of consecutive days anywhere in history.
  let bestStreak = days.length ? 1 : 0;
  let run = bestStreak;
  for (let i = 1; i < days.length; i++) {
    if (Math.round((toMs(days[i - 1]) - toMs(days[i])) / DAY) === 1) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 1;
    }
  }

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
  const rows = db.exec(`SELECT name, work_time, break_time FROM profiles ORDER BY created_at`);
  if (!rows[0] || rows[0].values.length === 0) return [...DEFAULT_PROFILES];
  return rows[0].values.map((r: unknown[]) => ({
    name: r[0] as string,
    work_time: r[1] as number,
    break_time: r[2] as number,
  }));
}

export function getActiveProfile(): Profile {
  const settings = getAllSettings();
  const profiles = getAllProfiles();
  return profiles.find(p => p.name === settings.active_profile) || profiles[0] || DEFAULT_PROFILES[0];
}

export function updateProfile(profile: Profile): void {
  if (!db) return;
  // UPDATE (not INSERT OR REPLACE) so the legacy columns and created_at keep
  // whatever they hold instead of being reset to defaults.
  db.run(
    `INSERT OR IGNORE INTO profiles (name, work_time, break_time) VALUES (?, ?, ?)`,
    [profile.name, profile.work_time, profile.break_time]
  );
  db.run(
    `UPDATE profiles SET work_time = ?, break_time = ? WHERE name = ?`,
    [profile.work_time, profile.break_time, profile.name]
  );
  saveDB();
}

// Create a new profile with default values and a unique name.
export function createProfile(name?: string): Profile {
  const existing = getAllProfiles();
  const taken = (n: string) => existing.some(p => p.name === n);
  let finalName = (name || '').trim();
  if (!finalName) {
    let i = existing.length + 1;
    finalName = `Custom ${i}`;
    while (taken(finalName)) { i++; finalName = `Custom ${i}`; }
  } else if (taken(finalName)) {
    const base = finalName; let i = 2;
    finalName = `${base} ${i}`;
    while (taken(finalName)) { i++; finalName = `${base} ${i}`; }
  }
  const p: Profile = { name: finalName, work_time: 25, break_time: 5 };
  updateProfile(p);
  return p;
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

// RFC-4180 field escaping: wrap in quotes and double internal quotes when the
// value contains a comma, quote or newline (e.g. a profile name with a comma).
function csvField(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV(): string {
  if (!db) return '';
  // Same row set as the JSON export (completed focus sessions) for consistency.
  const sessions = db.exec(`SELECT profile, mode, duration_sec, completed, started_at, finished_at FROM sessions WHERE mode='focus' AND completed=1 ORDER BY started_at`);
  const header = 'profile,mode,duration_sec,completed,started_at,finished_at';
  const rows = sessions[0]?.values.map((r: unknown[]) => r.map(csvField).join(',')) || [];
  return [header, ...rows].join('\n') + '\n';
}

// === Register IPC handlers ===
export function registerDBIPC(): void {
  ipcMain.handle(IPC.DB_GET_HISTORY, (_e, from: string, to: string) => getHistory(from, to));
  ipcMain.handle(IPC.DB_GET_WEEKLY, (_e, from: string, to: string) => getWeekly(from, to));
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
          // Apply to every window EXCEPT the overlay (which stays always-on-top
          // by design). The old `!w.isAlwaysOnTop()` guard meant turning the
          // setting OFF skipped the main window — so it could never be untoggled.
          const { getOverlayWindow } = await import('./overlay');
          const overlay = getOverlayWindow();
          BrowserWindow.getAllWindows().forEach(w => {
            if (!w.isDestroyed() && w !== overlay) w.setAlwaysOnTop(value as boolean);
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
        case 'overlay_mode':
        // Theme/lang/custom-accent forwarded so the overlay recolors/relabels live.
        case 'theme':
        case 'lang':
        case 'custom_accent':
        // Forwarded so the overlay's flash-on-time-up enable/disable applies live.
        case 'time_up_effect': {
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

      // Broadcast the change to every window so the UI applies it LIVE —
      // the settings panel sits next to the timer now, and waiting for the
      // panel to close before repainting felt broken.
      BrowserWindow.getAllWindows().forEach(w => {
        if (!w.isDestroyed()) w.webContents.send(IPC.SETTINGS_UPDATED, { [key]: value });
      });
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
  ipcMain.handle(IPC.PROFILE_CREATE, (_e, name?: string) => {
    const p = createProfile(name);
    // Make the new profile active and push it to the timer.
    setSetting('active_profile', p.name);
    if (profileSyncFn) profileSyncFn(p);
    return { ok: true, profile: p };
  });

  // === Sound file picker + reader ===
  ipcMain.handle(IPC.SOUND_PICK, async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Choose a sound',
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }],
      properties: ['openFile'],
    });
    if (!filePaths?.length) return null;
    try {
      const soundsDir = path.join(app.getPath('userData'), 'sounds');
      fs.mkdirSync(soundsDir, { recursive: true });
      const base = path.basename(filePaths[0]);
      fs.copyFileSync(filePaths[0], path.join(soundsDir, base));
      return base; // store just the filename; the reader resolves it
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC.SOUND_READ, (_e, file: string) => {
    try {
      const safe = path.basename(file); // guard against path traversal
      const p = path.join(app.getPath('userData'), 'sounds', safe);
      if (!fs.existsSync(p)) return null;
      return fs.readFileSync(p); // Buffer → Uint8Array in the renderer
    } catch {
      return null;
    }
  });
}
