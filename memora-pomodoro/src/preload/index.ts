import { contextBridge, ipcRenderer } from 'electron';
import type { TimerTickPayload, TimerCompletePayload, AppSettings, DayCount, Stats, Lang, ElectronAPI } from '../shared/types';
import { IPC } from '../shared/ipc-channels';

const api: ElectronAPI = {
  timer: {
    start:  () => ipcRenderer.invoke(IPC.TIMER_START),
    pause:  () => ipcRenderer.invoke(IPC.TIMER_PAUSE),
    resume: () => ipcRenderer.invoke(IPC.TIMER_RESUME),
    reset:   () => ipcRenderer.invoke(IPC.TIMER_RESET),
    skip:    () => ipcRenderer.invoke(IPC.TIMER_SKIP),
    setMode: (mode: string) => ipcRenderer.invoke(IPC.TIMER_SET_MODE, mode),
    onTick: (cb: (data: TimerTickPayload) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: TimerTickPayload) => cb(data);
      ipcRenderer.on(IPC.TIMER_TICK, handler);
      return () => ipcRenderer.removeListener(IPC.TIMER_TICK, handler);
    },
    onComplete: (cb: (data: TimerCompletePayload) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: TimerCompletePayload) => cb(data);
      ipcRenderer.on(IPC.TIMER_COMPLETE, handler);
      return () => ipcRenderer.removeListener(IPC.TIMER_COMPLETE, handler);
    },
  },

  settings: {
    getAll: () => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
    set:    (key: string, value: unknown) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
    onUpdate: (cb: (settings: Record<string, unknown>) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: Record<string, unknown>) => cb(data);
      ipcRenderer.on(IPC.SETTINGS_UPDATED, handler);
      return () => ipcRenderer.removeListener(IPC.SETTINGS_UPDATED, handler);
    },
  },

  db: {
    getHistory: (from: string, to: string) => ipcRenderer.invoke(IPC.DB_GET_HISTORY, from, to),
    getStats:   () => ipcRenderer.invoke(IPC.DB_GET_STATS),
    exportData: (format: 'json' | 'csv') => ipcRenderer.invoke(IPC.DB_EXPORT, format),
    importYapa: () => ipcRenderer.invoke(IPC.DB_IMPORT_YAPA),
    reset:      () => ipcRenderer.invoke(IPC.DB_RESET),
  },

  system: {
    setLang:       (lang: Lang) => ipcRenderer.invoke(IPC.LANG_CHANGE, lang),
    toggleOverlay: () => ipcRenderer.invoke(IPC.OVERLAY_TOGGLE),
    getVersion:    () => ipcRenderer.invoke(IPC.GET_VERSION),
    onPlaySound: (cb: (data: { file: string; volume: number; times?: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { file: string; volume: number; times?: number }) => cb(data);
      ipcRenderer.on(IPC.PLAY_SOUND, handler);
      return () => ipcRenderer.removeListener(IPC.PLAY_SOUND, handler);
    },
  },

  sound: {
    pick: () => ipcRenderer.invoke(IPC.SOUND_PICK),
    read: (file: string) => ipcRenderer.invoke(IPC.SOUND_READ, file),
  },

  profile: {
    getAll:    () => ipcRenderer.invoke(IPC.PROFILE_GET_ALL),
    getActive: () => ipcRenderer.invoke(IPC.PROFILE_GET_ACTIVE),
    update:    (profile: unknown) => ipcRenderer.invoke(IPC.PROFILE_UPDATE, profile),
    setActive: (name: string) => ipcRenderer.invoke(IPC.PROFILE_SET_ACTIVE, name),
    create:    (name?: string) => ipcRenderer.invoke(IPC.PROFILE_CREATE, name),
  },

  window: {
    minimize:  () => ipcRenderer.invoke('window:minimize'),
    close:     () => ipcRenderer.invoke('window:close'),
  },
};

contextBridge.exposeInMainWorld('api', api);
