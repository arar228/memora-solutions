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
// Visa allowlist (shared with the page) — the radar only surfaces destinations
// an RF citizen can reach without a pre-arranged visa. Domestic + visa-required
// routes are filtered out; each kept destination carries its visa label.
import { VISA_DESTINATIONS, isVisaTarget, visaInfo } from '../src/pages/TravelRadar3/visaDestinations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'public', 'radar.json');

const API = 'https://api.travelpayouts.com';
const TOKEN = process.env.TRAVELPAYOUTS_TOKEN || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '748397';
const CURRENCY = (process.env.TP_CURRENCY || 'rub').toLowerCase();
const MARKET = (process.env.TP_MARKET || 'ru').toLowerCase();

const LATEST_LIMIT = 200;      // deals to request from the global /latest
const MIN_DISCOUNT = 0.05;     // show anything >= 5% below the route median (sorted best-first)
const MIN_SAMPLES = 3;         // require enough matrix points to trust the median
const TOP_HOT = 120;           // max "best value" flights to publish (lots of data)
const HOT_POOL = 500;          // max routes to score (parallel, see per-origin selection)
const CANDIDATES_PER_ORIGIN = 12; // cheapest visa routes scored PER origin — so each
                                 // city's own leisure deals get a fair chance, not just
                                 // the globally-cheapest CIS hops
const CHEAP_PER_CITY = 80;     // per origin: show ALL visa-free destinations the API returns (high cap = effectively uncapped)
const CAL_MAX = 120;           // max routes to build a price calendar for
const CONCURRENCY = 8;         // parallel API requests in flight (apiGet retries 429/5xx)
const DRY_RUN = !TOKEN;

