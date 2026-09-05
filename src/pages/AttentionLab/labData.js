export const STORAGE_KEY = 'memora-attention-lab-references';
export const say = (value, lang = 'ru') => typeof value === 'string' ? value : value[lang] || value.ru;
const both = (ru, en) => ({ ru, en });

// All numbers below are authored demonstration data, not customer research.
export const EXHIBITS = [
  {
    id: 'compare', number: '01', name: both('Сравнить', 'Compare'),
    title: both('Где сосредоточить усилия?', 'Where should we focus?'),
    subject: both('Обращения в поддержку за неделю', 'Support requests in one week'),
    unit: both('обращений', 'requests'), form: both('Ранжирование', 'Ranking'),
    principle: both('Порядок создаёт приоритет.', 'Order creates priority.'),
    explanation: both('Общая шкала делает разницу видимой. Сортировка поднимает главное наверх, а один цвет удерживает на нём взгляд.', 'A shared scale reveals differences. Sorting brings the priority to the top; one accent keeps it in focus.'),
    application: both('Приоритеты продукта, сравнение тарифов, отчёт для команды.', 'Product priorities, plan comparisons and team reports.'),
    focusId: 'catalog',
    rows: [
      { id: 'orders', label: both('Заказы', 'Orders'), value: 32 },
      { id: 'catalog', label: both('Каталог', 'Catalog'), value: 46 },
      { id: 'account', label: both('Профиль', 'Account'), value: 12 },
      { id: 'payment', label: both('Оплата', 'Payment'), value: 18 },
    ],
  },
  {
    id: 'change', number: '02', name: both('Увидеть изменение', 'See change'),
    title: both('Как меняется картина?', 'How is the picture changing?'),
    subject: both('Доля повторных визитов, %', 'Returning visits, %'),
    unit: '%', form: both('Динамика', 'Change over time'),
    principle: both('Контекст важнее одной цифры.', 'Context matters more than one number.'),
    explanation: both('Линия связывает наблюдения во времени. Подпись у выбранной точки помогает прочитать значение, сохраняя весь период перед глазами.', 'A line connects observations over time. A label at the selected point gives detail while the full period stays visible.'),
    application: both('Метрики продукта, результаты эксперимента, сезонность.', 'Product metrics, experiment results and seasonality.'),
    focusId: 'jun',
    rows: [
      { id: 'jan', label: both('Янв', 'Jan'), value: 32 },
      { id: 'feb', label: both('Фев', 'Feb'), value: 34 },
      { id: 'mar', label: both('Мар', 'Mar'), value: 30 },
      { id: 'apr', label: both('Апр', 'Apr'), value: 45 },
      { id: 'may', label: both('Май', 'May'), value: 58 },
      { id: 'jun', label: both('Июн', 'Jun'), value: 64 },
    ],
  },
  {
    id: 'parts', number: '03', name: both('Понять состав', 'Understand the whole'),
    title: both('Из чего складывается работа?', 'What makes up the work?'),
    subject: both('Спринт на 100 часов', 'A 100-hour sprint'),
    unit: both('часов', 'hours'), form: both('Часть и целое', 'Part to whole'),
    principle: both('Целое даёт масштаб каждой части.', 'The whole gives each part its scale.'),
    explanation: both('Одна полоса показывает распределение общего объёма. Подписи связывают цвет с конкретной работой, а выбор раскрывает её долю.', 'One bar shows how the total is allocated. Labels connect each segment to the work; selection reveals its share.'),
    application: both('Состав бюджета, план спринта, структура расходов.', 'Budget allocation, sprint planning and expense breakdowns.'),
    focusId: 'frontend',
    rows: [
      { id: 'design', label: both('Дизайн', 'Design'), value: 24 },
      { id: 'frontend', label: 'Frontend', value: 36 },
      { id: 'backend', label: 'Backend', value: 28 },
      { id: 'testing', label: both('Проверка', 'Testing'), value: 12 },
    ],
  },
  {
    id: 'flow', number: '04', name: both('Проследить путь', 'Follow the journey'),
    title: both('Что происходит между шагами?', 'What happens between steps?'),
    subject: both('Путь 1 000 посетителей', 'The journey of 1,000 visitors'),
    unit: both('человек', 'people'), form: both('Последовательность', 'Sequence'),
    principle: both('Связи объясняют результат.', 'Connections explain the result.'),
    explanation: both('Все этапы показаны относительно одного входа. Разница между соседними шагами указывает, где стоит изучить поведение подробнее.', 'Every stage uses the same starting point. The difference between adjacent steps shows where to investigate behavior.'),
    application: both('Онбординг, оформление заказа, многошаговая форма.', 'Onboarding, checkout and multi-step forms.'),
    focusId: 'explore',
    rows: [
      { id: 'visit', label: both('Открыли страницу', 'Opened the page'), value: 1000 },
      { id: 'explore', label: both('Изучили продукт', 'Explored the product'), value: 720 },
      { id: 'choose', label: both('Выбрали вариант', 'Chose an option'), value: 540 },
      { id: 'action', label: both('Оставили заявку', 'Sent a request'), value: 410 },
    ],
  },
];

