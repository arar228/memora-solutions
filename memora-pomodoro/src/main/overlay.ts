import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { IPC } from '../shared/ipc-channels';
import { OVERLAY_SIZES } from '../shared/constants';
import type { OverlayMode } from '../shared/types';
import { setSetting } from './db';

let overlayWindow: BrowserWindow | null = null;
let overlayVisible = false;
let currentMode: OverlayMode = 'compact';

export function createOverlayWindow(mode: OverlayMode = 'compact'): void {
  currentMode = mode;
  const display = screen.getPrimaryDisplay();
  const { width: screenW } = display.workArea;
  const size = OVERLAY_SIZES[mode];

  overlayWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x: mode === 'bar'
      ? Math.round((screenW - size.width) / 2)  // bar centers on screen
      : screenW - size.width - 20,
    y: 20,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.platform === 'darwin') {
    overlayWindow.setAlwaysOnTop(true, 'floating');
  }

  overlayWindow.setMovable(true);

  // Return focus to previous window after overlay button click
  overlayWindow.on('focus', () => {
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.blur();
      }
    }, 100);
  });

  overlayWindow.on('moved', () => {
    if (!overlayWindow) return;
    const [x, y] = overlayWindow.getPosition();
    const [ow, oh] = overlayWindow.getSize();
    const cd = screen.getDisplayNearestPoint({ x, y });
    const { x: wx, y: wy, width: ww, height: wh } = cd.workArea;
    const cx = Math.max(wx, Math.min(x, wx + ww - ow));
    const cy = Math.max(wy, Math.min(y, wy + wh - oh));
    if (cx !== x || cy !== y) overlayWindow.setPosition(cx, cy);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    const url = `${process.env.ELECTRON_RENDERER_URL}/overlay.html`;
    overlayWindow.loadURL(url);
    // Retry on a refused connection while the dev server is still starting up.
    overlayWindow.webContents.on('did-fail-load', (_e, code) => {
      if (code === -102 && overlayWindow) setTimeout(() => overlayWindow?.loadURL(url), 500);
    });
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
  }
}

export function toggleOverlay(): void {
  if (!overlayWindow) return;
  setOverlayVisible(!overlayVisible);
}

// Show/hide the overlay and persist the choice so it's restored next launch.
export function setOverlayVisible(visible: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayVisible = visible;
  if (visible) overlayWindow.show();
  else overlayWindow.hide();
  setSetting('overlay_visible', visible);
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow;
}

export function updateOverlaySettings(settings: Record<string, unknown>): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  if ('overlay_opacity' in settings) {
    overlayWindow.setOpacity((settings.overlay_opacity as number) / 100);
  }
  if ('overlay_show_bg' in settings) {
    overlayWindow.setBackgroundColor(
      settings.overlay_show_bg ? '#1E1E24' : '#00000000'
    );
  }
  if ('overlay_mode' in settings) {
    // The window size for each mode (and the overlay_size scale) is driven by
    // the renderer measuring its content and calling overlay.resize — so the
    // window always hugs the widget with no wasted space. We only track the
    // mode here for reference.
    currentMode = settings.overlay_mode as OverlayMode;
  }

  // Forward to overlay renderer (it re-renders + reports its new content size)
  overlayWindow.webContents.send(IPC.SETTINGS_UPDATED, settings);
}

// Resize the overlay window to exactly fit its rendered content (reported by
// the renderer). Keeps the top-right corner anchored so the widget doesn't
// drift as it grows/shrinks between modes.
export function resizeOverlayToContent(width: number, height: number): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const cw = Math.max(60, Math.round(width));
  const ch = Math.max(24, Math.round(height));
  const [x, y] = overlayWindow.getPosition();
  const [ow] = overlayWindow.getSize();
  let nx = x + (ow - cw);
  const cd = screen.getDisplayNearestPoint({ x, y });
  const { x: wx, width: ww } = cd.workArea;
  nx = Math.max(wx, Math.min(nx, wx + ww - cw));
  overlayWindow.setContentSize(cw, ch);
  overlayWindow.setPosition(Math.round(nx), y);
}

export function registerOverlayIPC(): void {
  ipcMain.handle(IPC.OVERLAY_TOGGLE, () => {
    toggleOverlay();
  });
  ipcMain.handle(IPC.OVERLAY_RESIZE, (_e, w: number, h: number) => {
    resizeOverlayToContent(w, h);
  });
}

export function destroyOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
  }
  overlayWindow = null;
}