// RF origin cities for the "cheap from" explorer (also the candidate pool for
// hot flights). Broad coverage — cities whose airport is closed/quiet simply
// return no data and are dropped from the UI, so over-including is harmless.
const ORIGINS = [
  { code: 'MOW', ru: 'Москва', en: 'Moscow' },
  { code: 'LED', ru: 'Санкт-Петербург', en: 'Saint Petersburg' },
  { code: 'AER', ru: 'Сочи', en: 'Sochi' },
  { code: 'SVX', ru: 'Екатеринбург', en: 'Yekaterinburg' },
  { code: 'KZN', ru: 'Казань', en: 'Kazan' },
  { code: 'OVB', ru: 'Новосибирск', en: 'Novosibirsk' },
  { code: 'KJA', ru: 'Красноярск', en: 'Krasnoyarsk' },
  { code: 'UFA', ru: 'Уфа', en: 'Ufa' },
  { code: 'KUF', ru: 'Самара', en: 'Samara' },
  { code: 'CEK', ru: 'Челябинск', en: 'Chelyabinsk' },
  { code: 'PEE', ru: 'Пермь', en: 'Perm' },
  { code: 'GOJ', ru: 'Нижний Новгород', en: 'Nizhny Novgorod' },
  { code: 'VVO', ru: 'Владивосток', en: 'Vladivostok' },
  { code: 'KGD', ru: 'Калининград', en: 'Kaliningrad' },
  { code: 'MRV', ru: 'Минеральные Воды', en: 'Mineralnye Vody' },
  { code: 'MCX', ru: 'Махачкала', en: 'Makhachkala' },
  { code: 'TJM', ru: 'Тюмень', en: 'Tyumen' },
  { code: 'OMS', ru: 'Омск', en: 'Omsk' },
  { code: 'IKT', ru: 'Иркутск', en: 'Irkutsk' },
  { code: 'SGC', ru: 'Сургут', en: 'Surgut' },
  { code: 'KHV', ru: 'Хабаровск', en: 'Khabarovsk' },
  { code: 'VOG', ru: 'Волгоград', en: 'Volgograd' },
  { code: 'ROV', ru: 'Ростов-на-Дону', en: 'Rostov-on-Don' },
  { code: 'KRR', ru: 'Краснодар', en: 'Krasnodar' },
  { code: 'AAQ', ru: 'Анапа', en: 'Anapa' },
  { code: 'VOZ', ru: 'Воронеж', en: 'Voronezh' },
  { code: 'GSV', ru: 'Саратов', en: 'Saratov' },
  { code: 'ASF', ru: 'Астрахань', en: 'Astrakhan' },
  { code: 'REN', ru: 'Оренбург', en: 'Orenburg' },
  { code: 'ULV', ru: 'Ульяновск', en: 'Ulyanovsk' },
  { code: 'NBC', ru: 'Нижнекамск', en: 'Nizhnekamsk' },
  { code: 'CSY', ru: 'Чебоксары', en: 'Cheboksary' },
  { code: 'IJK', ru: 'Ижевск', en: 'Izhevsk' },
  { code: 'KVX', ru: 'Киров', en: 'Kirov' },
  { code: 'PEZ', ru: 'Пенза', en: 'Penza' },
  { code: 'NJC', ru: 'Нижневартовск', en: 'Nizhnevartovsk' },
  { code: 'NUX', ru: 'Новый Уренгой', en: 'Novy Urengoy' },
  { code: 'MQF', ru: 'Магнитогорск', en: 'Magnitogorsk' },
  { code: 'BAX', ru: 'Барнаул', en: 'Barnaul' },
  { code: 'TOF', ru: 'Томск', en: 'Tomsk' },
  { code: 'KEJ', ru: 'Кемерово', en: 'Kemerovo' },
  { code: 'ABA', ru: 'Абакан', en: 'Abakan' },
  { code: 'UUD', ru: 'Улан-Удэ', en: 'Ulan-Ude' },
  { code: 'HTA', ru: 'Чита', en: 'Chita' },
  { code: 'YKS', ru: 'Якутск', en: 'Yakutsk' },
  { code: 'UUS', ru: 'Южно-Сахалинск', en: 'Yuzhno-Sakhalinsk' },
  { code: 'PKC', ru: 'Петропавловск-Камчатский', en: 'Petropavlovsk-Kamchatsky' },
  { code: 'MMK', ru: 'Мурманск', en: 'Murmansk' },
  { code: 'ARH', ru: 'Архангельск', en: 'Arkhangelsk' },
  { code: 'NAL', ru: 'Нальчик', en: 'Nalchik' },
  { code: 'GRV', ru: 'Грозный', en: 'Grozny' },
  { code: 'OGZ', ru: 'Владикавказ', en: 'Vladikavkaz' },
  { code: 'STW', ru: 'Ставрополь', en: 'Stavropol' },
];
// Hot flights must depart FROM Russia — restrict candidate origins to our list.
const ORIGIN_SET = new Set(ORIGINS.map((o) => o.code));
// Featured routes for the price calendar (all from Moscow → unique VISA-FREE
// destinations, so the selector chips read cleanly as destination names).
const CALENDAR_ROUTES = [
  { origin: 'MOW', destination: 'IST' }, // Стамбул
  { origin: 'MOW', destination: 'AYT' }, // Анталия
  { origin: 'MOW', destination: 'DXB' }, // Дубай
  { origin: 'MOW', destination: 'HRG' }, // Хургада
  { origin: 'MOW', destination: 'HKT' }, // Пхукет
  { origin: 'MOW', destination: 'BKK' }, // Бангкок
  { origin: 'MOW', destination: 'EVN' }, // Ереван
  { origin: 'MOW', destination: 'TBS' }, // Тбилиси
  { origin: 'MOW', destination: 'GYD' }, // Баку
  { origin: 'MOW', destination: 'MLE' }, // Мале
];

// Hotels: the Hotellook price Data API is shut down, so there is NO live hotel
// price feed. We surface hotel SEARCH links only (affiliate, marker-carrying)
// for visa-free destination hubs. Isolated builder + city list so this can be
// swapped to an active hotels program later without touching the page.
const HOTEL_CITIES = ['IST', 'AYT', 'DXB', 'HRG', 'SSH', 'HKT', 'BKK', 'MLE', 'EVN', 'TBS', 'GYD', 'TAS'];

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

// RF origin display names, sourced from ORIGINS (single source of truth).
const ORIGIN_NAME = Object.fromEntries(ORIGINS.map((o) => [o.code, { ru: o.ru, en: o.en }]));

