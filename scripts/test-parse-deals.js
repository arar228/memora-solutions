import assert from 'node:assert/strict';
import { structure } from './parse-deals.js';

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
assert.deepEqual(
  parse('Полеты из Касабланки в Кабо-Верде за 22.300 руб туда-обратно', 'nachemodanahspb'),
  [],
);

console.log('deal parser: all destination checks passed');
