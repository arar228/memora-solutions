/**
 * fetch-radar.js — data feed for Travel Radar 3.0, built on the official
 * Travelpayouts (Aviasales) DATA API. Produces public/radar.json with three
 * live sections, each price carrying our affiliate marker:
 *
 *   1. hotFlights  — cheapest recent tickets (/v2/prices/latest) scored by
 *      discount vs the route MEDIAN (/v2/prices/month-matrix). "Genuinely hot"
 *      only (>= MIN_DISCOUNT, >= MIN_SAMPLES).
 *   2. cheapFrom   — for a few origin cities (/v1/city-directions): the cheapest
 *      destinations right now, "от X ₽".
 *   3. calendar    — for a featured route (/v1/prices/calendar): price per date
 *      with a cheap/mid/expensive level for a heatmap.
 *
 * The Data API is CACHED by Aviasales (not realtime, kept ~7 days), so this runs
 * on a cron (every 2–3h). No deps — Node 18+ built-in fetch.
 *
 * Config (env / CI secrets):
 *   TRAVELPAYOUTS_TOKEN   (required for live mode; x-access-token)
 *   TRAVELPAYOUTS_MARKER  (affiliate marker; defaults to our account marker)
 *   TP_CURRENCY=rub  TP_MARKET=ru
 * Without a token it writes a small built-in DRY-RUN sample so the page has
 * content offline.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'public', 'radar.json');

const API = 'https://api.travelpayouts.com';
const TOKEN = process.env.TRAVELPAYOUTS_TOKEN || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '748397';
const CURRENCY = (process.env.TP_CURRENCY || 'rub').toLowerCase();
const MARKET = (process.env.TP_MARKET || 'ru').toLowerCase();

const LIMIT = 30;              // deals to request from /latest
const MIN_DISCOUNT = 0.2;      // keep hot deals >= 20% below the route median
const MIN_SAMPLES = 4;         // require enough matrix points to trust the median
const TOP_HOT = 12;            // max hot flights to publish
const CHEAP_PER_CITY = 6;      // cheapest destinations per origin city
const REQUEST_DELAY_MS = 250;  // politeness between calls (rate limits)
const DRY_RUN = !TOKEN;

// Origins for the "cheap from" explorer, and the featured calendar route.
const ORIGINS = [
  { code: 'MOW', ru: 'Москва', en: 'Moscow' },
  { code: 'LED', ru: 'Санкт-Петербург', en: 'Saint Petersburg' },
  { code: 'AER', ru: 'Сочи', en: 'Sochi' },
  { code: 'SVX', ru: 'Екатеринбург', en: 'Yekaterinburg' },
];
const CALENDAR_ROUTE = { origin: 'MOW', destination: 'IST' };

// IATA → display name (curated; unknown codes fall back to the code).
const CITY = {
  MOW: { ru: 'Москва', en: 'Moscow' }, LED: { ru: 'Санкт-Петербург', en: 'Saint Petersburg' },
  AER: { ru: 'Сочи', en: 'Sochi' }, SVX: { ru: 'Екатеринбург', en: 'Yekaterinburg' },
  KZN: { ru: 'Казань', en: 'Kazan' }, KGD: { ru: 'Калининград', en: 'Kaliningrad' },
  MRV: { ru: 'Минеральные Воды', en: 'Mineralnye Vody' }, OVB: { ru: 'Новосибирск', en: 'Novosibirsk' },
  KRR: { ru: 'Краснодар', en: 'Krasnodar' }, ROV: { ru: 'Ростов-на-Дону', en: 'Rostov' },
  UFA: { ru: 'Уфа', en: 'Ufa' }, VVO: { ru: 'Владивосток', en: 'Vladivostok' },
  GOJ: { ru: 'Нижний Новгород', en: 'Nizhny Novgorod' }, SGC: { ru: 'Сургут', en: 'Surgut' },
  KUF: { ru: 'Самара', en: 'Samara' }, ARH: { ru: 'Архангельск', en: 'Arkhangelsk' },
  RTW: { ru: 'Саратов', en: 'Saratov' }, MCX: { ru: 'Махачкала', en: 'Makhachkala' },
  VOG: { ru: 'Волгоград', en: 'Volgograd' }, BUS: { ru: 'Батуми', en: 'Batumi' },
  MMK: { ru: 'Мурманск', en: 'Murmansk' }, CEK: { ru: 'Челябинск', en: 'Chelyabinsk' },
  PEE: { ru: 'Пермь', en: 'Perm' }, KJA: { ru: 'Красноярск', en: 'Krasnoyarsk' },
  AAQ: { ru: 'Анапа', en: 'Anapa' }, VOZ: { ru: 'Воронеж', en: 'Voronezh' },
  IST: { ru: 'Стамбул', en: 'Istanbul' }, AYT: { ru: 'Анталия', en: 'Antalya' },
  DXB: { ru: 'Дубай', en: 'Dubai' }, EVN: { ru: 'Ереван', en: 'Yerevan' },
  TBS: { ru: 'Тбилиси', en: 'Tbilisi' }, GYD: { ru: 'Баку', en: 'Baku' },
  TAS: { ru: 'Ташкент', en: 'Tashkent' }, NQZ: { ru: 'Астана', en: 'Astana' },
  ALA: { ru: 'Алматы', en: 'Almaty' }, BKK: { ru: 'Бангкок', en: 'Bangkok' },
  HKT: { ru: 'Пхукет', en: 'Phuket' }, DEL: { ru: 'Дели', en: 'Delhi' },
  CAI: { ru: 'Каир', en: 'Cairo' }, HRG: { ru: 'Хургада', en: 'Hurghada' },
  SSH: { ru: 'Шарм-эль-Шейх', en: 'Sharm El Sheikh' }, MLE: { ru: 'Мале', en: 'Male' },
  PEK: { ru: 'Пекин', en: 'Beijing' }, BJS: { ru: 'Пекин', en: 'Beijing' },
  BEG: { ru: 'Белград', en: 'Belgrade' }, MSQ: { ru: 'Минск', en: 'Minsk' },
};

const cityName = (code, lang) => (CITY[code] && CITY[code][lang]) || code;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(path, params) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { 'x-access-token': TOKEN, 'Accept-Encoding': 'gzip' } });
  if (res.status === 429) throw new Error('rate limited (429)');
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.success === false) throw new Error(`${path} → API error: ${json.error || 'unknown'}`);
  return json;
}

function median(nums) {
  const a = [...nums].sort((x, y) => x - y);
  const n = a.length;
  if (!n) return null;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

// DDMM from 'YYYY-MM-DD' or an ISO datetime.
const ddmm = (s) => {
  if (!s) return '';
  const d = String(s).slice(0, 10);
  return d.length >= 10 ? d.slice(8, 10) + d.slice(5, 7) : '';
};

// Affiliate deep link to the Aviasales search for a specific flight.
function aviaLink({ origin, destination, depart_date, return_date }) {
  let path = origin + ddmm(depart_date) + destination;
  if (return_date) path += ddmm(return_date);
  path += '1'; // 1 adult
  const u = new URL('https://www.aviasales.com/search/' + path);
  if (MARKER) u.searchParams.set('marker', MARKER);
  u.searchParams.set('currency', CURRENCY);
  return u.toString();
}

function localizedName(code) {
  return { ru: cityName(code, 'ru'), en: cityName(code, 'en') };
}

// ---- 1. hot flights (cheapest recent, scored vs route median) ----
const matrixCache = new Map();
async function routeMedian(origin, destination) {
  const key = `${origin}-${destination}`;
  if (matrixCache.has(key)) return matrixCache.get(key);
  let result = { median: null, samples: 0 };
  try {
    const json = await apiGet('/v2/prices/month-matrix', {
      currency: CURRENCY, origin, destination, show_to_affiliates: true, market: MARKET,
    });
    const values = (json.data || []).map((d) => Number(d.value)).filter((v) => v > 0);
    result = { median: median(values), samples: values.length };
  } catch (e) {
    console.warn(`[skip matrix] ${key}: ${e.message}`);
  }
  matrixCache.set(key, result);
  return result;
}

async function fetchHotFlights() {
  const json = await apiGet('/v2/prices/latest', {
    currency: CURRENCY, period_type: 'year', sorting: 'price',
    limit: LIMIT, show_to_affiliates: true, market: MARKET, one_way: false,
  });
  const latest = Array.isArray(json.data) ? json.data : [];
  const scored = [];
  for (const t of latest) {
    if (!t.origin || !t.destination || !(t.value > 0)) continue;
    const { median: med, samples } = await routeMedian(t.origin, t.destination);
    await sleep(REQUEST_DELAY_MS);
    if (!med || samples < MIN_SAMPLES) continue;
    const discount = (med - t.value) / med;
    if (discount < MIN_DISCOUNT) continue;
    scored.push({
      origin: t.origin, destination: t.destination,
      originName: localizedName(t.origin), destName: localizedName(t.destination),
      depart_date: t.depart_date, return_date: t.return_date || null,
      price: Math.round(t.value), median: Math.round(med),
      discount: Math.round(discount * 100) / 100,
      transfers: t.number_of_changes ?? null,
      link: aviaLink(t),
    });
  }
  scored.sort((a, b) => b.discount - a.discount);
  return scored.slice(0, TOP_HOT);
}

// ---- 2. cheap destinations from an origin city ----
async function fetchCheapFrom(origin) {
  const json = await apiGet('/v1/city-directions', { currency: CURRENCY, origin });
  const data = json.data || {};
  const items = Object.entries(data)
    .map(([destination, d]) => ({
      destination, destName: localizedName(destination),
      price: Math.round(Number(d.price) || 0),
      transfers: d.transfers ?? null,
      depart_date: (d.departure_at || '').slice(0, 10) || null,
      return_date: (d.return_at || '').slice(0, 10) || null,
      link: aviaLink({ origin, destination, depart_date: d.departure_at, return_date: d.return_at }),
    }))
    .filter((x) => x.price > 0 && x.destination !== origin)
    .sort((a, b) => a.price - b.price)
    .slice(0, CHEAP_PER_CITY);
  return items;
}

// ---- 3. price calendar for a featured route ----
function priceLevel(price, min, max) {
  if (max === min) return 'mid';
  const r = (price - min) / (max - min);
  if (r <= 0.34) return 'cheap';
  if (r <= 0.67) return 'mid';
  return 'expensive';
}

async function fetchCalendar({ origin, destination }) {
  const json = await apiGet('/v1/prices/calendar', {
    currency: CURRENCY, origin, destination, calendar_type: 'departure_date',
  });
  const data = json.data || {};
  const rows = Object.entries(data)
    .map(([date, d]) => ({ date, price: Math.round(Number(d.price) || 0), transfers: d.transfers ?? null }))
    .filter((x) => x.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 21);
  if (!rows.length) return null;
  const prices = rows.map((r) => r.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const days = rows.map((r) => ({
    ...r, level: priceLevel(r.price, min, max),
    link: aviaLink({ origin, destination, depart_date: r.date }),
  }));
  return {
    origin, destination,
    originName: localizedName(origin), destName: localizedName(destination),
    cheapest: days.reduce((a, b) => (b.price < a.price ? b : a)),
    days,
  };
}

async function main() {
  console.log(DRY_RUN ? '=== DRY-RUN (no token — sample radar.json) ===' : '=== live Travelpayouts Data API ===');

  let payload;
  if (DRY_RUN) {
    payload = SAMPLE();
  } else {
    const hotFlights = await fetchHotFlights();
    console.log(`hotFlights: ${hotFlights.length}`);

    const cheapFrom = [];
    for (const o of ORIGINS) {
      try {
        const items = await fetchCheapFrom(o.code);
        cheapFrom.push({ code: o.code, name: { ru: o.ru, en: o.en }, items });
        console.log(`cheapFrom ${o.code}: ${items.length}`);
      } catch (e) {
        console.warn(`[skip cheapFrom] ${o.code}: ${e.message}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }

    let calendar = null;
    try {
      calendar = await fetchCalendar(CALENDAR_ROUTE);
      console.log(`calendar ${CALENDAR_ROUTE.origin}-${CALENDAR_ROUTE.destination}: ${calendar ? calendar.days.length + ' days' : 'none'}`);
    } catch (e) {
      console.warn(`[skip calendar]: ${e.message}`);
    }

    payload = {
      updatedAt: new Date().toISOString(), source: 'travelpayouts',
      market: MARKET, currency: CURRENCY, marker: MARKER,
      hotFlights, cheapFrom, calendar,
    };
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`\nWrote public/radar.json (${payload.hotFlights.length} hot, ${payload.cheapFrom.length} cities, calendar ${payload.calendar ? 'yes' : 'no'})`);
}

// Minimal offline sample so the page renders without a token.
function SAMPLE() {
  const link = (o, d, dep, ret) => aviaLink({ origin: o, destination: d, depart_date: dep, return_date: ret });
  const nm = localizedName;
  return {
    updatedAt: new Date().toISOString(), source: 'sample', market: MARKET, currency: CURRENCY, marker: MARKER,
    hotFlights: [
      { origin: 'AER', destination: 'MRV', originName: nm('AER'), destName: nm('MRV'), depart_date: '2026-07-17', return_date: '2026-07-18', price: 4787, median: 6415, discount: 0.25, transfers: 0, link: link('AER', 'MRV', '2026-07-17', '2026-07-18') },
      { origin: 'MOW', destination: 'IST', originName: nm('MOW'), destName: nm('IST'), depart_date: '2026-08-14', return_date: '2026-08-24', price: 8900, median: 14300, discount: 0.38, transfers: 0, link: link('MOW', 'IST', '2026-08-14', '2026-08-24') },
      { origin: 'MOW', destination: 'DXB', originName: nm('MOW'), destName: nm('DXB'), depart_date: '2026-09-03', return_date: '2026-09-13', price: 18400, median: 25600, discount: 0.28, transfers: 1, link: link('MOW', 'DXB', '2026-09-03', '2026-09-13') },
    ],
    cheapFrom: [
      { code: 'MOW', name: { ru: 'Москва', en: 'Moscow' }, items: [
        { destination: 'EVN', destName: nm('EVN'), price: 6200, transfers: 0, depart_date: '2026-09-28', return_date: '2026-10-11', link: link('MOW', 'EVN', '2026-09-28', '2026-10-11') },
        { destination: 'IST', destName: nm('IST'), price: 8900, transfers: 0, depart_date: '2026-08-14', return_date: '2026-08-24', link: link('MOW', 'IST', '2026-08-14', '2026-08-24') },
        { destination: 'DXB', destName: nm('DXB'), price: 18400, transfers: 1, depart_date: '2026-09-03', return_date: '2026-09-13', link: link('MOW', 'DXB', '2026-09-03', '2026-09-13') },
      ] },
    ],
    calendar: {
      origin: 'MOW', destination: 'IST', originName: nm('MOW'), destName: nm('IST'),
      cheapest: { date: '2026-08-18', price: 8900, level: 'cheap', link: link('MOW', 'IST', '2026-08-18') },
      days: [
        { date: '2026-08-15', price: 12300, transfers: 0, level: 'expensive', link: link('MOW', 'IST', '2026-08-15') },
        { date: '2026-08-16', price: 11800, transfers: 0, level: 'expensive', link: link('MOW', 'IST', '2026-08-16') },
        { date: '2026-08-17', price: 9200, transfers: 1, level: 'mid', link: link('MOW', 'IST', '2026-08-17') },
        { date: '2026-08-18', price: 8900, transfers: 0, level: 'cheap', link: link('MOW', 'IST', '2026-08-18') },
        { date: '2026-08-19', price: 9400, transfers: 1, level: 'mid', link: link('MOW', 'IST', '2026-08-19') },
        { date: '2026-08-20', price: 10200, transfers: 1, level: 'mid', link: link('MOW', 'IST', '2026-08-20') },
        { date: '2026-08-21', price: 13100, transfers: 0, level: 'expensive', link: link('MOW', 'IST', '2026-08-21') },
      ],
    },
  };
}

main().catch((e) => { console.error('fatal:', e); process.exitCode = 1; });