// Names resolve: visa catalog (foreign cities) → RF origins → misc CITY → code.
const cityName = (code, lang) =>
  (VISA_DESTINATIONS[code] && VISA_DESTINATIONS[code].city[lang])
  || (ORIGIN_NAME[code] && ORIGIN_NAME[code][lang])
  || (CITY[code] && CITY[code][lang])
  || code;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run fn over items with at most `concurrency` requests in flight. Preserves
// input order in the result. Lets us fetch far more data in the same wall-clock
// time than a sequential loop with per-call delays.
async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function apiGet(path, params, attempt = 1) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  try {
    const res = await fetch(url, { headers: { 'x-access-token': TOKEN, 'Accept-Encoding': 'gzip' } });
    if (res.status === 429 || res.status >= 500) throw new Error(`transient HTTP ${res.status}`);
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
    const json = await res.json();
    if (json && json.success === false) throw new Error(`${path} → API error: ${json.error || 'unknown'}`);
    return json;
  } catch (e) {
    // Retry transient network flaps / 429 / 5xx a couple of times.
    const transient = /transient|fetch failed|ECONN|ETIMEDOUT|network|timeout/i.test(e.message);
    if (attempt < 3 && transient) {
      await sleep(400 * attempt);
      return apiGet(path, params, attempt + 1);
    }
    throw e;
  }
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
  // .ru — the Russian Aviasales site (RF market, ₽); marker still attributes.
  const u = new URL('https://www.aviasales.ru/search/' + path);
  if (MARKER) u.searchParams.set('marker', MARKER);
  u.searchParams.set('currency', CURRENCY);
  return u.toString();
}

function localizedName(code) {
  return { ru: cityName(code, 'ru'), en: cityName(code, 'en') };
}

// ---- hotels: affiliate search link only (no live price API) ----
function hotelDates() {
  const ci = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
  const co = new Date(Date.now() + 47 * 864e5).toISOString().slice(0, 10);
  return { checkIn: ci, checkOut: co };
}

function hotelSearchLink(cityEn, checkIn, checkOut) {
  const u = new URL('https://search.hotellook.com/');
  u.searchParams.set('destination', cityEn);
  u.searchParams.set('checkIn', checkIn);   // capital I
  u.searchParams.set('checkOut', checkOut); // capital O
  u.searchParams.set('adults', '1');
  u.searchParams.set('currency', CURRENCY);
  u.searchParams.set('language', MARKET === 'ru' ? 'ru' : 'en');
  if (MARKER) u.searchParams.set('marker', MARKER);
  return u.toString();
}

