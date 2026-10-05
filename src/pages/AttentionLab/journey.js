// User-driven state machine. The contact handoff carries only a public goal ID.
export const GOALS = [
  { id: 'understand', ru: { title: 'Понять продукт', detail: 'Показать главное с первого экрана.', result: 'Покажем ценность вашего продукта и проведём к первому действию.' }, en: { title: 'Understand the product', detail: 'Bring the essentials into focus.', result: 'Bring your product’s value into focus and guide the first action.' } },
  { id: 'choose', ru: { title: 'Выбрать вариант', detail: 'Превратить сравнение в ясный выбор.', result: 'Сделаем сравнение понятным и поможем выбрать подходящий вариант.' }, en: { title: 'Choose an option', detail: 'Turn comparison into a clear choice.', result: 'Make comparison clear and help people choose the right option.' } },
  { id: 'act', ru: { title: 'Оставить заявку', detail: 'Подвести к осмысленному действию.', result: 'Выстроим путь от интереса к заявке с понятным следующим шагом.' }, en: { title: 'Send an enquiry', detail: 'Guide a meaningful next action.', result: 'Build a clear path from interest to an enquiry.' } },
];
export const INITIAL_JOURNEY = Object.freeze({ step: 0, goal: null });
export function journeyReducer(state, action) {
  if (action.type === 'restart') return INITIAL_JOURNEY;
  if (action.type === 'start' && state.step === 0) return { ...state, step: 1 };
  if (action.type === 'choose' && state.step === 1 && GOALS.some(goal => goal.id === action.goal)) return { step: 2, goal: action.goal };
  if (action.type === 'connect' && state.step === 2 && GOALS.some(goal => goal.id === state.goal)) return { ...state, step: 3 };
  return state;
}
export function goalFromSearch(search) {
  const id = new URLSearchParams(search).get('labGoal');
  return GOALS.find(goal => goal.id === id) || null;
}
export function goalBrief(goal, lang = 'ru') {
  const copy = GOALS.find(item => item.id === goal)?.[lang === 'ru' ? 'ru' : 'en'];
  if (!copy) return '';
  return lang === 'ru' ? `Хочу обсудить дизайн и сценарий взаимодействия. Цель: ${copy.title.toLowerCase()}.` : `I'd like to discuss design and interaction. Goal: ${copy.title.toLowerCase()}.`;
}
export function pointInTarget(point, rect) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y)
    && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}
