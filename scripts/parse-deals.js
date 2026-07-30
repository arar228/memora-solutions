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
  ['москв', 'MOW', 'Москва'], ['петербург', 'LED', 'Санкт-Петербург'], ['петербуржц', 'LED', 'Санкт-Петербург'], ['питер', 'LED', 'Санкт-Петербург'],
  ['спб', 'LED', 'Санкт-Петербург'], ['сочи', 'AER', 'Сочи'], ['екатеринбург', 'SVX', 'Екатеринбург'],
  ['казан', 'KZN', 'Казань'], ['новосибирск', 'OVB', 'Новосибирск'], ['красноярск', 'KJA', 'Красноярск'],
  ['уфы', 'UFA', 'Уфа'], ['уфа', 'UFA', 'Уфа'], ['самар', 'KUF', 'Самара'], ['челябинск', 'CEK', 'Челябинск'],
  ['перм', 'PEE', 'Пермь'], ['нижнег новгород', 'GOJ', 'Нижний Новгород'], ['нижнем новгород', 'GOJ', 'Нижний Новгород'], ['нижн новгород', 'GOJ', 'Нижний Новгород'], ['калининград', 'KGD', 'Калининград'],
  ['владивосток', 'VVO', 'Владивосток'], ['тюмен', 'TJM', 'Тюмень'], ['иркутск', 'IKT', 'Иркутск'],
  ['краснодар', 'KRR', 'Краснодар'], ['ростов', 'ROV', 'Ростов-на-Дону'], ['минеральн', 'MRV', 'Минеральные Воды'],
  ['махачкал', 'MCX', 'Махачкала'], ['омск', 'OMS', 'Омск'], ['волгоград', 'VOG', 'Волгоград'],
  ['оренбург', 'REN', 'Оренбург'], ['саратов', 'GSV', 'Саратов'], ['ульяновск', 'ULV', 'Ульяновск'],
  ['барнаул', 'BAX', 'Барнаул'], ['томск', 'TOF', 'Томск'], ['кемеров', 'KEJ', 'Кемерово'],
  ['новокузнецк', 'NOZ', 'Новокузнецк'], ['хабаровск', 'KHV', 'Хабаровск'], ['якутск', 'YKS', 'Якутск'],
  ['сургут', 'SGC', 'Сургут'], ['мурманск', 'MMK', 'Мурманск'], ['архангельск', 'ARH', 'Архангельск'],
  ['петрозаводск', 'PES', 'Петрозаводск'], ['астрахан', 'ASF', 'Астрахань'], ['ставропол', 'STW', 'Ставрополь'],
  ['грозн', 'GRV', 'Грозный'], ['владикавказ', 'OGZ', 'Владикавказ'], ['нальчик', 'NAL', 'Нальчик'],
  ['воронеж', 'VOZ', 'Воронеж'], ['чита', 'HTA', 'Чита'], ['благовещенск', 'BQS', 'Благовещенск'],
  ['южно-сахалинск', 'UUS', 'Южно-Сахалинск'], ['петропавловск-камчатск', 'PKC', 'Петропавловск-Камчатский'],
  ['магадан', 'GDX', 'Магадан'], ['горно-алтайск', 'RGK', 'Горно-Алтайск'],
];
const ORIG = [...RF_ORIGINS];
const DEST = DEAL_DESTINATIONS;
const PLACES = [...RF_ORIGINS, ...DEAL_DESTINATIONS];

const DECLENSION_ENDINGS = new Set([
  '', 'а', 'я', 'ы', 'и', 'е', 'у', 'ю', 'о', 'й', 'ь',
  'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ой', 'ей', 'ов', 'ев',
  'ию', 'ии', 'ия', 'ией', 'ием', 'ью', 'ье', 'ьи', 'ья',
  'ами', 'ями',
]);

