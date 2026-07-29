/**
 * parse-deals.js — structures the raw Telegram feed (public/tours.json) into
 * normalized hot-deals (public/hot-deals.json).
 *
 * v2: segment-level parsing. Channel posts often pack 3–5 offers into one post
 * (one per "☀ …" line) — v1 saw one price per post and dropped almost every
 * tour. v2 splits a post into price-bearing lines and parses each line as its
 * own deal, with post-level fallbacks for the departure city.
 *
 * Per deal we now extract the manager's core metric — САВИНГС (savings):
 * "вместо 60 000", "скидка 35%", "экономия 20 000" → oldPrice/savings/discount.
 *
 * FLIGHT deals get OUR Aviasales affiliate link (marker 748397) — the
 * "intercept". TOUR deals keep the offer link found inside their own segment
 * (that's where the user books) until tour-operator affiliate programs are
 * connected.
 *
 * Output shape:
 *   { type:'flight'|'tour', from:{name,code}, to:{name,code}, price, oldPrice,
 *     savings, discount, oneway, nights, departDate, date, source, link, text }
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { DEAL_DESTINATIONS } from './deal-destinations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MARKER = '748397';

// City name-stem → IATA. RF origins + popular destinations. Stems are matched
// case-insensitively so Russian declensions ("из Москвы") still hit.
const RF_ORIGINS = [
  ['москв', 'MOW', 'Москва'], ['петербург', 'LED', 'Санкт-Петербург'], ['питер', 'LED', 'Санкт-Петербург'],
  ['спб', 'LED', 'Санкт-Петербург'], ['сочи', 'AER', 'Сочи'], ['екатеринбург', 'SVX', 'Екатеринбург'],
  ['казан', 'KZN', 'Казань'], ['новосибирск', 'OVB', 'Новосибирск'], ['красноярск', 'KJA', 'Красноярск'],
  ['уфы', 'UFA', 'Уфа'], ['уфа', 'UFA', 'Уфа'], ['самар', 'KUF', 'Самара'], ['челябинск', 'CEK', 'Челябинск'],
  ['перм', 'PEE', 'Пермь'], ['нижн', 'GOJ', 'Нижний Новгород'], ['калининград', 'KGD', 'Калининград'],
  ['владивосток', 'VVO', 'Владивосток'], ['тюмен', 'TJM', 'Тюмень'], ['иркутск', 'IKT', 'Иркутск'],
  ['краснодар', 'KRR', 'Краснодар'], ['ростов', 'ROV', 'Ростов-на-Дону'], ['минеральн', 'MRV', 'Минеральные Воды'],
  ['махачкал', 'MCX', 'Махачкала'], ['омск', 'OMS', 'Омск'], ['волгоград', 'VOG', 'Волгоград'],
];
const ORIG = [...RF_ORIGINS];
const DEST = DEAL_DESTINATIONS;

// Find a city hit in text, honoring an "из <city>" marker when asked: for
// origins we prefer the stem right after "из " so "Прямой из Туниса в Москву"
// doesn't become Москва→Тунис.
function findCity(text, table, { afterIz = false } = {}) {
  const t = text.toLowerCase();
  let best = null;
  const declensionEndings = new Set([
    '', 'а', 'я', 'ы', 'и', 'е', 'у', 'ю', 'о', 'й', 'ь',
    'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ой', 'ей', 'ов', 'ев',
    'ию', 'ии', 'ия', 'ией', 'ием', 'ью', 'ье', 'ьи', 'ья',
    'ами', 'ями',
  ]);
  for (const [stem, code, name] of table) {
    let idx = t.indexOf(stem);
    while (idx !== -1) {
      // A stem must start at a word boundary. Without this guard "бурга"
      // (Бургас) also matches "Петербурга" and corrupts the destination.
      if (idx > 0 && /[\p{L}\p{N}]/u.test(t[idx - 1])) {
        idx = t.indexOf(stem, idx + 1);
        continue;
      }
      const tail = t.slice(idx + stem.length).match(/^[\p{L}\p{N}]*/u)?.[0] || '';
      if (!declensionEndings.has(tail)) {
        idx = t.indexOf(stem, idx + 1);
        continue;
      }
      const prefixed = /(^|[\s(«"])из\s+$/.test(t.slice(Math.max(0, idx - 12), idx));
      const cand = { code, name, pos: idx, prefixed };
      if (afterIz) {
        if (prefixed && (!best || idx < best.pos)) best = cand;
      } else if (!best || idx < best.pos) best = cand;
      idx = t.indexOf(stem, idx + 1);
    }
  }
  return best;
}

