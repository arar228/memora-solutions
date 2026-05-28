import { Tray, Menu, app, nativeImage, BrowserWindow } from 'electron';
import path from 'path';
import type { TimerMode, TimerStatus } from '../shared/types';

let tray: Tray | null = null;
let currentLang: 'ru' | 'en' = 'ru';
let currentStatus: TimerStatus = 'idle';

// Tray menu labels
const LABELS = {
  ru: { start: 'Старт', pause: 'Пауза', resume: 'Продолжить', skip: 'Пропустить', reset: 'Сбросить', settings: 'Настройки', quit: 'Выход' },
  en: { start: 'Start', pause: 'Pause', resume: 'Resume', skip: 'Skip', reset: 'Reset', settings: 'Settings', quit: 'Quit' },
};

function getAssetPath(...paths: string[]): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets', ...paths)
    : path.join(__dirname, '../../assets', ...paths);
}

function buildContextMenu(onAction: (action: string) => void): Menu {
  const t = LABELS[currentLang];
  const isRunning = currentStatus === 'running';
  const isPaused = currentStatus === 'paused';

  return Menu.buildFromTemplate([
    {
      label: isRunning ? t.pause : (isPaused ? t.resume : t.start),
      click: () => onAction(isRunning ? 'pause' : (isPaused ? 'resume' : 'start')),
    },
    { label: t.skip, click: () => onAction('skip') },
    { label: t.reset, click: () => onAction('reset') },
    { type: 'separator' },
    { label: t.settings, click: () => onAction('settings') },
    { type: 'separator' },
    { label: t.quit, click: () => app.quit() },
  ]);
}

export function createTray(onAction: (action: string) => void): void {
  // Create a simple 16x16 tray icon (monochrome "M")
  const iconSize = 16;
  const icon = nativeImage.createEmpty();
  
  // Use a placeholder — we'll replace with real icon later
  try {
    const iconPath = process.platform === 'darwin'
      ? getAssetPath('tray-iconTemplate.png')
      : getAssetPath('icon.png');
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      tray = new Tray(img.resize({ width: 16, height: 16 }));
    } else {
      // Fallback: create a tiny colored icon programmatically
      tray = new Tray(createFallbackIcon());
    }
  } catch {
    tray = new Tray(createFallbackIcon());
  }

  tray.setToolTip('Memora Pomodoro');
  tray.setContextMenu(buildContextMenu(onAction));

  // Left-click: show/hide main window
  tray.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.isVisible() ? win.hide() : win.show();
    }
  });
}

export function updateTray(status: TimerStatus, timeLeft: number, mode: TimerMode, onAction: (action: string) => void): void {
  if (!tray) return;

  // Update tooltip with time remaining (every tick)
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const modeLabel = mode === 'focus' ? '🍅' : '☕';
  tray.setToolTip(`${modeLabel} ${timeStr} — Memora Pomodoro`);

  // Rebuild context menu only when status changes
  if (status !== currentStatus) {
    currentStatus = status;
    tray.setContextMenu(buildContextMenu(onAction));
  }
}

export function setTrayLang(lang: 'ru' | 'en', onAction: (action: string) => void): void {
  currentLang = lang;
  if (tray) {
    tray.setContextMenu(buildContextMenu(onAction));
  }
}

// Creates a simple 16x16 fallback icon if no icon file exists
function createFallbackIcon(): Electron.NativeImage {
  // Create a simple red square as fallback
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4 + 0] = 224;  // R
    canvas[i * 4 + 1] = 90;   // G
    canvas[i * 4 + 2] = 51;   // B
    canvas[i * 4 + 3] = 255;  // A
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
