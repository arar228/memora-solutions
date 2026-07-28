/**
 * Tailwind включён ТОЛЬКО для админки (admin.memorasolutions.ru).
 *
 * preflight выключен намеренно: он сбрасывает базовые стили всей страницы, а
 * основной сайт свёрстан на своём CSS — с включённым preflight он бы поехал.
 * Классы Tailwind при этом работают как обычно.
 *
 * Токены ниже — то, чем «крутится» внешний вид: правишь здесь, и меняются все
 * компоненты админки. Токены самого Помодоро живут отдельно
 * (public/pomodoro-tokens.json) — их редактирует панель Помодоро.
 */
export default {
  content: [
    './index.html',
    './src/admin/**/*.{js,jsx}',
    './src/ui/**/*.{js,jsx}',
  ],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Светлая рабочая палитра: высокая читаемость для менеджмента и
        // спокойный бирюзовый акцент Memora для интерактивных элементов.
        bg: '#F3F7F8',
        surface: '#FFFFFF',
        'surface-2': '#F0F5F6',
        line: 'rgba(22,49,60,0.12)',
        'line-strong': 'rgba(22,49,60,0.22)',
        ink: '#142832',
        'ink-2': '#50656F',
        'ink-3': '#60757F',
        brand: '#06798A',
        'brand-dim': 'rgba(6,121,138,0.12)',
        ok: '#27845D',
        warn: '#A66400',
        danger: '#C64250',
      },
      borderRadius: {
        card: '14px',
        control: '10px',
      },
      fontSize: {
        ui: ['14px', '1.45'],
        'ui-sm': ['12.5px', '1.4'],
      },
      boxShadow: {
        card: '0 12px 32px rgba(24,55,66,0.08)',
      },
    },
  },
  plugins: [],
};
