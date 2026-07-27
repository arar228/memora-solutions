import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { IPC } from '../shared/ipc-channels';
import { OVERLAY_SIZES } from '../shared/constants';
import type { OverlayMode } from '../shared/types';
import { setSetting } from './db';

let overlayWindow: BrowserWindow | null = null;
let overlayVisible = false;
let currentMode: OverlayMode = 'compact';
let visibilityGuard: NodeJS.Timeout | null = null;

function enforceOverlayVisibility(): void {
  if (!overlayVisible || !overlayWindow || overlayWindow.isDestroyed()) return;
  if (overlayWindow.isMinimized()) overlayWindow.restore();
  if (!overlayWindow.isVisible()) overlayWindow.showInactive();
  if (!overlayWindow.isAlwaysOnTop()) overlayWindow.setAlwaysOnTop(true, 'screen-saver');
}

function startVisibilityGuard(): void {
  if (visibilityGuard) return;
  // Win+D can ask ordinary topmost windows to minimize. A toolbar window is
  // normally excluded, and this guard restores it if Explorer still hides it.
  visibilityGuard = setInterval(enforceOverlayVisibility, 350);
}

function stopVisibilityGuard(): void {
  if (!visibilityGuard) return;
  clearInterval(visibilityGuard);
  visibilityGuard = null;
}

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
    type: process.platform === 'win32' ? 'toolbar' : undefined,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
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

  // The screen-saver level is intentionally used here: Electron's regular
  // floating/status levels sit below the Windows taskbar. This keeps the overlay
  // visible above both application windows and the taskbar, as requested.
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  overlayWindow.setMovable(true);
  overlayWindow.setMinimizable(false);
  overlayWindow.setMaximizable(false);

  if (process.platform !== 'win32') {
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  overlayWindow.on('minimize', () => setTimeout(enforceOverlayVisibility, 0));
  overlayWindow.on('hide', () => setTimeout(enforceOverlayVisibility, 0));
  overlayWindow.on('show', () => {
    overlayWindow?.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow?.moveTop();
  });

  // NOTE: we intentionally do NOT auto-blur on focus. The previous code blurred
  // the window 100ms after it gained focus, which cancelled the very first drag
  // when coming from another app (the window snapped back; only the 2nd drag
  // stuck). Letting it keep focus while dragging fixes that.

  overlayWindow.on('moved', () => {
    if (!overlayWindow) return;
    const [x, y] = overlayWindow.getPosition();
    const [ow, oh] = overlayWindow.getSize();
    // Pick the display the widget mostly sits on (by its centre), so a widget
    // straddling two monitors clamps to the right one.
    const cd = screen.getDisplayNearestPoint({ x: x + Math.round(ow / 2), y: y + Math.round(oh / 2) });
    // Clamp to the FULL display bounds (not workArea) so the widget can be
    // parked over the taskbar.
    const { x: wx, y: wy, width: ww, height: wh } = cd.bounds;
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
// Returns whether the overlay window actually exists (so callers don't hide the
// main window when there's nothing to show — which would leave the app with no
// visible window).
export function setOverlayVisible(visible: boolean): boolean {
  if (!overlayWindow || overlayWindow.isDestroyed()) return false;
  overlayVisible = visible;
  if (visible) {
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.showInactive();
    overlayWindow.moveTop();
    startVisibilityGuard();
  } else {
    stopVisibilityGuard();
    overlayWindow.hide();
  }
  setSetting('overlay_visible', visible);
  return true;
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
    // The renderer owns the rounded widget background. Painting the native
    // BrowserWindow itself made its rectangular bounds visible behind that
    // widget, which looked like a second sharp frame around the overlay.
    overlayWindow.setBackgroundColor('#00000000');
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
  const [curW, curH] = overlayWindow.getContentSize();
  if (curW === cw && curH === ch) return; // already correct — breaks any resize loop
  // While hidden, just size it (don't move it) so we never mutate the user's
  // dragged position from background ticks.
  if (!overlayVisible) {
    overlayWindow.setContentSize(cw, ch);
    return;
  }
  const [x, y] = overlayWindow.getPosition();
  const [ow, oh] = overlayWindow.getSize();
  let nx = x + (ow - cw); // keep the top-right corner anchored
  const cd = screen.getDisplayNearestPoint({ x: x + Math.round(ow / 2), y: y + Math.round(oh / 2) });
  const { x: wx, width: ww } = cd.bounds;
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
  stopVisibilityGuard();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
  }
  overlayWindow = null;
}
