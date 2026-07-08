/**
 * fetch-flights.js — "hot flights" source for Memora Travel Radar, built on the
 * official Travelpayouts (Aviasales) DATA API.
 *
 * Pipeline:
 *   1. GET /v2/prices/latest  (no origin/destination) → the 30 cheapest tickets
 *      Aviasales found in the last 48h.
 *   2. For each route, GET /v2/prices/month-matrix (origin+destination) → take
 *      the MEDIAN price as the route's "normal" price.
 *   3. score = discount vs that median. Keep only genuinely hot, well-supported
 *      deals (>= MIN_DISCOUNT, >= MIN_SAMPLES matrix points).
 *   4. Build an affiliate deep link to aviasales.com with our marker.
 *   5. Write public/flights.json (the queue) and, if configured, post NEW deals
 *      to the Telegram channel.
 *
 * The Data API is CACHED by Aviasales (not realtime, kept ~7 days), so this runs
 * on a cron (every 1–3h). No realtime Search API (that needs 50k+ MAU). No deps —
 * Node 18+ built-in fetch.
 *
 * Config (env / CI secrets):
 *   TRAVELPAYOUTS_TOKEN   (required for live mode; x-access-token)
 *   TRAVELPAYOUTS_MARKER  (affiliate marker for deep links)
 *   TP_CURRENCY=rub  TP_MARKET=ru
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL  (optional — post to the channel)
 * Without a token it runs in DRY-RUN mode on a built-in sample so the scoring /
 * link / output logic is fully exercisable offline.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'public', 'flights.json');

const API = 'https://api.travelpayouts.com';
const TOKEN = process.env.TRAVELPAYOUTS_TOKEN || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '';
const CURRENCY = (process.env.TP_CURRENCY || 'rub').toLowerCase();
const MARKET = (process.env.TP_MARKET || 'ru').toLowerCase();
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL || '';

const LIMIT = 30;               // deals to request from /latest
const MIN_DISCOUNT = 0.25;      // keep deals ≥25% below the route median
const MIN_SAMPLES = 4;          // require enough matrix points to trust the median
const TOP_N = 12;               // max deals to publish per run
const REQUEST_DELAY_MS = 300;   // politeness between matrix calls (rate limits)
const DRY_RUN = !TOKEN;

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

// ---- 1. cheapest recent tickets ----
async function fetchLatest() {
  const json = await apiGet('/v2/prices/latest', {
    currency: CURRENCY, period_type: 'year', sorting: 'price',
    limit: LIMIT, show_to_affiliates: true, market: MARKET, one_way: false,
  });
  return Array.isArray(json.data) ? json.data : [];
}

// ---- 2. route "normal" price via month-matrix median (memoised per route) ----
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

function median(nums) {
  const a = [...nums].sort((x, y) => x - y);
  const n = a.length;
  if (!n) return null;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

// ---- 4. affiliate deep link (aviasales.com search) ----
function deepLink(deal) {
  const ddmm = (s) => (s && s.length >= 10 ? s.slice(8, 10) + s.slice(5, 7) : '');
  let path = deal.origin + ddmm(deal.depart_date) + deal.destination;
  if (deal.return_date) path += ddmm(deal.return_date);
  path += '1'; // 1 adult
  const u = new URL('https://www.aviasales.com/search/' + path);
  if (MARKER) u.searchParams.set('marker', MARKER);
  u.searchParams.set('currency', CURRENCY);
  return u.toString();
}

function hotnessLabel(discount) {
  if (discount >= 0.5) return '🔥🔥🔥';
  if (discount >= 0.35) return '🔥🔥';
  return '🔥';
}

function tgMessage(d) {
  const pct = Math.round(d.discount * 100);
  const price = Math.round(d.price).toLocaleString('ru-RU');
  const median = Math.round(d.median).toLocaleString('ru-RU');
  const dates = d.return_date ? `${d.depart_date} → ${d.return_date}` : d.depart_date;
  return [
    `${hotnessLabel(d.discount)} <b>${d.origin} → ${d.destination}</b> −${pct}%`,
    `💸 <b>${price} ₽</b> (обычно ~${median} ₽) · ${dates}${d.number_of_changes === 0 ? ' · прямой' : ''}`,
    `<a href="${d.link}">Купить на Aviasales →</a>`,
  ].join('\n');
}

async function postTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHANNEL, text, parse_mode: 'HTML', disable_web_page_preview: false }),
  });
  if (!res.ok) throw new Error(`telegram → HTTP ${res.status} ${await res.text().catch(() => '')}`);
}

const dealKey = (d) => `${d.origin}-${d.destination}-${d.depart_date}-${Math.round(d.price)}`;

async function readPrevKeys() {
  try {
    const prev = JSON.parse(await readFile(OUT_PATH, 'utf8'));
    return new Set((prev.items || []).map((d) => d.key));
  } catch { return new Set(); }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY-RUN (no TRAVELPAYOUTS_TOKEN — using sample data) ===' : '=== live Travelpayouts Data API ===');

  const latest = DRY_RUN ? SAMPLE.latest : await fetchLatest();
  console.log(`latest: ${latest.length} tickets`);

  const scored = [];
  for (const t of latest) {
    if (!t.origin || !t.destination || !(t.value > 0)) continue;
    const { median: med, samples } = DRY_RUN ? SAMPLE.matrix(t) : await routeMedian(t.origin, t.destination);
    if (!DRY_RUN) await sleep(REQUEST_DELAY_MS);
    if (!med || samples < MIN_SAMPLES) continue;
    const discount = (med - t.value) / med;
    if (discount < MIN_DISCOUNT) continue; // filter noise / non-deals
    const deal = {
      origin: t.origin, destination: t.destination,
      depart_date: t.depart_date, return_date: t.return_date || null,
      price: t.value, median: med, discount, samples,
      number_of_changes: t.number_of_changes ?? null,
      found_at: t.found_at || null,
    };
    deal.link = deepLink(deal);
    deal.key = dealKey(deal);
    scored.push(deal);
  }

  scored.sort((a, b) => b.discount - a.discount);
  const items = scored.slice(0, TOP_N);
  console.log(`hot deals (≥${Math.round(MIN_DISCOUNT * 100)}% off): ${items.length}`);

  // Post only deals not seen in the previous run.
  const prevKeys = await readPrevKeys();
  const fresh = items.filter((d) => !prevKeys.has(d.key));

  if (TG_TOKEN && TG_CHANNEL && !DRY_RUN) {
    for (const d of fresh) {
      try { await postTelegram(tgMessage(d)); await sleep(1200); }
      catch (e) { console.warn(`[skip post] ${d.key}: ${e.message}`); }
    }
    console.log(`posted ${fresh.length} new deal(s) to ${TG_CHANNEL}`);
  } else {
    console.log(`(no Telegram configured) ${fresh.length} new deal(s) queued; preview:`);
    for (const d of fresh.slice(0, 3)) console.log('\n' + tgMessage(d).replace(/<[^>]+>/g, ''));
  }

  const payload = { updatedAt: new Date().toISOString(), source: 'travelpayouts', market: MARKET, currency: CURRENCY, items };
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${items.length} hot flights to public/flights.json`);
}

// --- Sample fixtures for DRY-RUN (mimic the API shapes) ---
const SAMPLE = {
  latest: [
    { origin: 'MOW', destination: 'IST', depart_date: '2026-08-14', return_date: '2026-08-24', value: 12900, number_of_changes: 0 },
    { origin: 'LED', destination: 'AER', depart_date: '2026-07-20', return_date: '2026-07-27', value: 6100, number_of_changes: 0 },
    { origin: 'MOW', destination: 'DXB', depart_date: '2026-09-03', return_date: '2026-09-13', value: 21000, number_of_changes: 1 },
    { origin: 'MOW', destination: 'TBS', depart_date: '2026-08-01', return_date: '', value: 9500, number_of_changes: 0 },
    { origin: 'LED', destination: 'MOW', depart_date: '2026-07-15', return_date: '', value: 3500, number_of_changes: 0 }, // not a deal
  ],
  // Fake "normal" medians so a couple of samples pass the discount filter.
  matrix(t) {
    const medians = {
      'MOW-IST': 26000, 'LED-AER': 11000, 'MOW-DXB': 30000, 'MOW-TBS': 12000, 'LED-MOW': 3800,
    };
    const m = medians[`${t.origin}-${t.destination}`];
    return { median: m || null, samples: m ? 20 : 0 };
  },
};

main().catch((e) => { console.error('fatal:', e); process.exitCode = 1; });
