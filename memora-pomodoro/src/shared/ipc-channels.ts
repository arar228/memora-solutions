export const IPC = {
  // Timer control (Renderer → Main)
  TIMER_START:    'timer:start',
  TIMER_PAUSE:    'timer:pause',
  TIMER_RESUME:   'timer:resume',
  TIMER_RESET:    'timer:reset',
  TIMER_SKIP:     'timer:skip',
  TIMER_SET_MODE: 'timer:set-mode',

  // Timer events (Main → Renderer/Overlay)
  TIMER_TICK:     'timer:tick',
  TIMER_COMPLETE: 'timer:complete',

  // Overlay (Renderer ↔ Main)
  OVERLAY_TOGGLE: 'overlay:toggle',
  OVERLAY_UPDATE: 'overlay:update',

  // Settings (Renderer ↔ Main)
  SETTINGS_GET_ALL: 'settings:all',
  SETTINGS_SET:     'settings:set',
  SETTINGS_UPDATED: 'settings:updated',

  // Database (Renderer → Main)
  DB_GET_HISTORY:   'db:get-history',
  DB_GET_STATS:     'db:get-stats',
  DB_SAVE_SESSION:  'db:save-session',
  DB_EXPORT:        'db:export',
  DB_IMPORT_YAPA:   'db:import-yapa',
  DB_RESET:         'db:reset',

  // Profiles (Renderer ↔ Main)
  PROFILE_GET_ALL:     'profile:get-all',
  PROFILE_GET_ACTIVE:  'profile:get-active',
  PROFILE_UPDATE:      'profile:update',
  PROFILE_SET_ACTIVE:  'profile:set-active',
  PROFILE_CREATE:      'profile:create',
  PROFILE_UPDATED:     'profile:updated',

  // Sound (custom file picker + reader)
  SOUND_PICK:        'sound:pick',
  SOUND_READ:        'sound:read',

  // System
  LANG_CHANGE:       'lang:change',
  GET_VERSION:       'get-version',
  OPEN_EXTERNAL:     'open-external',
  PLAY_SOUND:        'play-sound',
} as const;