const TOUR_RE = /\bтур|отел|ночей|ночи\b|звёзд|звезд|all\s*inclusive|всё включено|все включено|пляжн|круиз/i;
const FLIGHT_RE = /билет|перелёт|перелет|авиа|в одну сторону|туда[- ]обратно|\brt\b|рейс/i;
// Price: "12 990 ₽ / руб / р." OR "от 17 000" (channels often omit the currency
// after "от", e.g. "3 ночи от 17 000/чел").
const PRICE_CUR_RE = /(\d{1,3}(?:[\s.]\d{3})+|\d{4,7})\s*(?:₽|руб|р\.|р\b)/i;
const PRICE_OT_RE = /от\s+(\d{1,3}(?:[\s.]\d{3})+|\d{4,7})(?!\s*(?:%|зв|\*|ноч))/i;
const OLD_RE = /вместо\s*(\d[\d\s.]{2,})/i;
const PCT_RE = /скидк\w*\s*(?:до\s*)?[-−]?\s*(\d{1,2})\s*%|[-−]\s*(\d{1,2})\s*%/i;
const SAVE_RE = /эконом\w*\s*(?:до\s*)?(\d[\d\s.]{2,})/i;
const NIGHTS_RE = /(\d{1,2})\s*ноч/i;
const num = (s) => Number(String(s).replace(/[\s.]/g, '')) || 0;

