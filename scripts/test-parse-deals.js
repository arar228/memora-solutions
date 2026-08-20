import assert from 'node:assert/strict';
import { parseTravelDates, structure } from './parse-deals.js';

function parse(text, channel = 'test') {
  return structure({
    text,
    channel,
    channelTitle: '',
    date: '2026-07-29T06:22:00.000Z',
    link: 'https://t.me/test/1',
    links: [],
  });
}

const newZealand = parse(
  '✈️ В Новую Зеландию зимой за 80.500 руб туда-обратно с багажом, стыковки в Чэнду',
  'nachemodanahspb',
);
assert.equal(newZealand.length, 1);
assert.equal(newZealand[0].from.code, 'LED');
assert.equal(newZealand[0].to.code, 'AKL');
assert.equal(newZealand[0].to.name, 'Новая Зеландия');
assert.deepEqual(newZealand[0].to.country, { ru: 'Новая Зеландия', en: 'New Zealand' });
assert.equal(newZealand[0].to.kind, 'country');
assert.deepEqual(newZealand[0].from.country, { ru: 'Россия', en: 'Russia' });
assert.equal(newZealand[0].price, 80500);

const worldRoutes = [
  ['Из Москвы в Париж билеты за 19 900 руб', 'PAR'],
  ['Из Москвы в Лондон билеты за 21 500 руб', 'LON'],
  ['Из Москвы в Сидней билеты за 44 900 руб', 'SYD'],
  ['Из Москвы в Токио билеты за 39 900 руб', 'TYO'],
  ['Из Москвы в Канкун билеты за 54 900 руб', 'CUN'],
  ['Из Казани в Анталию билеты за 9 900 руб', 'AYT'],
  ['Из Санкт-Петербурга в Тунис тур за 35 700 руб', 'TUN'],
  ['Из Москвы на Алтай короткий тур от 23 200 руб', 'RGK'],
  ['Из Петербурга в Кавминводы тур от 23 600 руб', 'MRV'],
];

for (const [text, destination] of worldRoutes) {
  const deals = parse(text);
  assert.equal(deals.length, 1, `Не распознано предложение: ${text}`);
  assert.equal(deals[0].to.code, destination, `Неверное направление: ${text}`);
}

assert.deepEqual(parse('Реклама сервиса: скидка 20%, подробности по ссылке'), []);

const inbound = parse(
  'Нячанг — Москва от 17600₽ в одну сторону, вылеты 5 августа\n— 05.08 — 17600₽\n'
  + 'Нячанг — Екатеринбург от 21900₽ в одну сторону\n— 31.07 — 21900₽',
  'travelradar',
);
assert.deepEqual(
  inbound.map((deal) => [deal.from.code, deal.to.code, deal.price, deal.departDate]),
  [
    ['CXR', 'MOW', 17600, '2026-08-05'],
    ['CXR', 'SVX', 21900, '2026-07-31'],
  ],
);
assert.ok(inbound.every((deal) => deal.type === 'flight'));

const thailandInbound = parse(
  'Бангкок (Таиланд) — Екатеринбург от 22200Р в одну сторону\n'
  + '— 27.09 — 22200Р\n— 01.10 — 26600Р\n'
  + 'Пхукет (Таиланд) — Екатеринбург от 26600Р в одну сторону\n— 01.01 — 26600Р',
  'travelradar',
);
assert.deepEqual(
  thailandInbound.map((deal) => [deal.from.code, deal.to.code, deal.price]),
  [['BKK', 'SVX', 22200], ['HKT', 'SVX', 26600]],
);

const sharm = parse('Москва — Шарм-эш-Шейх от 23500₽ в обе стороны\n— 29.07 — 23500₽');
assert.equal(sharm[0].from.code, 'MOW');
assert.equal(sharm[0].to.code, 'SSH');
assert.equal(sharm[0].type, 'flight');
assert.deepEqual(sharm[0].to.country, { ru: 'Египет', en: 'Egypt' });
assert.equal(sharm[0].to.kind, 'city');

const foreign = parse('Полеты из Касабланки в Кабо-Верде за 22.300 руб туда-обратно');
assert.equal(foreign[0].from.code, 'CMN');
assert.equal(foreign[0].to.code, 'RAI');
assert.equal(foreign[0].roundTrip, true);

const sharedFlightTerms = parse(
  '✈️В Европу следующей весной и летом туда-обратно, стыковки в Касабланке:\n\n'
  + 'В Барселону 36.500 руб\n➡️ https://aviasales.tpx.lu/SQlhTl4B\n\n'
  + 'В Амстердам 39.000 руб\n➡️ https://aviasales.tpx.lu/9Y9IjXex\n\n'
  + 'В Женеву 42.500 руб\n➡️ https://aviasales.tpx.lu/ydIx1CXz\n\n'
  + 'В Париж 46.000 руб\n➡️ https://aviasales.tpx.lu/haTfImxo',
  'nachemodanahspb',
);
assert.deepEqual(
  sharedFlightTerms.map((deal) => [deal.from.code, deal.to.code, deal.price]),
  [
    ['LED', 'BCN', 36500],
    ['LED', 'AMS', 39000],
    ['LED', 'GVA', 42500],
    ['LED', 'PAR', 46000],
  ],
);
assert.ok(sharedFlightTerms.every((deal) => deal.roundTrip));
assert.ok(sharedFlightTerms.every((deal) => (
  deal.connections.length === 1
  && deal.connections[0].code === 'CMN'
  && deal.connections[0].name === 'Касабланка'
)));