function buildHotelCities() {
  const { checkIn, checkOut } = hotelDates();
  return HOTEL_CITIES.map((code) => ({
    code, name: localizedName(code), checkIn, checkOut,
    link: hotelSearchLink(cityName(code, 'en'), checkIn, checkOut),
  }));
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

async function fetchLatestGlobal() {
  const json = await apiGet('/v2/prices/latest', {
    currency: CURRENCY, period_type: 'year', sorting: 'price',
    limit: LATEST_LIMIT, show_to_affiliates: true, market: MARKET, one_way: false,
  });
  return (Array.isArray(json.data) ? json.data : []).map((t) => ({
    origin: t.origin, destination: t.destination, price: Number(t.value),
    depart_date: t.depart_date, return_date: t.return_date || null,
    transfers: t.number_of_changes ?? null,
  }));
}

// Score a candidate pool by discount vs the route median; keep genuinely hot,
// well-supported deals. Candidates come from the global /latest AND every
// cheap-from item, so the pool is much larger than /latest alone.
async function buildHotFlights(candidates) {
  const byRoute = new Map();
  for (const c of candidates) {
    if (!c.origin || !c.destination || c.origin === c.destination || !(c.price > 0)) continue;
    if (!ORIGIN_SET.has(c.origin)) continue;    // must depart FROM Russia
    if (!isVisaTarget(c.destination)) continue; // visa-free destination only
    const key = `${c.origin}-${c.destination}`;
    if (!byRoute.has(key) || c.price < byRoute.get(key).price) byRoute.set(key, c);
  }
  // Select candidates PER ORIGIN (cheapest N each), NOT globally cheapest — so
  // every city's own leisure routes (Turkey/Egypt/UAE/Thailand) reach the median
  // scoring. Global cheapest would only ever be short CIS hops that are cheap but
  // never discounted, which is why the feed showed almost no hot flights.
  const byOrigin = new Map();
  for (const c of byRoute.values()) {
    if (!byOrigin.has(c.origin)) byOrigin.set(c.origin, []);
    byOrigin.get(c.origin).push(c);
  }
  let pool = [];
  for (const arr of byOrigin.values()) {
    arr.sort((a, b) => a.price - b.price);
    pool.push(...arr.slice(0, CANDIDATES_PER_ORIGIN));
  }
  pool = pool.slice(0, HOT_POOL);

  const scoredRaw = await mapPool(pool, CONCURRENCY, async (t) => {
    const { median: med, samples } = await routeMedian(t.origin, t.destination);
    if (!med || samples < MIN_SAMPLES) return null;
    const discount = (med - t.price) / med;
    if (discount < MIN_DISCOUNT) return null;
    return {
      origin: t.origin, destination: t.destination,
      originName: localizedName(t.origin), destName: localizedName(t.destination),
      visa: visaInfo(t.destination),
      depart_date: t.depart_date, return_date: t.return_date || null,
      price: Math.round(t.price), median: Math.round(med),
      discount: Math.round(discount * 100) / 100,
      transfers: t.transfers ?? null,
      link: aviaLink(t),
    };
  });
  const scored = scoredRaw.filter(Boolean);
  scored.sort((a, b) => b.discount - a.discount);
  return scored.slice(0, TOP_HOT);
}

// ---- 2. destinations from an origin city ----
// Merge TWO sources so the explorer has as many visa-free destinations as the
// API can give (not just the ~10-15 from city-directions):
//   /v1/city-directions        — cheapest ticket per destination
//   /v2/prices/latest?origin=X  — many more recent cheap tickets (more places/dates)
// Dedup by destination keeping the cheapest; visa-free only.
async function fetchCheapFrom(origin) {
  const byDest = new Map();
  const add = (destination, price, dep, ret, transfers) => {
    if (!isVisaTarget(destination) || destination === origin || !(price > 0)) return;
    const p = Math.round(price);
    const cur = byDest.get(destination);
    if (!cur || p < cur.price) {
      byDest.set(destination, {
        destination, destName: localizedName(destination), visa: visaInfo(destination),
        price: p, transfers: transfers ?? null,
        depart_date: (dep || '').slice(0, 10) || null,
        return_date: (ret || '').slice(0, 10) || null,
        link: aviaLink({ origin, destination, depart_date: dep, return_date: ret }),
      });
    }
  };

  try {
    const json = await apiGet('/v1/city-directions', { currency: CURRENCY, origin });
    for (const [dest, d] of Object.entries(json.data || {})) {
      add(dest, Number(d.price) || 0, d.departure_at, d.return_at, d.transfers);
    }
  } catch (e) { console.warn(`[skip city-directions] ${origin}: ${e.message}`); }
  try {
    const json = await apiGet('/v2/prices/latest', {
      currency: CURRENCY, origin, period_type: 'year', sorting: 'price',
      limit: 500, show_to_affiliates: true, market: MARKET, one_way: false,
    });
    for (const t of (Array.isArray(json.data) ? json.data : [])) {
      add(t.destination, Number(t.value) || 0, t.depart_date, t.return_date, t.number_of_changes);
    }
  } catch (e) { console.warn(`[skip latest] ${origin}: ${e.message}`); }

  return [...byDest.values()].sort((a, b) => a.price - b.price).slice(0, CHEAP_PER_CITY);
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
    .slice(0, 60);
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
    visa: visaInfo(destination),
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
    // 1. destinations per origin (also the candidate pool for hot flights) — parallel
    const cheapFromRaw = await mapPool(ORIGINS, CONCURRENCY, async (o) => {
      try {
        const items = await fetchCheapFrom(o.code);
        console.log(`cheapFrom ${o.code}: ${items.length}`);
        return items.length ? { code: o.code, name: { ru: o.ru, en: o.en }, items } : null;
      } catch (e) {
        console.warn(`[skip cheapFrom] ${o.code}: ${e.message}`);
        return null;
      }
    });
    const cheapFrom = cheapFromRaw.filter(Boolean);

    // 2. hot flights = global /latest + every cheap-from item, scored vs median
    let globalLatest = [];
    try { globalLatest = await fetchLatestGlobal(); }
    catch (e) { console.warn(`[skip latest] ${e.message}`); }
    const candidates = [
      ...globalLatest,
      ...cheapFrom.flatMap((c) => c.items.map((it) => ({
        origin: c.code, destination: it.destination, price: it.price,
        depart_date: it.depart_date, return_date: it.return_date, transfers: it.transfers,
      }))),
    ];
    const hotFlights = await buildHotFlights(candidates);
    console.log(`hotFlights: ${hotFlights.length} (from ${candidates.length} candidates)`);

    // 3. price calendars for every route we have — curated popular ones first,
    //    then every cheap-from destination across all origins (deduped, capped).
    const routeSet = new Map();
    const addRoute = (o, d) => {
      if (o && d && o !== d && isVisaTarget(d)) routeSet.set(`${o}-${d}`, { origin: o, destination: d });
    };
    CALENDAR_ROUTES.forEach((r) => addRoute(r.origin, r.destination));
    cheapFrom.forEach((c) => c.items.forEach((it) => addRoute(c.code, it.destination)));
    const routes = [...routeSet.values()].slice(0, CAL_MAX);

    const calRaw = await mapPool(routes, CONCURRENCY, async (r) => {
      try {
        const cal = await fetchCalendar(r);
        return (cal && cal.days.length >= 5) ? cal : null;
      } catch (e) {
        console.warn(`[skip calendar] ${r.origin}-${r.destination}: ${e.message}`);
        return null;
      }
    });
    const calendars = calRaw.filter(Boolean);
    console.log(`calendars: ${calendars.length} routes (from ${routes.length} tried)`);

    payload = {
      updatedAt: new Date().toISOString(), source: 'travelpayouts',
      market: MARKET, currency: CURRENCY, marker: MARKER,
      hotFlights, cheapFrom, calendars,
    };
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`\nWrote public/radar.json (${payload.hotFlights.length} hot, ${payload.cheapFrom.length} cities, ${payload.calendars.length} calendars)`);
}