const MONTHS = {
  январ: 1, феврал: 2, март: 3, апрел: 4, ма: 5, июн: 6,
  июл: 7, август: 8, сентябр: 9, октябр: 10, ноябр: 11, декабр: 12,
};
// "с 15 август(а) 2026", "6 января", "в конце июля" → ISO date (or month
// start). Year inferred as the next occurrence relative to the post date.
function parseDepartDate(text, refIso) {
  const t = text.toLowerCase();
  const ref = refIso ? new Date(refIso) : new Date();
  let day = null, mon = null, year = null;
  const dm = t.match(/(?:с|со)?\s*(\d{1,2})\s+(январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*\s*(\d{4})?/);
  if (dm) {
    day = Number(dm[1]);
    mon = MONTHS[dm[2].startsWith('ма') ? 'ма' : dm[2]];
    year = dm[3] ? Number(dm[3]) : null;
  } else {
    const mm = t.match(/в\s+(?:начале|середине|конце)?\s*(январ|феврал|март|апрел|ма[еи]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/);
    if (mm) mon = MONTHS[mm[1].startsWith('ма') ? 'ма' : mm[1]];
  }
  if (!mon) return null;
  if (!year) {
    year = ref.getFullYear();
    const cand = new Date(Date.UTC(year, mon - 1, day || 28));
    if (cand < ref) year += 1;
  }
  const p = (n) => String(n).padStart(2, '0');
  return day ? `${year}-${p(mon)}-${p(day)}` : `${year}-${p(mon)}`;
}

function aviaLink(from, to, departDate) {
  let ddmm;
  if (departDate && departDate.length === 10) {
    const [, m, d] = departDate.split('-');
    ddmm = d + m;
  } else {
    const dt = new Date(Date.now() + 30 * 864e5);
    const p = (n) => String(n).padStart(2, '0');
    ddmm = p(dt.getDate()) + p(dt.getMonth() + 1);
  }
  const u = new URL(`https://www.aviasales.ru/search/${from}${ddmm}${to}1`);
  u.searchParams.set('marker', MARKER);
  u.searchParams.set('currency', 'rub');
  return u.toString();
}

const URL_RE = /https?:\/\/\S+/;

// Parse ONE price-bearing segment. postCtx supplies fallbacks (origin found in
// the post header, post link/date/channel).
function parseSegment(seg, postCtx) {
  const priceM = seg.match(PRICE_CUR_RE) || seg.match(PRICE_OT_RE);
  if (!priceM) return null;
  const price = num(priceM[1]);

  const isTour = TOUR_RE.test(seg) || postCtx.tourish;
  const isFlight = FLIGHT_RE.test(seg);
  const type = isTour && !isFlight ? 'tour' : 'flight';
  if (type === 'flight' && (price < 1500 || price > 400000)) return null;
  if (type === 'tour' && (price < 8000 || price > 2000000)) return null;

  // Origin: prefer an explicit "из <RF-city>" in the segment, then any RF stem
  // in the segment, then the post-level origin, then the channel default.
  const fromInSeg = findCity(seg, ORIG, { afterIz: true }) || findCity(seg, ORIG);
  const from = fromInSeg || postCtx.origin;
  const to = findCity(seg, DEST);
  if (!from || !to || from.code === to.code) return null;
  // A channel default must not turn an explicitly foreign departure
  // ("из Касабланки в Кабо-Верде") into a flight from its home city.
  if (!fromInSeg && to.prefixed) return null;
  // Direction guard: a legit "from RF" offer reads either "Москва → Пхукет"
  // (RF city first) or "в Хургаду из Москвы" (RF city carries "из"). An RF
  // city that appears AFTER the destination without "из" is the ARRIVAL city
  // ("из Туниса в Москву") — that's an inbound leg, not our product. Only
  // applicable when the RF city was found in this segment.
  if (fromInSeg && !fromInSeg.prefixed && fromInSeg.pos > to.pos) return null;

  const oldM = seg.match(OLD_RE);
  let oldPrice = oldM ? num(oldM[1]) : null;
  if (!oldPrice) {
    const pct = seg.match(PCT_RE);
    const p = pct ? Number(pct[1] || pct[2]) : 0;
    if (p >= 5 && p <= 90) oldPrice = Math.round(price / (1 - p / 100));
  }
  if (!oldPrice) {
    const sv = seg.match(SAVE_RE);
    if (sv) oldPrice = price + num(sv[1]);
  }
  if (oldPrice && oldPrice <= price) oldPrice = null;
  const savings = oldPrice ? oldPrice - price : null;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) / 100 : null;

  const nightsM = seg.match(NIGHTS_RE);
  const departDate = parseDepartDate(seg, postCtx.date);
  const oneway = /в одну сторону|one\s*way/i.test(seg);

  // Flights → OUR Aviasales link (intercept). Tours → the booking link found
  // inside this very segment, else the post's first link, else the post.
  const segUrl = seg.match(URL_RE)?.[0]?.replace(/[),.]+$/, '');
  const link = type === 'flight'
    ? aviaLink(from.code, to.code, departDate)
    : segUrl || postCtx.links?.[0] || postCtx.link;

  return {
    type,
    from: { name: from.name, code: from.code },
    to: { name: to.name, code: to.code },
    price, oldPrice, savings, discount, oneway,
    nights: nightsM ? Number(nightsM[1]) : null,
    departDate,
    date: postCtx.date || null,
    source: postCtx.channel,
    link,
    text: seg.trim().slice(0, 200),
  };
}

// Channels tied to one home city — last-resort origin fallback.
const CHANNEL_ORIGIN = {
  nachemodanahspb: { code: 'LED', name: 'Санкт-Петербург', pos: 1e9, prefixed: false },
  turscanner_msk_spb: null,
};

