import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { MAIN_WINDOW } from '../shared/constants';
import { IPC } from '../shared/ipc-channels';
import { registerTimerIPC, timerStart, timerPause, timerResume, timerReset, timerSkip, setProfile, setTrayUpdater, refreshSettingsCache } from './timer';
import { initDB, registerDBIPC, getAllSettings, getActiveProfile, setProfileSyncCallback, setSettingsCacheInvalidator } from './db';
import { createTray, updateTray, setTrayLang, destroyTray } from './tray';
import { createOverlayWindow, registerOverlayIPC, destroyOverlay } from './overlay';
import { registerHotkeys, unregisterAll } from './hotkeys';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Set app name for notifications and taskbar
app.setName('Memora Pomodoro');
if (process.platform === 'win32') {
  app.setAppUserModelId('Memora Pomodoro');
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW.width,
    height: MAIN_WINDOW.height,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0C0C0F',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle close: minimize to tray if setting enabled
  mainWindow.on('close', (e) => {
    if (isQuitting) return; // allow quit
    const settings = getAllSettings();
    if (settings.minimize_to_tray && mainWindow) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// Tray action handler — calls timer functions directly
function handleTrayAction(action: string): void {
  switch (action) {
    case 'start': timerStart(); break;
    case 'pause': timerPause(); break;
    case 'resume': timerResume(); break;
    case 'skip': timerSkip(); break;
    case 'reset': timerReset(); break;
    case 'settings':
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
      break;
  }
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Initialize database
    await initDB();
    const settings = getAllSettings();

    // Register IPC handlers
    registerTimerIPC();
    registerDBIPC();
    registerOverlayIPC();

    // Load active profile and sync to timer
    const activeProfile = getActiveProfile();
    setProfile(activeProfile);

    // Wire tray updater
    setTrayUpdater((s, t, m) => updateTray(s, t, m, handleTrayAction));

    // Wire profile sync callback
    setProfileSyncCallback((p) => setProfile(p));

    // Wire settings cache invalidation
    setSettingsCacheInvalidator(() => refreshSettingsCache());

    // System IPC
    ipcMain.handle(IPC.LANG_CHANGE, (_e, lang: 'ru' | 'en') => {
      setTrayLang(lang, handleTrayAction);
    });

    ipcMain.handle(IPC.GET_VERSION, () => app.getVersion());

    ipcMain.handle(IPC.OPEN_EXTERNAL, (_e, url: string) => {
      shell.openExternal(url);
    });

    // Window control IPC
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:close', () => {
      const s = getAllSettings();
      if (s.minimize_to_tray) {
        mainWindow?.hide();
      } else {
        isQuitting = true;
        app.quit();
      }
    });

    // Create windows
    createMainWindow();
    createOverlayWindow();

    // Create tray
    createTray(handleTrayAction);

    // Register global hotkeys
    registerHotkeys(settings.hotkey, () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    });

    // Auto-start on login
    if (settings.launch_on_startup) {
      app.setLoginItemSettings({ openAtLogin: true });
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    unregisterAll();
    destroyTray();
    destroyOverlay();
  });

  app.on('window-all-closed', () => {
    // Don't quit if minimized to tray
    if (process.platform !== 'darwin' && isQuitting) {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

export { mainWindow };
