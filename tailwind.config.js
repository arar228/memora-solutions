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
        // Тёмная палитра админки — совпадает с сайтом, чтобы не было разнобоя.
        bg: '#0F0F14',
        surface: '#16161C',
        'surface-2': '#1D1D25',
        line: 'rgba(255,255,255,0.10)',
        'line-strong': 'rgba(255,255,255,0.18)',
        ink: '#EDEDF2',
        'ink-2': '#A9A9B8',
        'ink-3': '#71717F',
        brand: '#06B6D4',
        'brand-dim': 'rgba(6,182,212,0.14)',
        ok: '#3FAE79',
        warn: '#E0A030',
        danger: '#D95757',
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
        card: '0 10px 30px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};