function findCities(text, table) {
  const t = text.toLowerCase();
  const matches = new Map();

  for (const [stem, code, name] of table) {
    let idx = t.indexOf(stem);
    while (idx !== -1) {
      const startsInsideWord = idx > 0 && /[\p{L}\p{N}]/u.test(t[idx - 1]);
      const tail = t.slice(idx + stem.length).match(/^[\p{L}\p{N}]*/u)?.[0] || '';
      if (!startsInsideWord && DECLENSION_ENDINGS.has(tail)) {
        const prefixed = /(^|[\s(«"])(?:из|с)\s+$/.test(t.slice(Math.max(0, idx - 14), idx));
        const key = `${code}:${idx}`;
        const current = matches.get(key);
        if (!current || stem.length > current.stemLength) {
          matches.set(key, { code, name, pos: idx, prefixed, stemLength: stem.length });
        }
      }
      idx = t.indexOf(stem, idx + 1);
    }
  }

  return [...matches.values()].sort((a, b) => a.pos - b.pos || b.stemLength - a.stemLength);
}

// Find a city hit in text, honoring an "из <city>" marker when asked: for
// origins we prefer the stem right after "из " so "Прямой из Туниса в Москву"
// doesn't become Москва→Тунис.
function findCity(text, table, { afterIz = false } = {}) {
  const matches = findCities(text, table);
  return afterIz ? matches.find((match) => match.prefixed) || null : matches[0] || null;
}

function resolveRoute(text, fallbackOrigin = null, fallbackDestination = null) {
  const all = findCities(text, PLACES);
  const withoutAirportAliases = all.filter((place, index) =>
    index === all.findIndex((candidate) =>
      candidate.pos === place.pos && candidate.name === place.name));
  const places = withoutAirportAliases.filter((place, index) =>
    index === withoutAirportAliases.findIndex((candidate) => candidate.code === place.code));
  const explicitFrom = places.find((place) => place.prefixed);

  if (explicitFrom) {
    const others = places.filter((place) => place.code !== explicitFrom.code);
    const afterPlaces = others.filter((place) => place.pos > explicitFrom.pos);
    const destinationPrefixed = afterPlaces.find((place) =>
      /(^|[\s,(])(?:в|во|на)\s+$/i.test(text.slice(Math.max(0, place.pos - 16), place.pos)));
    const after = destinationPrefixed || afterPlaces[0];
    // Home-city channels often shorten inbound offers to “возврат из Бангкока”.
    // In that form the channel's city is the implicit destination.
    const homeDestination = fallbackOrigin?.code !== explicitFrom.code
      ? fallbackOrigin
      : null;
    const to = after || others[0] || homeDestination || fallbackDestination;
    return to ? { from: explicitFrom, to } : null;
  }

  if (places.length >= 2) {
    const from = places[0];
    const to = places.slice(1).find((candidate) => {
      const between = text.slice(from.pos + from.stemLength, candidate.pos);
      return between.length <= 40
        && /[—–→]|->|\s-\s/.test(between)
        && !/\d|₽|руб/i.test(between);
    });
    if (to) return { from, to };
  }

  if (fallbackOrigin) {
    const mentionedOrigin = places.find((place) => place.code === fallbackOrigin.code);
    const to = places.find((place) => place.code !== fallbackOrigin.code) || fallbackDestination;
    if (to) {
      return {
        from: mentionedOrigin ? { ...fallbackOrigin, pos: mentionedOrigin.pos } : fallbackOrigin,
        to,
      };
    }
  }

  return null;
}

const TOUR_RE = /(?:^|[^\p{L}])тур(?:ы|а|ов|ом|е|у)?(?!\p{L})|турпакет|отел|(?:\d{1,2}|несколько)\s*ноч(?:ь|и|ей)?(?!\p{L})|звёзд|звезд|all\s*inclusive|всё включено|все включено|пляжн|круиз/iu;
// Price: "12 990 ₽ / руб / р." OR "от 17 000" (channels often omit the currency
// after "от", e.g. "3 ночи от 17 000/чел").
const PRICE_CUR_RE = /(\d{1,3}(?:[\s.]\d{3})+|\d{4,7})\s*(?:₽|руб(?:\.|ля|лей)?|р\.?)(?![\p{L}\p{N}])/iu;
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
  const numeric = t.match(/(?:^|[\s—–-])(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?(?=$|[\s—–-])/);
  const dm = t.match(/(?:с|со)?\s*(\d{1,2})\s+(январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*\s*(\d{4})?/);
  if (numeric) {
    day = Number(numeric[1]);
    mon = Number(numeric[2]);
    year = numeric[3] ? Number(numeric[3]) : null;
    if (year && year < 100) year += 2000;
  } else if (dm) {
    day = Number(dm[1]);
    mon = MONTHS[dm[2].startsWith('ма') ? 'ма' : dm[2]];
    year = dm[3] ? Number(dm[3]) : null;
  } else {
    const mm = t.match(/(?:в|на)\s+(?:начале|начало|середине|середину|конце|конец)?\s*(январ|феврал|март|апрел|ма[еи]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/);
    if (mm) mon = MONTHS[mm[1].startsWith('ма') ? 'ма' : mm[1]];
  }
  if (!mon) return null;
  if (!year) {
    year = ref.getFullYear();
    const cand = new Date(Date.UTC(year, mon - 1, day || 28));
    const rolloverThreshold = new Date(ref);
    rolloverThreshold.setUTCDate(rolloverThreshold.getUTCDate() - 45);
    if (cand < rolloverThreshold) year += 1;
  }
  const p = (n) => String(n).padStart(2, '0');
  return day ? `${year}-${p(mon)}-${p(day)}` : `${year}-${p(mon)}`;
}

function aviaLink(from, to, departDate) {
  let ddmm;
  if (departDate && departDate.length === 10) {
    const [, m, d] = departDate.split('-');
    ddmm = d + m;
  } else if (departDate && departDate.length === 7) {
    const [, m] = departDate.split('-');
    ddmm = `01${m}`;
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
  const type = isTour ? 'tour' : 'flight';
  if (type === 'flight' && (price < 1500 || price > 400000)) return null;
  if (type === 'tour' && (price < 8000 || price > 2000000)) return null;

  const fallbackOrigin = postCtx.origin || (isTour ? UNKNOWN_ORIGIN : null);
  const route = resolveRoute(seg, fallbackOrigin, postCtx.destination);
  if (!route || route.from.code === route.to.code) return null;
  const { from, to } = route;

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
  const displayText = seg
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^[\s\p{Extended_Pictographic}\uFE0F]+$/gmu, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  const hasIataRoute = /^[A-Z]{3}$/.test(from.code) && /^[A-Z]{3}$/.test(to.code);
  const link = type === 'flight'
    ? hasIataRoute
      ? aviaLink(from.code, to.code, departDate)
      : segUrl || postCtx.links?.[0] || postCtx.link
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
    text: displayText.slice(0, 200),
  };
}

// Channels tied to one home city — last-resort origin fallback.
const UNKNOWN_ORIGIN = {
  code: 'ANY', name: 'Город вылета уточняется', pos: 1e9, prefixed: false,
};

const CHANNEL_ORIGIN = {
  nachemodanahspb: { code: 'LED', name: 'Санкт-Петербург', pos: 1e9, prefixed: false },
  turscanner_msk_spb: null,
  travelata: UNKNOWN_ORIGIN,
  leveltravel: UNKNOWN_ORIGIN,
  onlinetours: UNKNOWN_ORIGIN,
};

function structure(post) {
  const text = post.text || '';
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const priceLines = lines.filter((l) => PRICE_CUR_RE.test(l) || PRICE_OT_RE.test(l));

  // Post-level origin fallback. Same inbound guard as segments: an RF city in
  // the header only counts as the DEPARTURE city if it carries "из" or comes
  // before the destination ("из Туниса … в Москву" must NOT yield Москва).
  const head = lines.slice(0, 2).join(' ');
  const headPlaces = findCities(head, PLACES);
  const directionalDestination = headPlaces.find((place) =>
    /(^|[\s,(])(?:в|во|на)\s+$/i.test(head.slice(Math.max(0, place.pos - 16), place.pos)));
  const headDest = directionalDestination || findCity(head, DEST);
  let headOrigin = findCity(head, ORIG, { afterIz: true });
  if (!headOrigin) {
    const rf = findCity(head, ORIG);
    if (rf && rf.code !== headDest?.code && (!headDest || rf.pos < headDest.pos)) headOrigin = rf;
  }
  headOrigin = headOrigin || CHANNEL_ORIGIN[post.channel] || null;
  const postCtx = {
    origin: headOrigin,
    destination: headDest,
    tourish: TOUR_RE.test(lines[0] || ''),
    date: post.date, channel: post.channel, link: post.link, links: post.links,
  };

  // A route line starts an offer group; following date/price lines belong to
  // that route. This preserves "Нячанг — Москва ...\n— 05.08 — 17600₽" as one
  // deal while still splitting posts that contain several different routes.
  const grouped = [];
  for (const line of lines) {
    const hasPrice = PRICE_CUR_RE.test(line) || PRICE_OT_RE.test(line);
    if (hasPrice) {
      if (findCities(line, PLACES).length > 0) {
        grouped.push(line);
      } else if (grouped.length > 0) {
        grouped[grouped.length - 1] += `\n${line}`;
      }
    } else if (grouped.length > 0 && URL_RE.test(line)) {
      // Keep the booking link with the route line that precedes it. This is
      // essential for regional airports that use Aviasales internal codes.
      grouped[grouped.length - 1] += `\n${line}`;
    }
  }
  const segments = grouped.length > 0 ? grouped : priceLines.length > 1 ? priceLines : [text];
  const out = [];
  for (const seg of segments) {
    const d = parseSegment(seg, grouped.length > 1 ? { ...postCtx, destination: null } : postCtx);
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

function isExpired(deal, now = Date.now()) {
  if (!deal.departDate || deal.departDate.length !== 10) return false;
  const endOfDepartureDay = Date.parse(`${deal.departDate}T23:59:59.999Z`);
  return Number.isFinite(endOfDepartureDay) && endOfDepartureDay < now;
}

async function main() {
  const raw = JSON.parse(await readFile(join(ROOT, 'public', 'tours.json'), 'utf8'));
  const refPrices = await loadRefPrices();
  const seen = new Set();
  const deals = [];
  for (const post of raw.items || []) {
    for (const d of structure(post)) {
      if (isExpired(d)) continue;
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

export { findCities, findCity, isExpired, parseSegment, resolveRoute, structure };
