import React, { useState, useEffect, useCallback } from 'react';
import type { AppSettings, Lang } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { IS_WEB } from '../../shared/target';

const BUNDLED_SOUNDS = ['bell-gentle.wav', 'chime-soft.wav'];

interface SettingsProps {
  lang: Lang;
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
    appearance: 'Внешний вид', opacity: 'Прозрачность оверлея',
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
    min: 'мин', font: 'Шрифт таймера',
    soundStart: 'Звук старта', soundRepeat: 'Повторять звук работы',
    soundFile: 'Файл звука', play: 'Прослушать', browse: 'Обзор',
  },
  en: {
    appearance: 'Appearance', opacity: 'Overlay opacity',
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
    min: 'min', font: 'Timer font',
    soundStart: 'Start sound', soundRepeat: 'Repeat work sound',
    soundFile: 'Sound file', play: 'Play', browse: 'Browse',
  },
};

export default function Settings({ lang }: SettingsProps) {
  const t = L[lang];
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [recordingHotkey, setRecordingHotkey] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  // Load settings on mount (durations live on the main screen now).
  useEffect(() => {
    window.api.settings.getAll().then(setSettings);
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

  return (
    <div className="settings-panel">
      {/* Back button removed — the panel closes via the « edge arrow or Esc. */}

      {/* Секция «Таймер» убрана целиком: длительности Фокуса и Паузы
          задаются прокруткой цифр на главном экране, а длинных перерывов и
          раундов больше нет. */}

      {/* === Appearance === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.appearance}</h3>
        <div className="setting-row">
          <span className="setting-label">{t.font}</span>
          <select className="setting-select" value={settings.timer_font} onChange={e => updateSetting('timer_font', e.target.value)}>
            <option value="JetBrains Mono">Mono</option>
            <option value="Outfit">Sans</option>
            <option value="Georgia">Serif</option>
          </select>
        </div>
        <Toggle
          label={lang === 'ru' ? 'Сцена (пиксельная анимация)' : 'Scene (pixel animation)'}
          checked={settings.scene_on !== false}
          onChange={v => updateSetting('scene_on', v)}
        />
        <div className="setting-row">
          <span className="setting-label">{lang === 'ru' ? 'Сигнал «время вышло»' : 'Time-up alert'}</span>
          <select className="setting-select" value={settings.time_up_effect} onChange={e => updateSetting('time_up_effect', e.target.value)}>
            <option value="flash">{lang === 'ru' ? 'Мигание' : 'Flash'}</option>
            <option value="tomatoes">{lang === 'ru' ? 'Помидоры' : 'Tomatoes'}</option>
            <option value="both">{lang === 'ru' ? 'Мигание + помидоры' : 'Flash + tomatoes'}</option>
            <option value="off">{lang === 'ru' ? 'Выкл' : 'Off'}</option>
          </select>
        </div>
      </div>

      {/* === Overlay (десктоп-только: в браузере оверлея нет) === */}
      <div className="settings-section" hidden={IS_WEB}>
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

      {/* === Behavior (трей, автозапуск, хоткеи — только десктоп) === */}
      <div className="settings-section" hidden={IS_WEB}>
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