// Minimal offline sample so the page renders without a token. All routes are
// RF origin → visa-free / easy-visa destinations (mirrors the live filter).
function SAMPLE() {
  const link = (o, d, dep, ret) => aviaLink({ origin: o, destination: d, depart_date: dep, return_date: ret });
  const nm = localizedName;
  const hot = (o, d, dep, ret, price, median, transfers) => ({
    origin: o, destination: d, originName: nm(o), destName: nm(d), visa: visaInfo(d),
    depart_date: dep, return_date: ret, price, median,
    discount: Math.round((1 - price / median) * 100) / 100, transfers, link: link(o, d, dep, ret),
  });
  const cheap = (o, d, dep, ret, price, transfers) => ({
    destination: d, destName: nm(d), visa: visaInfo(d), price, transfers,
    depart_date: dep, return_date: ret, link: link(o, d, dep, ret),
  });
  // Demo cheapFrom: a broad pool of visa-free destinations for every origin, so
  // the "where to fly visa-free" explorer shows the full breadth offline. Live,
  // /v1/city-directions returns the real per-destination cheapest and
  // CHEAP_PER_CITY keeps them all.
  const DEMO_ORIGINS = ['MOW', 'LED', 'SVX', 'KZN', 'OVB', 'AER', 'KRR', 'UFA'];
  const POOL = [
    ['EVN', 6200, 0], ['MSQ', 7800, 0], ['IST', 8900, 0], ['GYD', 9500, 0], ['TBS', 12100, 0],
    ['BUS', 12800, 0], ['NQZ', 12200, 0], ['ALA', 13100, 0], ['AYT', 13900, 0], ['TAS', 14500, 0],
    ['HRG', 15200, 0], ['SSH', 16900, 0], ['DXB', 18400, 1], ['BEG', 18500, 1], ['TIV', 21000, 1],
    ['DOH', 24000, 1], ['TUN', 27000, 1], ['PEK', 29000, 1], ['CMN', 31000, 1], ['BKK', 33000, 1],
    ['HKT', 34500, 1], ['SYX', 36000, 1], ['CMB', 38000, 1], ['MLE', 41000, 1], ['ZNZ', 44000, 1],
    ['HAV', 58000, 1], ['PUJ', 62000, 1],
  ];
  const DATES = [
    ['2026-08-14', '2026-08-24'], ['2026-09-03', '2026-09-13'], ['2026-09-28', '2026-10-08'],
    ['2026-10-10', '2026-10-20'], ['2026-11-05', '2026-11-19'],
  ];
  const cheapFrom = DEMO_ORIGINS.map((o, oi) => ({
    code: o, name: nm(o),
    items: POOL
      .filter(([d]) => d !== o)
      .map(([d, base, tr], di) => {
        const [dep, ret] = DATES[di % DATES.length];
        return cheap(o, d, dep, ret, base + oi * 850 + di * 40, tr);
      })
      .sort((a, b) => a.price - b.price),
  }));
  // Demo hot flights: many discounted deals across origins/destinations, sorted
  // by discount (live, buildHotFlights scores the real candidate pool).
  const HOT = [
    ['MOW', 'IST', 8900, 14300, 0], ['LED', 'AYT', 12900, 19800, 0], ['LED', 'HKT', 34500, 46000, 1],
    ['MOW', 'HRG', 15200, 21000, 0], ['LED', 'EVN', 9800, 13500, 0], ['MOW', 'DXB', 18400, 25600, 1],
    ['SVX', 'AYT', 14900, 21500, 0], ['KZN', 'IST', 11800, 16900, 0], ['OVB', 'BKK', 28900, 39000, 0],
    ['MOW', 'SSH', 16900, 23800, 0], ['KRR', 'GYD', 11100, 15600, 0], ['UFA', 'DXB', 20200, 27800, 1],
    ['MOW', 'TBS', 10200, 14100, 0], ['LED', 'TIV', 21000, 28500, 1], ['SVX', 'HKT', 32500, 44000, 1],
    ['MOW', 'MLE', 41000, 55000, 1], ['KZN', 'SSH', 16900, 23000, 0], ['AER', 'IST', 9900, 13800, 0],
    ['MOW', 'DOH', 24000, 32500, 1], ['LED', 'DXB', 21000, 28000, 1], ['OVB', 'HKT', 31200, 42000, 1],
    ['MOW', 'ZNZ', 44000, 58000, 1], ['KRR', 'AYT', 12400, 17200, 0], ['MOW', 'PEK', 29000, 38500, 1],
  ];
  const hotFlights = HOT
    .map(([o, d, price, median, tr], i) => {
      const [dep, ret] = DATES[i % DATES.length];
      return hot(o, d, dep, ret, price, median, tr);
    })
    .sort((a, b) => b.discount - a.discount);
  // Demo calendars: 30-day heatmaps for a few routes across origins.
  const mkCal = (o, d, base) => {
    const start = new Date('2026-08-03').getTime();
    const raw = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(start + i * 864e5).toISOString().slice(0, 10);
      const price = Math.round(base * (1 + 0.32 * Math.sin(i / 2.3)) + (i % 7 === 0 ? base * 0.12 : 0));
      raw.push({ date, price, transfers: i % 3 === 0 ? 0 : 1 });
    }
    const prices = raw.map((r) => r.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    const days = raw.map((r) => ({ ...r, level: priceLevel(r.price, min, max), link: link(o, d, r.date) }));
    const cheapest = days.reduce((a, b) => (b.price < a.price ? b : a));
    return { origin: o, destination: d, originName: nm(o), destName: nm(d), visa: visaInfo(d), cheapest, days };
  };
  const calendars = [mkCal('MOW', 'IST', 9500), mkCal('LED', 'AYT', 13500), mkCal('MOW', 'DXB', 19000)];
  return {
    updatedAt: new Date().toISOString(), source: 'sample', market: MARKET, currency: CURRENCY, marker: MARKER,
    hotFlights,
    cheapFrom,
    calendars,
  };
}

main().catch((e) => { console.error('fatal:', e); process.exitCode = 1; });