export const REFERENCES = [
  { id: 'ft', title: 'FT Visual Vocabulary', text: both('Выбрать форму под вопрос к данным.', 'Match a visual form to a data question.'), href: 'https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary' },
  { id: 'pudding', title: 'The Pudding', text: both('Выстроить визуальное эссе и историю.', 'Structure a visual essay and story.'), href: 'https://pudding.cool/2025/08/onions/' },
  { id: 'data-viz', title: 'From Data to Viz', text: both('Начать со структуры своего датасета.', 'Start with the structure of your dataset.'), href: 'https://www.data-to-viz.com/' },
  { id: 'vega', title: 'Vega-Lite Examples', text: both('Найти пример с декларативной спецификацией.', 'Find an example with a declarative specification.'), href: 'https://vega.github.io/vega-lite/examples/' },
  { id: 'python', title: 'Python Graph Gallery', text: both('Подобрать пример для Python-отчёта.', 'Find an example for a Python report.'), href: 'https://python-graph-gallery.com/' },
  { id: 'd3', title: 'D3 Graph Gallery', text: both('Изучить нестандартную геометрию.', 'Explore custom chart geometry.'), href: 'https://d3-graph-gallery.com/' },
];

export const OUTPUTS = [
  { id: 'data', title: both('Диаграмма', 'Data chart'), engine: 'Vega-Lite / Altair', route: 'JSON spec → schema check → vl-convert → SVG / PNG' },
  { id: 'poster', title: both('Плакат', 'Editorial poster'), engine: 'SVG → resvg / CairoSVG', route: 'Grid → typography → SVG → PNG' },
  { id: 'web', title: both('Веб-интерактив', 'Web interaction'), engine: 'Observable Plot / React + SVG', route: 'Data → scales → marks → keyboard / touch' },
  { id: 'pandas', title: both('Python-отчёт', 'Python report'), engine: 'matplotlib + .mplstyle', route: 'pandas → chart → brand style → SVG / PNG' },
];

export const TOOLS = [
  { title: 'AntV MCP Chart', code: 'npx -y @antv/mcp-server-chart', href: 'https://github.com/antvis/mcp-server-chart' },
  { title: 'Anthropic Skills', code: '/plugin marketplace add anthropics/skills', href: 'https://github.com/anthropics/skills' },
  { title: 'OpenSkills', code: 'npx openskills install SOURCE --universal', href: 'https://github.com/numman-ali/openskills' },
];

export function readSelection(raw) {
  const valid = new Set([...EXHIBITS, ...REFERENCES].map(item => item.id));
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter(id => valid.has(id)))] : [];
  } catch { return []; }
}

export function getInsight(exhibit, selectedId, lang) {
  const row = exhibit.rows.find(item => item.id === selectedId) || exhibit.rows[0];
  const index = exhibit.rows.indexOf(row);
  const total = exhibit.rows.reduce((sum, item) => sum + item.value, 0);
  const share = Math.round(row.value / (exhibit.id === 'flow' ? exhibit.rows[0].value : total) * 100);
  if (exhibit.id === 'change') {
    const delta = row.value - exhibit.rows[0].value;
    return { value: row.value + '%', label: say(row.label, lang), detail: lang === 'ru' ? (delta >= 0 ? '+' : '') + delta + ' п.п. к январю. Выберите другой месяц, чтобы сравнить.' : (delta >= 0 ? '+' : '') + delta + ' pp vs January. Select another month to compare.' };
  }
  if (exhibit.id === 'flow') {
    const lost = index ? exhibit.rows[index - 1].value - row.value : 0;
    return { value: share + '%', label: say(row.label, lang), detail: lang === 'ru' ? row.value + ' из 1 000 посетителей.' + (index ? ' Переход с прошлого шага: −' + lost + ' человек.' : ' Общий вход для сравнения всех следующих этапов.') : row.value + ' of 1,000 visitors.' + (index ? ' Change from the previous step: −' + lost + ' people.' : ' The baseline for every subsequent stage.') };
  }
  return { value: share + '%', label: say(row.label, lang), detail: lang === 'ru' ? row.value + ' из ' + total + ' ' + say(exhibit.unit, lang) + '. Выберите другую часть, чтобы увидеть её вклад.' : row.value + ' of ' + total + ' ' + say(exhibit.unit, lang) + '. Select another part to see its contribution.' };
}

export function createBrief(ids, outputId, lang = 'ru') {
  const selected = readSelection(JSON.stringify(ids));
  const output = OUTPUTS.find(item => item.id === outputId) || OUTPUTS[2];
  const lines = [lang === 'ru' ? 'Визуальный бриф · Memora' : 'Visual brief · Memora', output.engine, output.route, ''];
  for (const id of selected) {
    const exhibit = EXHIBITS.find(item => item.id === id);
    if (exhibit) {
      lines.push(say(exhibit.form, lang) + ': ' + say(exhibit.title, lang), say(exhibit.principle, lang), say(exhibit.application, lang), 'https://memorasolutions.ru/attention-lab?example=' + id, '');
    } else {
      const reference = REFERENCES.find(item => item.id === id);
      lines.push(reference.title + ': ' + reference.href);
    }
  }
  lines.push('', lang === 'ru' ? 'Данные в этюдах демонстрационные. Для проекта: определить вопрос, аудиторию, реальные данные и критерий результата. Проверить шкалы, подписи, контраст, мобильный экран, клавиатуру и reduced motion.' : 'Study data is illustrative. For a project: define the question, audience, real data and success criteria. Verify scales, labels, contrast, mobile layout, keyboard access and reduced motion.');
  return lines.join('\n');
}