const alternateConnectionWording = parse(
  'Из Москвы в Токио через Стамбул за 39 900 руб туда и обратно',
);
assert.equal(alternateConnectionWording[0].roundTrip, true);
assert.equal(alternateConnectionWording[0].connections[0].code, 'IST');

const foreignList = parse('Каир - Эр-Рияд за 5.300 руб', 'nachemodanahspb');
assert.equal(foreignList[0].from.code, 'CAI');
assert.equal(foreignList[0].to.code, 'RUH');

const multipleOrigins = parse('Прямые рейсы из Москвы, Уфы и Казани в Турцию от 4999 рублей');
assert.equal(multipleOrigins[0].from.code, 'MOW');
assert.equal(multipleOrigins[0].to.code, 'IST');

const cityContext = parse(
  'Петербуржцы летят отдыхать в Тунис:\n10 ночей с 31 июля за 40700 рублей с человека',
);
assert.equal(cityContext[0].from.code, 'LED');
assert.equal(cityContext[0].to.code, 'TUN');

const magadanRegional = parse(
  '✈️Полетать по Магаданской области. Рейсы из Магадана туда-обратно:\n\n'
  + 'В Сеймчан 4.300 руб\n➡️ https://aviasales.tpx.lu/tXcdMFbR\n\n'
  + 'В Ягодное 6.400 руб\n➡️ https://aviasales.tpx.lu/qzoICave\n\n'
  + 'В Синегорье 6.600 руб\n➡️ https://aviasales.tpx.lu/mDHOw8Zm',
  'nachemodanahspb',
);
assert.deepEqual(
  magadanRegional.map((deal) => [deal.from.code, deal.to.code, deal.price]),
  [['GDX', 'СМЧ', 4300], ['GDX', 'ЯГО', 6400], ['GDX', 'СНГ', 6600]],
);
assert.deepEqual(
  magadanRegional.map((deal) => deal.link),
  [
    'https://aviasales.tpx.lu/tXcdMFbR',
    'https://aviasales.tpx.lu/qzoICave',
    'https://aviasales.tpx.lu/mDHOw8Zm',
  ],
);
assert.ok(magadanRegional.every((deal) => !deal.text.includes('https://')));

const toMoscow = parse(
  '✈️Полеты в Москву Аэрофлотом за 5.600 руб туда-обратно. Много дат в августе-декабре\n\n'
  + '⏩ https://aviasales.tpx.lu/MaECEOB3\n'
  + '⏩ https://aviasales.tpx.lu/XVQTchYO',
  'nachemodanahspb',
);
assert.deepEqual(
  toMoscow.map((deal) => [deal.from.code, deal.to.code, deal.price]),
  [['LED', 'MOW', 5600]],
);
assert.equal(toMoscow[0].departDate, '2026-08');
assert.match(toMoscow[0].link, /LED0108MOW1/);
assert.equal(
  toMoscow[0].text,
  '✈️Полеты в Москву Аэрофлотом за 5.600 руб туда-обратно. Много дат в августе-декабре',
);

const returnFromBangkok = parse(
  '✈️Возврат из Бангкока за 22.300 руб на начало октября, прямой рейс Аэрофлота',
  'nachemodanahspb',
);
assert.deepEqual(
  returnFromBangkok.map((deal) => [deal.from.code, deal.to.code, deal.price]),
  [['BKK', 'LED', 22300]],
);
assert.equal(returnFromBangkok[0].departDate, '2026-10');
assert.match(returnFromBangkok[0].link, /BKK0110LED1/);

const compactRoundTrip = parse(
  'из Самары в Анталью за 14 500 р. RT (5-9 авг)',
  'samokatus',
);
assert.equal(compactRoundTrip[0].departDate, '2026-08-05');
assert.equal(compactRoundTrip[0].returnDate, '2026-08-09');

const datedTour = parse(
  'Тур из Москвы в Египет: вылет 30.08, 9 ночей от 113 547 ₽ за двоих',
);
assert.equal(datedTour[0].departDate, '2026-08-30');
assert.equal(datedTour[0].returnDate, '2026-09-08');

assert.deepEqual(
  parseTravelDates('с 31 июля по 7 августа', '2026-07-29T06:22:00.000Z'),
  { departDate: '2026-07-31', returnDate: '2026-08-07' },
);
assert.deepEqual(
  parseTravelDates('12–19.08', '2026-08-05T06:22:00.000Z'),
  { departDate: '2026-08-12', returnDate: '2026-08-19' },
);
assert.deepEqual(
  parseTravelDates('вылеты 5, 12 и 19 августа', '2026-08-05T06:22:00.000Z'),
  { departDate: '2026-08-05', returnDate: null },
);

const unknownOriginTour = parse(
  '9 ночей на 1-й линии в Турции, туры от 60 344 ₽ с человека',
  'travelata',
);
assert.equal(unknownOriginTour[0].from.code, 'ANY');
assert.equal(unknownOriginTour[0].to.code, 'IST');
assert.equal(unknownOriginTour[0].type, 'tour');

const moscowChannelOrigin = parse(
  'Тур в Тунис на 7 ночей от 62 442 ₽ с человека',
  'toursmsk',
);
assert.equal(moscowChannelOrigin[0].from.code, 'MOW');
assert.equal(moscowChannelOrigin[0].to.code, 'TUN');

const petersburgChannelOrigin = parse(
  'Тур в Таиланд на 9 ночей от 67 224 ₽ с человека',
  'toursspb',
);
assert.equal(petersburgChannelOrigin[0].from.code, 'LED');
assert.equal(petersburgChannelOrigin[0].to.code, 'BKK');

console.log('deal parser: all destination checks passed');
