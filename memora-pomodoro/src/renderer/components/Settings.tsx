import React, { useState, useEffect, useCallback } from 'react';
import type { AppSettings, ThemeName, PresetTheme, Lang, Profile } from '../../shared/types';
import { THEME_COLORS, themeColors, TIMER_LIMITS, DEFAULT_SETTINGS, DEFAULT_PROFILES } from '../../shared/constants';

const BUNDLED_SOUNDS = ['bell-gentle.wav', 'chime-soft.wav'];

interface SettingsProps {
  lang: Lang;
  theme: ThemeName;
  onThemeChange: (t: ThemeName) => void;
  onLangChange: (l: Lang) => void;
  onClose: () => void;
}

// === Reusable sub-components ===
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <button
        className={`toggle ${checked ? 'on' : ''}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}

function Stepper({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <div className="stepper">
        <button className="stepper-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <span className="stepper-value">{value}{suffix || ''}</span>
        <button className="stepper-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string;
}) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label} <span className="setting-value">{value}{suffix || ''}</span></span>
      <input
        type="range"
        className="setting-slider"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// === Labels ===
const L = {
  ru: {
    profile: 'Профиль', timer: 'Таймер', work: 'Работа', brk: 'Перерыв',
    longBrk: 'Длинный перерыв', rounds: 'Раунды', autoBreak: 'Автостарт перерыва',
    autoWork: 'Автостарт работы', backward: 'Обратный отсчёт',
    appearance: 'Внешний вид', color: 'Цвет', opacity: 'Прозрачность оверлея',
    size: 'Размер оверлея', showBg: 'Фон оверлея', showSec: 'Секунды в оверлее',
    showCtrl: 'Кнопки в оверлее', sound: 'Звук', volume: 'Громкость',
    overlay: 'Оверлей', overlayToggle: 'Показать оверлей-виджет',
    overlayMode: 'Режим оверлея',
    soundNotif: 'Звуковые уведомления', behavior: 'Поведение',
    onTop: 'Поверх всех окон', tray: 'Сворачивать в трей',
    startup: 'Запускать при старте', hotkey: 'Горячая клавиша',
    taskbar: 'Прогресс на таскбаре', desktopNotif: 'Системные уведомления',
    data: 'Данные', exportJson: 'Экспорт JSON', exportCsv: 'Экспорт CSV',
    importYapa: 'Импорт из YAPA', reset: 'Сбросить все данные',
    resetConfirm: 'Это удалит всю историю. Продолжить?',
    back: '← Назад', min: 'мин', lang: 'Язык',
    newProfile: 'Новый', font: 'Шрифт таймера', animation: 'Анимация',
    preview: 'Превью', soundStart: 'Звук старта', soundRepeat: 'Повторять звук работы',
    soundFile: 'Файл звука', play: 'Прослушать', browse: 'Обзор',
  },
  en: {
    profile: 'Profile', timer: 'Timer', work: 'Work', brk: 'Break',
    longBrk: 'Long Break', rounds: 'Rounds', autoBreak: 'Auto-start break',
    autoWork: 'Auto-start work', backward: 'Count backwards',
    appearance: 'Appearance', color: 'Color', opacity: 'Overlay opacity',
    size: 'Overlay size', showBg: 'Overlay background', showSec: 'Overlay seconds',
    showCtrl: 'Overlay controls', sound: 'Sound', volume: 'Volume',
    overlay: 'Overlay', overlayToggle: 'Show overlay widget',
    overlayMode: 'Overlay mode',
    soundNotif: 'Sound notifications', behavior: 'Behavior',
    onTop: 'Always on top', tray: 'Minimize to tray',
    startup: 'Launch on startup', hotkey: 'Global hotkey',
    taskbar: 'Taskbar progress', desktopNotif: 'Desktop notifications',
    data: 'Data', exportJson: 'Export JSON', exportCsv: 'Export CSV',
    importYapa: 'Import from YAPA', reset: 'Reset all data',
    resetConfirm: 'This will delete all history. Continue?',
    back: '← Back', min: 'min', lang: 'Language',
    newProfile: 'New', font: 'Timer font', animation: 'Animation',
    preview: 'Preview', soundStart: 'Start sound', soundRepeat: 'Repeat work sound',
    soundFile: 'Sound file', play: 'Play', browse: 'Browse',
  },
};

export default function Settings({ lang, theme, onThemeChange, onLangChange, onClose }: SettingsProps) {
  const t = L[lang];
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILES[0] });
  const [profiles, setProfiles] = useState<Profile[]>([...DEFAULT_PROFILES]);
  const [recordingHotkey, setRecordingHotkey] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  // Load settings and profile on mount
  useEffect(() => {
    window.api.settings.getAll().then(setSettings);
    window.api.profile.getActive().then(setProfile);
    window.api.profile.getAll().then(setProfiles);
    window.api.system.getVersion().then(v => setAppVersion(v || '1.0.0'));
  }, []);

  // Hotkey recorder
  useEffect(() => {
    if (!recordingHotkey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setRecordingHotkey(false); return; }
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!['Control','Shift','Alt','Meta'].includes(e.key)) parts.push(key);
      if (parts.length >= 2) {
        const combo = parts.join('+');
        updateSetting('hotkey', combo);
        setRecordingHotkey(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recordingHotkey]);

  // Update a setting and persist
  const updateSetting = useCallback((key: keyof AppSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    window.api.settings.set(key, value);
  }, []);

  // Update profile field and persist
  const updateProfile = useCallback((field: keyof Profile, value: number | boolean) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value };
      window.api.profile.update(updated);
      return updated;
    });
  }, []);

  // Switch active profile
  const switchProfile = useCallback((name: string) => {
    const p = profiles.find(pr => pr.name === name);
    if (p) {
      setProfile(p);
      window.api.profile.setActive(name);
    }
  }, [profiles]);

  // Create a new (auto-named) profile and switch to it.
  const addProfile = useCallback(async () => {
    const res = await window.api.profile.create();
    if (res?.profile) {
      const list = await window.api.profile.getAll();
      setProfiles(list);
      setProfile(res.profile);
    }
  }, []);

  // Preview the currently selected completion sound (bundled or custom).
  const previewSound = useCallback(async () => {
    const file = settings.sound_work;
    try {
      let src = `./assets/sounds/${file}`;
      if (!BUNDLED_SOUNDS.includes(file)) {
        const data = await window.api.sound.read(file);
        if (!data) return;
        src = URL.createObjectURL(new Blob([data as unknown as BlobPart]));
      }
      const a = new Audio(src);
      a.volume = settings.sound_volume / 100;
      const isBlob = src.startsWith('blob:');
      if (isBlob) a.addEventListener('ended', () => URL.revokeObjectURL(src), { once: true });
      a.play().catch(() => { if (isBlob) URL.revokeObjectURL(src); });
    } catch { /* ignore */ }
  }, [settings.sound_work, settings.sound_volume]);

  // Import a custom sound file via the native dialog.
  const browseSound = useCallback(async () => {
    const file = await window.api.sound.pick();
    if (file) updateSetting('sound_work', file);
  }, [updateSetting]);

  const previewAccent = themeColors(theme, settings.custom_accent).accent;

  return (
    <div className="settings-panel">
      {/* Back button */}
      <button className="settings-back" onClick={onClose}>{t.back}</button>

      {/* === Profile selector === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.profile}</h3>
        <div className="setting-row">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {profiles.map(p => (
              <button
                key={p.name}
                className={`profile-pill ${profile.name === p.name ? 'active' : ''}`}
                onClick={() => switchProfile(p.name)}
                style={{
                  padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  border: profile.name === p.name ? '1px solid var(--a)' : '1px solid rgba(255,255,255,0.1)',
                  background: profile.name === p.name ? 'var(--a-dim)' : 'transparent',
                  color: profile.name === p.name ? 'var(--a)' : '#8A8A8D',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {p.name}
              </button>
            ))}
            <button
              className="profile-pill profile-add"
              onClick={addProfile}
              style={{
                padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent',
                color: 'var(--a)', cursor: 'pointer', transition: 'all 150ms ease',
              }}
            >
              + {t.newProfile}
            </button>
          </div>
        </div>
      </div>

      {/* === Timer === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.timer}</h3>
        <Stepper label={t.work} value={profile.work_time} onChange={v => updateProfile('work_time', v)} min={TIMER_LIMITS.work.min} max={TIMER_LIMITS.work.max} suffix={` ${t.min}`} />
        <Stepper label={t.brk} value={profile.break_time} onChange={v => updateProfile('break_time', v)} min={TIMER_LIMITS.break.min} max={TIMER_LIMITS.break.max} suffix={` ${t.min}`} />
        <Stepper label={t.longBrk} value={profile.long_break_time} onChange={v => updateProfile('long_break_time', v)} min={TIMER_LIMITS.long_break.min} max={TIMER_LIMITS.long_break.max} suffix={` ${t.min}`} />
        <Stepper label={t.rounds} value={profile.rounds} onChange={v => updateProfile('rounds', v)} min={TIMER_LIMITS.rounds.min} max={TIMER_LIMITS.rounds.max} />
        <Toggle label={t.autoBreak} checked={profile.auto_start_break} onChange={v => updateProfile('auto_start_break', v)} />
        <Toggle label={t.autoWork} checked={profile.auto_start_work} onChange={v => updateProfile('auto_start_work', v)} />
        <Toggle label={t.backward} checked={profile.count_backwards} onChange={v => updateProfile('count_backwards', v)} />
      </div>

      {/* === Appearance === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.appearance}</h3>
        <div className="setting-row">
          <span className="setting-label">{t.color}</span>
          <div className="theme-pills-settings">
            {(Object.keys(THEME_COLORS) as PresetTheme[]).map(th => (
              <button
                key={th}
                className={`theme-pill ${theme === th ? 'active' : ''}`}
                style={{ background: THEME_COLORS[th].accent }}
                onClick={() => onThemeChange(th)}
              />
            ))}
            {/* custom color picker pill */}
            <label
              className={`theme-pill ${theme === 'custom' ? 'active' : ''}`}
              style={{ background: settings.custom_accent, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
              title={t.color}
            >
              <input
                type="color"
                value={settings.custom_accent}
                onChange={e => { updateSetting('custom_accent', e.target.value); onThemeChange('custom'); }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }}
              />
            </label>
          </div>
        </div>
        <div className="setting-row">
          <span className="setting-label">{t.font}</span>
          <select className="setting-select" value={settings.timer_font} onChange={e => updateSetting('timer_font', e.target.value)}>
            <option value="JetBrains Mono">Mono</option>
            <option value="Outfit">Sans</option>
            <option value="Georgia">Serif</option>
          </select>
        </div>
        <Toggle label={t.animation} checked={settings.show_animation} onChange={v => updateSetting('show_animation', v)} />
        {/* Live preview */}
        <div className="appearance-preview">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--sf2)" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={previewAccent} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * 0.35} transform="rotate(-90 28 28)" />
          </svg>
          <span style={{ fontFamily: `'${settings.timer_font}', monospace`, color: 'var(--t1)', fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>17:35</span>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>{t.preview}</span>
        </div>
        <div className="setting-row">
          <span className="setting-label">{t.lang}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['ru', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => onLangChange(l)}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                  border: lang === l ? '1px solid var(--a)' : '1px solid rgba(255,255,255,0.1)',
                  background: lang === l ? 'var(--a-dim)' : 'transparent',
                  color: lang === l ? 'var(--a)' : '#8A8A8D',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {l === 'ru' ? 'RU' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === Overlay === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.overlay}</h3>
        <Toggle label={t.overlayToggle} checked={settings.overlay_visible || false} onChange={() => {
          const newVal = !settings.overlay_visible;
          setSettings(prev => ({ ...prev, overlay_visible: newVal } as typeof prev));
          window.api.system.toggleOverlay();
        }} />
        <div className="setting-row">
          <span className="setting-label">{t.overlayMode}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['pill', 'compact', 'bar'] as const).map(m => (
              <button
                key={m}
                onClick={() => updateSetting('overlay_mode', m)}
                style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                  border: settings.overlay_mode === m ? '1px solid var(--a)' : '1px solid rgba(255,255,255,0.1)',
                  background: settings.overlay_mode === m ? 'var(--a-dim)' : 'transparent',
                  color: settings.overlay_mode === m ? 'var(--a)' : '#8A8A8D',
                  cursor: 'pointer', transition: 'all 150ms ease',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <SliderRow label={t.opacity} value={settings.overlay_opacity} onChange={v => updateSetting('overlay_opacity', v)} min={20} max={100} suffix="%" />
        <SliderRow label={t.size} value={settings.overlay_size} onChange={v => updateSetting('overlay_size', v)} min={50} max={150} suffix="%" />
        <Toggle label={t.showBg} checked={settings.overlay_show_bg} onChange={v => updateSetting('overlay_show_bg', v)} />
        <Toggle label={t.showSec} checked={settings.overlay_show_seconds} onChange={v => updateSetting('overlay_show_seconds', v)} />
        <Toggle label={t.showCtrl} checked={settings.overlay_show_controls} onChange={v => updateSetting('overlay_show_controls', v)} />
      </div>

      {/* === Sound === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.sound}</h3>
        <SliderRow label={t.volume} value={settings.sound_volume} onChange={v => updateSetting('sound_volume', v)} min={0} max={100} suffix="%" />
        <Toggle label={t.soundNotif} checked={settings.sound_notifications} onChange={v => updateSetting('sound_notifications', v)} />
        <Toggle label={t.soundStart} checked={settings.sound_start} onChange={v => updateSetting('sound_start', v)} />
        <Toggle label={t.soundRepeat} checked={settings.sound_repeat} onChange={v => updateSetting('sound_repeat', v)} />
        <div className="setting-row">
          <span className="setting-label">{t.soundFile}</span>
          <select
            className="setting-select"
            value={BUNDLED_SOUNDS.includes(settings.sound_work) ? settings.sound_work : 'custom'}
            onChange={e => { if (e.target.value !== 'custom') updateSetting('sound_work', e.target.value); }}
          >
            <option value="bell-gentle.wav">Bell</option>
            <option value="chime-soft.wav">Chime</option>
            {!BUNDLED_SOUNDS.includes(settings.sound_work) && (
              <option value="custom">{settings.sound_work}</option>
            )}
          </select>
        </div>
        <div className="setting-row">
          <span className="setting-label" style={{ fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {settings.sound_work}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="mini-btn" onClick={previewSound}>▶ {t.play}</button>
            <button className="mini-btn" onClick={browseSound}>{t.browse}…</button>
          </div>
        </div>
      </div>

      {/* === Behavior === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.behavior}</h3>
        <Toggle label={t.onTop} checked={settings.always_on_top} onChange={v => updateSetting('always_on_top', v)} />
        <Toggle label={t.tray} checked={settings.minimize_to_tray} onChange={v => updateSetting('minimize_to_tray', v)} />
        <Toggle label={t.startup} checked={settings.launch_on_startup} onChange={v => updateSetting('launch_on_startup', v)} />
        <Toggle label={t.taskbar} checked={settings.taskbar_progress} onChange={v => updateSetting('taskbar_progress', v)} />
        <Toggle label={t.desktopNotif} checked={settings.desktop_notifications} onChange={v => updateSetting('desktop_notifications', v)} />
        <div className="setting-row">
          <span className="setting-label">{t.hotkey}</span>
          <button className="hotkey-field" onClick={() => setRecordingHotkey(true)}
            style={recordingHotkey ? { borderColor: 'var(--a)', color: 'var(--a)' } : {}}>
            {recordingHotkey ? (lang === 'ru' ? '⌨ Нажмите...' : '⌨ Press...') : settings.hotkey}
          </button>
        </div>
      </div>

      {/* === Data === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.data}</h3>
        <div className="data-buttons">
          <button className="data-btn" onClick={async () => {
            await window.api.db.exportData('json');
            alert(lang === 'ru' ? '✅ Экспортировано!' : '✅ Exported!');
          }}>📄 {t.exportJson}</button>
          <button className="data-btn" onClick={async () => {
            await window.api.db.exportData('csv');
            alert(lang === 'ru' ? '✅ Экспортировано!' : '✅ Exported!');
          }}>📊 {t.exportCsv}</button>
          <button className="data-btn" onClick={() => window.api.db.importYapa()}>📥 {t.importYapa}</button>
          <button className="data-btn danger" onClick={() => {
            if (confirm(t.resetConfirm)) window.api.db.reset();
          }}>🗑 {t.reset}</button>
        </div>
      </div>

      {/* === Version === */}
      {appVersion && (
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--t3)', padding: '12px 0 8px' }}>
          Memora Pomodoro v{appVersion}
        </div>
      )}
    </div>
  );
}
