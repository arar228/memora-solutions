// @ts-ignore — electron-updater types available after npm install electron-updater
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../shared/ipc-channels';

export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info: { version: string }) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.UPDATE_AVAILABLE, info.version);
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.UPDATE_READY);
      }
    });
  });

  autoUpdater.on('error', (err: Error) => {
    console.error('Auto-update error:', err);
    // Silent fail — retry in 24h
  });

  ipcMain.handle(IPC.UPDATE_INSTALL, () => {
    autoUpdater.quitAndInstall();
  });

  // Check for updates (silent)
  autoUpdater.checkForUpdates().catch(() => {
    // Network unavailable — ignore
  });
}
