import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    search: 'Поиск настроек', scenes: 'Сцены', sceneToggle: 'Показывать окно сцен',
    sceneStyle: 'Выбранная сцена', sceneSpeed: 'Скорость анимации', ticking: 'Тикание', whiteNoise: 'Белый шум',
    noResults: 'Настройки не найдены',
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
    search: 'Search settings', scenes: 'Scenes', sceneToggle: 'Show scene panel',
    sceneStyle: 'Selected scene', sceneSpeed: 'Animation speed', ticking: 'Ticking', whiteNoise: 'White noise',
    noResults: 'No settings found',
  },
};

export default function Settings({ lang }: SettingsProps) {
  const t = L[lang];
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [recordingHotkey, setRecordingHotkey] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [query, setQuery] = useState('');
  const [hasSearchResults, setHasSearchResults] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Search the visible localized labels plus a few common aliases. Sections
  // disappear when none of their settings match; matching a section title
  // shows the whole section.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const normalized = query.trim().toLocaleLowerCase().replaceAll('ё', 'е');
    let visibleCount = 0;
    panel.querySelectorAll<HTMLElement>('.settings-section').forEach(section => {
      if (section.hidden) return;
      const title = section.querySelector('.settings-section-title')?.textContent
        ?.toLocaleLowerCase().replaceAll('ё', 'е') ?? '';
      const titleMatches = !!normalized && title.includes(normalized);
      let sectionVisible = !normalized;
      section.querySelectorAll<HTMLElement>('[data-setting-search]').forEach(item => {
        const haystack = `${item.textContent ?? ''} ${item.dataset.settingSearch ?? ''}`
          .toLocaleLowerCase().replaceAll('ё', 'е');
        const matches = !normalized || titleMatches || haystack.includes(normalized);
        item.classList.toggle('search-hidden', !matches);
        if (matches) {
          sectionVisible = true;
          visibleCount += 1;
        }
      });
      section.classList.toggle('search-hidden', !sectionVisible);
    });
    setHasSearchResults(!normalized || visibleCount > 0);
  }, [query, lang, settings]);

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
    <div className="settings-panel" ref={panelRef}>
      {/* Back button removed — the panel closes via the « edge arrow or Esc. */}

      <label className="settings-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.2 16.2 4 4"/></svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          autoComplete="off"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label={lang === 'ru' ? 'Очистить поиск' : 'Clear search'}>×</button>}
      </label>

      <div className="settings-section settings-section--scene">
        <h3 className="settings-section-title">{t.scenes}</h3>
        <div data-setting-search="сцена окно анимация scene panel animation">
          <Toggle
            label={t.sceneToggle}
            checked={settings.scene_on !== false}
            onChange={v => updateSetting('scene_on', v)}
          />
        </div>
        <div className="setting-row" data-setting-search="выбранная сцена ниндзя график орбита сад дерево selected scene ninja chart orbit garden tree">
          <span className="setting-label">{t.sceneStyle}</span>
          <select
            className="setting-select"
            value={['ninja', 'chart', 'orbit', 'garden', 'tree'].includes(settings.scene_style) ? settings.scene_style : 'ninja'}
            onChange={e => updateSetting('scene_style', e.target.value)}
          >
            <option value="ninja">{lang === 'ru' ? 'Ниндзя-помидорка' : 'Tomato ninja'}</option>
            <option value="chart">{lang === 'ru' ? 'График активности' : 'Activity chart'}</option>
            <option value="orbit">{lang === 'ru' ? 'Орбита фокуса' : 'Focus orbit'}</option>
            <option value="garden">{lang === 'ru' ? 'Световой сад' : 'Light garden'}</option>
            <option value="tree">{lang === 'ru' ? 'Дерево фокуса' : 'Focus tree'}</option>
          </select>
        </div>
        <div data-setting-search="сцена анимация скорость speed animation scene">
          <SliderRow
            label={t.sceneSpeed}
            value={settings.scene_speed ?? 100}
            onChange={v => updateSetting('scene_speed', v)}
            min={50}
            max={200}
            suffix="%"
          />
        </div>
      </div>

      {/* Секция «Таймер» убрана целиком: длительности Фокуса и Паузы
          задаются прокруткой цифр на главном экране, а длинных перерывов и
          раундов больше нет. */}

      {/* === Appearance === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.appearance}</h3>
        <div className="setting-row" data-setting-search="шрифт таймер font timer">
          <span className="setting-label">{t.font}</span>
          <select className="setting-select" value={settings.timer_font} onChange={e => updateSetting('timer_font', e.target.value)}>
            <option value="JetBrains Mono">Mono</option>
            <option value="Outfit">Sans</option>
            <option value="Georgia">Serif</option>
          </select>
        </div>
        <div className="setting-row" data-setting-search="сигнал время вышло alert flash tomatoes">
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
        <div data-setting-search="оверлей виджет overlay widget">
          <Toggle label={t.overlayToggle} checked={settings.overlay_visible || false} onChange={() => {
            const newVal = !settings.overlay_visible;
            setSettings(prev => ({ ...prev, overlay_visible: newVal } as typeof prev));
            window.api.system.toggleOverlay();
          }} />
        </div>
        <div className="setting-row" data-setting-search="режим оверлея overlay mode">
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
        <div data-setting-search="прозрачность оверлея opacity overlay"><SliderRow label={t.opacity} value={settings.overlay_opacity} onChange={v => updateSetting('overlay_opacity', v)} min={20} max={100} suffix="%" /></div>
        <div data-setting-search="размер оверлея size overlay"><SliderRow label={t.size} value={settings.overlay_size} onChange={v => updateSetting('overlay_size', v)} min={50} max={150} suffix="%" /></div>
        <div data-setting-search="фон оверлея background overlay"><Toggle label={t.showBg} checked={settings.overlay_show_bg} onChange={v => updateSetting('overlay_show_bg', v)} /></div>
        <div data-setting-search="секунды оверлея seconds overlay"><Toggle label={t.showSec} checked={settings.overlay_show_seconds} onChange={v => updateSetting('overlay_show_seconds', v)} /></div>
        <div data-setting-search="кнопки оверлея controls overlay"><Toggle label={t.showCtrl} checked={settings.overlay_show_controls} onChange={v => updateSetting('overlay_show_controls', v)} /></div>
      </div>

      {/* === Sound === */}
      <div className="settings-section">
        <h3 className="settings-section-title">{t.sound}</h3>
        <div data-setting-search="громкость звук volume sound"><SliderRow label={t.volume} value={settings.sound_volume} onChange={v => updateSetting('sound_volume', v)} min={0} max={100} suffix="%" /></div>
        <div data-setting-search="звуковые уведомления sound notifications"><Toggle label={t.soundNotif} checked={settings.sound_notifications} onChange={v => updateSetting('sound_notifications', v)} /></div>
        <div data-setting-search="звук старта start sound"><Toggle label={t.soundStart} checked={settings.sound_start} onChange={v => updateSetting('sound_start', v)} /></div>
        <div data-setting-search="повторять звук repeat sound"><Toggle label={t.soundRepeat} checked={settings.sound_repeat} onChange={v => updateSetting('sound_repeat', v)} /></div>
        <div className="setting-row" data-setting-search="тикание звук ticking sound">
          <span className="setting-label">{t.ticking}</span>
          <select className="setting-select" value={settings.ticking} onChange={e => updateSetting('ticking', e.target.value)}>
            <option value="off">{lang === 'ru' ? 'Выкл' : 'Off'}</option>
            <option value="low">{lang === 'ru' ? 'Низкое' : 'Low'}</option>
            <option value="med">{lang === 'ru' ? 'Среднее' : 'Medium'}</option>
            <option value="high">{lang === 'ru' ? 'Высокое' : 'High'}</option>
          </select>
        </div>
        <div className="setting-row" data-setting-search="белый шум дождь white noise rain">
          <span className="setting-label">{t.whiteNoise}</span>
          <select className="setting-select" value={settings.white_noise} onChange={e => updateSetting('white_noise', e.target.value)}>
            <option value="off">{lang === 'ru' ? 'Выкл' : 'Off'}</option>
            <option value="rain">{lang === 'ru' ? 'Дождь' : 'Rain'}</option>
          </select>
        </div>
        <div className="setting-row" data-setting-search="файл звука sound file">
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
        <div className="setting-row" data-setting-search="прослушать обзор файл звука play browse sound">
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
        <div data-setting-search="поверх всех окон always on top"><Toggle label={t.onTop} checked={settings.always_on_top} onChange={v => updateSetting('always_on_top', v)} /></div>
        <div data-setting-search="сворачивать трей minimize tray"><Toggle label={t.tray} checked={settings.minimize_to_tray} onChange={v => updateSetting('minimize_to_tray', v)} /></div>
        <div data-setting-search="запускать при старте startup launch"><Toggle label={t.startup} checked={settings.launch_on_startup} onChange={v => updateSetting('launch_on_startup', v)} /></div>
        <div data-setting-search="прогресс таскбар taskbar progress"><Toggle label={t.taskbar} checked={settings.taskbar_progress} onChange={v => updateSetting('taskbar_progress', v)} /></div>
        <div data-setting-search="системные уведомления desktop notifications"><Toggle label={t.desktopNotif} checked={settings.desktop_notifications} onChange={v => updateSetting('desktop_notifications', v)} /></div>
        <div className="setting-row" data-setting-search="горячая клавиша hotkey shortcut">
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
          <button className="data-btn" data-setting-search="экспорт json export" onClick={async () => {
            await window.api.db.exportData('json');
            alert(lang === 'ru' ? '✅ Экспортировано!' : '✅ Exported!');
          }}>📄 {t.exportJson}</button>
          <button className="data-btn" data-setting-search="экспорт csv export" onClick={async () => {
            await window.api.db.exportData('csv');
            alert(lang === 'ru' ? '✅ Экспортировано!' : '✅ Exported!');
          }}>📊 {t.exportCsv}</button>
          <button className="data-btn" data-setting-search="импорт yapa import" onClick={() => window.api.db.importYapa()}>📥 {t.importYapa}</button>
          <button className="data-btn danger" data-setting-search="сброс удалить данные reset delete data" onClick={() => {
            if (confirm(t.resetConfirm)) window.api.db.reset();
          }}>🗑 {t.reset}</button>
        </div>
      </div>

      {!hasSearchResults && <div className="settings-search-empty" role="status">{t.noResults}</div>}

      {/* === Version === */}
      {appVersion && (
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--t3)', padding: '12px 0 8px' }}>
          Memora Pomodoro v{appVersion}
        </div>
      )}
    </div>
  );
}
