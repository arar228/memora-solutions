import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { IPC } from '../shared/ipc-channels';
import { OVERLAY_SIZES } from '../shared/constants';
import type { OverlayMode } from '../shared/types';

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
    const s = OVERLAY_SIZES[currentMode];
    const cd = screen.getDisplayNearestPoint({ x, y });
    const { x: wx, y: wy, width: ww, height: wh } = cd.workArea;
    const cx = Math.max(wx, Math.min(x, wx + ww - s.width));
    const cy = Math.max(wy, Math.min(y, wy + wh - s.height));
    if (cx !== x || cy !== y) overlayWindow.setPosition(cx, cy);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    overlayWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/overlay.html`);
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
  }
}

export function toggleOverlay(): void {
  if (!overlayWindow) return;
  overlayVisible = !overlayVisible;
  if (overlayVisible) {
    overlayWindow.show();
  } else {
    overlayWindow.hide();
  }
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
    const newMode = settings.overlay_mode as OverlayMode;
    currentMode = newMode;
    const s = OVERLAY_SIZES[newMode];
    overlayWindow.setSize(s.width, s.height);
  }
  if ('overlay_size' in settings) {
    const scale = (settings.overlay_size as number) / 100;
    const base = OVERLAY_SIZES[currentMode];
    const w = Math.round(base.width * scale);
    const h = Math.round(base.height * scale);
    overlayWindow.setSize(w, h);
  }

  // Forward to overlay renderer
  overlayWindow.webContents.send(IPC.SETTINGS_UPDATED, settings);
}

export function registerOverlayIPC(): void {
  ipcMain.handle(IPC.OVERLAY_TOGGLE, () => {
    toggleOverlay();
  });
}

export function destroyOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
  }
  overlayWindow = null;
}
