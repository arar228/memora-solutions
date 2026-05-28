import { globalShortcut, BrowserWindow } from 'electron';

let currentHotkey: string = 'CommandOrControl+Shift+P';
let onToggleCallback: (() => void) | null = null;

export function registerHotkeys(hotkey: string, onToggle: () => void): boolean {
  currentHotkey = hotkey;
  onToggleCallback = onToggle;

  try {
    // Unregister previous if any
    globalShortcut.unregisterAll();

    const success = globalShortcut.register(hotkey, () => {
      if (onToggleCallback) onToggleCallback();
    });

    if (!success) {
      console.warn(`Hotkey ${hotkey} could not be registered (conflict)`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to register hotkey:', err);
    return false;
  }
}

export function updateHotkey(newHotkey: string): boolean {
  if (!onToggleCallback) return false;
  return registerHotkeys(newHotkey, onToggleCallback);
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll();
}
