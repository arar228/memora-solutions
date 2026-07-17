/**
 * parse-deals.js — structures the raw Telegram feed (public/tours.json) into
 * normalized hot-deals. For FLIGHT deals with a recognizable route it rebuilds
 * the buy link as OUR Aviasales affiliate link (marker 748397) instead of the
 * channel's own link ("intercept"). Tours are kept with their post link.
 *
 * Output shape (public/hot-deals.json):
 *   { type:'flight'|'tour', from:{name,code}, to:{name,code}, price, oldPrice,
 *     discount, oneway, date, source, link, text }
 *
 * Heuristic parser — catches the clean subset; noisy/description posts are
 * skipped. The structured tour backbone comes from the tour APIs (Sletat /
 * Level.Travel / Travelata) once their keys are connected.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VISA_DESTINATIONS } from '../src/pages/TravelRadar3/visaDestinations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MARKER = '748397';

// City name-stem → IATA. RF origins + popular destinations. Stems are matched
// case-insensitively so Russian declensions ("из Москвы") still hit.
const RF_ORIGINS = [
  ['москв', 'MOW', 'Москва'], ['петербург', 'LED', 'Санкт-Петербург'], ['питер', 'LED', 'Санкт-Петербург'],
  ['спб', 'LED', 'Санкт-Петербург'], ['сочи', 'AER', 'Сочи'], ['екатеринбург', 'SVX', 'Екатеринбург'],
  ['казан', 'KZN', 'Казань'], ['новосибирск', 'OVB', 'Новосибирск'], ['красноярск', 'KJA', 'Красноярск'],
  ['уф', 'UFA', 'Уфа'], ['самар', 'KUF', 'Самара'], ['челябинск', 'CEK', 'Челябинск'], ['перм', 'PEE', 'Пермь'],
  ['нижн', 'GOJ', 'Нижний Новгород'], ['калининград', 'KGD', 'Калининград'], ['владивосток', 'VVO', 'Владивосток'],
  ['тюмен', 'TJM', 'Тюмень'], ['иркутск', 'IKT', 'Иркутск'], ['краснодар', 'KRR', 'Краснодар'],
  ['ростов', 'ROV', 'Ростов-на-Дону'], ['минеральн', 'MRV', 'Минеральные Воды'], ['махачкал', 'MCX', 'Махачкала'],
  ['омск', 'OMS', 'Омск'], ['волгоград', 'VOG', 'Волгоград'],
];
// Destination stems from the visa catalog (city + country names).
const DEST_STEMS = [];
for (const d of Object.values(VISA_DESTINATIONS)) {
  const push = (s) => { if (s && s.length >= 4) DEST_STEMS.push([s.toLowerCase(), d.code, d.city.ru]); };
  push(d.city.ru.slice(0, Math.max(5, d.city.ru.length - 1)));
}
// A few common extra destination stems the deals mention.
const EXTRA_DEST = [
  ['нячанг', 'CXR', 'Нячанг'], ['пхукет', 'HKT', 'Пхукет'], ['бангкок', 'BKK', 'Бангкок'],
  ['шри-ланк', 'CMB', 'Шри-Ланка'], ['мармарис', 'DLM', 'Мармарис'], ['анталь', 'AYT', 'Анталия'],
  ['стамбул', 'IST', 'Стамбул'], ['дубай', 'DXB', 'Дубай'], ['занзибар', 'ZNZ', 'Занзибар'],
];
const ORIG = [...RF_ORIGINS];
const DEST = [...EXTRA_DEST, ...DEST_STEMS];

const findCity = (text, table) => {
  const t = text.toLowerCase();
  for (const [stem, code, name] of table) if (t.includes(stem)) return { code, name, pos: t.indexOf(stem) };
  return null;
};

const TOUR_RE = /\bтур|отел|ночей|звёзд|звезд|all\s*inclusive|всё включено|пляжн/i;
const FLIGHT_RE = /билет|перелёт|перелет|авиа|в одну сторону|туда[- ]обратно|\brt\b|рейс/i;
const PRICE_RE = /(?:от\s*)?(\d[\d\s]{2,})\s*(?:₽|руб|р\.|р\b)/i;
const OLD_RE = /вместо\s*(\d[\d\s]{2,})/i;
const num = (s) => Number(String(s).replace(/\s/g, '')) || 0;

const ddmm = (d) => {
  const dt = new Date(Date.now() + 30 * 864e5);
  const p = (n) => String(n).padStart(2, '0');
  return p(dt.getDate()) + p(dt.getMonth() + 1);
};
function aviaLink(from, to) {
  const u = new URL(`https://www.aviasales.ru/search/${from}${ddmm()}${to}1`);
  u.searchParams.set('marker', MARKER);
  u.searchParams.set('currency', 'rub');
  return u.toString();
}

function structure(post) {
  const text = post.text || '';
  const priceM = text.match(PRICE_RE);
  if (!priceM) return null;
  const price = num(priceM[1]);
  if (price < 1500 || price > 900000) return null; // sanity

  const isTour = TOUR_RE.test(text);
  const isFlight = FLIGHT_RE.test(text);
  const type = isTour && !isFlight ? 'tour' : 'flight';

  const from = findCity(text, ORIG);
  const to = findCity(text, DEST);
  if (!from || !to || from.code === to.code) return null; // need a route

  const oldM = text.match(OLD_RE);
  const oldPrice = oldM ? num(oldM[1]) : null;
  const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) / 100 : null;
  const oneway = /в одну сторону|one\s*way/i.test(text);

  // Flights → OUR Aviasales link. Tours → keep the post's external link (no
  // param deep-link) or the post itself.
  const link = type === 'flight'
    ? aviaLink(from.code, to.code)
    : (post.links && post.links[0]) || post.link;

  return {
    type,
    from: { name: from.name, code: from.code },
    to: { name: to.name, code: to.code },
    price, oldPrice, discount, oneway,
    date: post.date || null,
    source: post.channel,
    link,
    text: text.slice(0, 180),
  };
}

async function main() {
  const raw = JSON.parse(await readFile(join(ROOT, 'public', 'tours.json'), 'utf8'));
  const seen = new Set();
  const deals = [];
  for (const post of raw.items || []) {
    const d = structure(post);
    if (!d) continue;
    const key = `${d.type}-${d.from.code}-${d.to.code}-${d.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deals.push(d);
  }
  deals.sort((a, b) => (b.discount || 0) - (a.discount || 0) || a.price - b.price);

  const payload = { updatedAt: new Date().toISOString(), marker: MARKER, deals };
  await writeFile(join(ROOT, 'public', 'hot-deals.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`structured ${deals.length} deals from ${raw.items.length} posts`);
  deals.slice(0, 12).forEach((d) => console.log(
    `  [${d.type}] ${d.from.name}→${d.to.name} ${d.price}₽${d.discount ? ` (-${Math.round(d.discount * 100)}%)` : ''} · ${d.source}`
  ));
}
main();