function structure(post) {
  const text = post.text || '';
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const priceLines = lines.filter((l) => PRICE_CUR_RE.test(l) || PRICE_OT_RE.test(l));

  // Post-level origin fallback. Same inbound guard as segments: an RF city in
  // the header only counts as the DEPARTURE city if it carries "из" or comes
  // before the destination ("из Туниса … в Москву" must NOT yield Москва).
  const head = lines.slice(0, 2).join(' ');
  let headOrigin = findCity(head, ORIG, { afterIz: true });
  if (!headOrigin) {
    const rf = findCity(head, ORIG);
    const headDest = findCity(head, DEST);
    if (rf && (!headDest || rf.pos < headDest.pos)) headOrigin = rf;
  }
  headOrigin = headOrigin || CHANNEL_ORIGIN[post.channel] || null;
  const postCtx = {
    origin: headOrigin,
    tourish: TOUR_RE.test(lines[0] || '') || /круиз|тур/i.test(post.channelTitle || ''),
    date: post.date, channel: post.channel, link: post.link, links: post.links,
  };

  // Multi-offer post → one deal per price-bearing line; single-price post →
  // parse the whole text (route parts may sit on different lines).
  const segments = priceLines.length > 1 ? priceLines : [text];
  const out = [];
  for (const seg of segments) {
    const d = parseSegment(seg, postCtx);
    if (d) out.push(d);
  }
  return out;
}

// Reference prices from our own radar feed (public/radar.json): the usual
// price of a route. Channels rarely publish "вместо X ₽", so for FLIGHT deals
// savings = radar reference − deal price. hotFlights carry a median (typical
// price); cheapFrom carries the current cheapest — median wins when present.
async function loadRefPrices() {
  try {
    const radar = JSON.parse(await readFile(join(ROOT, 'public', 'radar.json'), 'utf8'));
    const ref = new Map();
    for (const c of radar.cheapFrom || []) {
      for (const it of c.items || []) ref.set(`${c.code}-${it.destination}`, it.price);
    }
    for (const f of radar.hotFlights || []) {
      if (f.median) ref.set(`${f.origin}-${f.destination}`, f.median);
    }
    return ref;
  } catch { return new Map(); }
}

function publishedAt(deal) {
  const timestamp = Date.parse(deal.date || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function main() {
  const raw = JSON.parse(await readFile(join(ROOT, 'public', 'tours.json'), 'utf8'));
  const refPrices = await loadRefPrices();
  const seen = new Set();
  const deals = [];
  for (const post of raw.items || []) {
    for (const d of structure(post)) {
      const key = `${d.type}-${d.from.code}-${d.to.code}-${d.price}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Fill flight savings from the radar reference when the text gave none.
      if (d.type === 'flight' && !d.savings) {
        const ref = refPrices.get(`${d.from.code}-${d.to.code}`);
        if (ref && ref > d.price) {
          d.oldPrice = ref;
          d.savings = ref - d.price;
          d.discount = Math.round((1 - d.price / ref) * 100) / 100;
        }
      }
      deals.push(d);
    }
  }
  // A live feed must stay chronological. Savings only rank offers published
  // at the same time, so an old high-discount post cannot interrupt fresh ones.
  deals.sort((a, b) => publishedAt(b) - publishedAt(a)
    || (b.savings || 0) - (a.savings || 0)
    || (b.discount || 0) - (a.discount || 0)
    || a.price - b.price);

  const payload = { updatedAt: new Date().toISOString(), marker: MARKER, deals };
  await writeFile(join(ROOT, 'public', 'hot-deals.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const tours = deals.filter((d) => d.type === 'tour').length;
  console.log(`structured ${deals.length} deals (${tours} tours, ${deals.length - tours} flights) from ${raw.items.length} posts`);
  deals.slice(0, 15).forEach((d) => console.log(
    `  [${d.type}] ${d.from.name}→${d.to.name} ${d.price}₽`
    + (d.savings ? ` (эконом. ${d.savings}₽)` : d.discount ? ` (-${Math.round(d.discount * 100)}%)` : '')
    + (d.nights ? ` ${d.nights}н` : '') + (d.departDate ? ` ${d.departDate}` : '')
    + ` · ${d.source}`
  ));
}
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  main();
}

export { findCity, parseSegment, structure };
