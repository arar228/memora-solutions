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
 *     savings, discount, oneway, roundTrip, connections, nights, departDate,
 *     returnDate, date, source, link, text }
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { DEAL_DESTINATIONS } from './deal-destinations.js';
import { placeMeta } from './travel-place-meta.js';

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
const ROUND_TRIP_RE = /(?:туда\s*[-—–]\s*обратно|туда\s+и\s+обратно|в\s+обе\s+стороны|round[\s-]*trip|\bRT\b)/iu;

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

// Extract only transfer points, not every place mentioned in a post. The
// cue immediately before the city keeps destinations out of this field while
// covering common Telegram wording: "стыковка в", "пересадка в", "через".
function extractConnections(text) {
  const value = String(text || '');
  const matches = findCities(value, PLACES).filter((place) => {
    const prefix = value.slice(Math.max(0, place.pos - 72), place.pos);
    return /(?:стыковк\p{L}*|пересадк\p{L}*)[^,.;:\n]{0,36}(?:в|во)\s+$/iu.test(prefix)
      || /через\s+$/iu.test(prefix);
  });

  return matches
    .filter((place, index) => matches.findIndex((candidate) => (
      candidate.code === place.code || candidate.name === place.name
    )) === index)
    .map(({ name, code }) => ({ name, code }));
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

const MONTH_WORD_RE = '(янв(?:ар)?|фев(?:рал)?|мар(?:т)?|апр(?:ел)?|ма[йяеи]|июн|июл|авг(?:уст)?|сен(?:т(?:ябр)?)?|окт(?:ябр)?|ноя(?:бр)?|дек(?:абр)?)\\p{L}*';

function monthNumber(value) {
  const stem = String(value || '').toLowerCase();
  if (stem.startsWith('янв')) return 1;
  if (stem.startsWith('фев')) return 2;
  if (stem.startsWith('мар')) return 3;
  if (stem.startsWith('апр')) return 4;
  if (stem.startsWith('ма')) return 5;
  if (stem.startsWith('июн')) return 6;
  if (stem.startsWith('июл')) return 7;
  if (stem.startsWith('авг')) return 8;
  if (stem.startsWith('сен')) return 9;
  if (stem.startsWith('окт')) return 10;
  if (stem.startsWith('ноя')) return 11;
  if (stem.startsWith('дек')) return 12;
  return null;
}

function normalizeYear(value) {
  if (!value) return null;
  const year = Number(value);
  return year < 100 ? year + 2000 : year;
}

function inferYear(month, day, refDate, explicitYear = null) {
  if (explicitYear) return normalizeYear(explicitYear);
  let year = refDate.getUTCFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day || 28));
  const rolloverThreshold = new Date(refDate);
  rolloverThreshold.setUTCDate(rolloverThreshold.getUTCDate() - 45);
  if (candidate < rolloverThreshold) year += 1;
  return year;
}

function isoDate(day, month, year, refDate) {
  if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12)) return null;
  const resolvedYear = inferYear(month, day, refDate, year);
  const candidate = new Date(Date.UTC(resolvedYear, month - 1, day));
  if (candidate.getUTCDate() !== day || candidate.getUTCMonth() !== month - 1) return null;
  const p = (number) => String(number).padStart(2, '0');
  return `${resolvedYear}-${p(month)}-${p(day)}`;
}

function isoMonth(month, refDate) {
  const year = inferYear(month, 28, refDate);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function rollReturnYear(departDate, month, explicitYear) {
  if (explicitYear) return normalizeYear(explicitYear);
  const departYear = Number(departDate.slice(0, 4));
  const departMonth = Number(departDate.slice(5, 7));
  return month < departMonth ? departYear + 1 : departYear;
}

function addDays(iso, days) {
  if (!iso || iso.length !== 10 || !(days > 0)) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Extract an actual travel interval rather than the publication date. Covers
// compact Telegram forms such as "30.08,", "5–9 авг", "31 июля —
// 7 августа", "12–19.08" and month-only wording.
function parseTravelDates(text, refIso, nights = null) {
  const value = String(text || '').toLowerCase();
  const refDate = refIso ? new Date(refIso) : new Date();
  const validRef = Number.isNaN(refDate.getTime()) ? new Date() : refDate;
  let departDate = null;
  let returnDate = null;

  const namedCrossMonth = value.match(new RegExp(
    `(?:с\\s+)?(\\d{1,2})\\s+${MONTH_WORD_RE}\\s*(?:[–—-]|по|до)\\s*(\\d{1,2})\\s+${MONTH_WORD_RE}(?:\\s+(\\d{2,4}))?`,
    'iu',
  ));
  const namedSameMonth = value.match(new RegExp(
    `(?:с\\s+)?(\\d{1,2})\\s*(?:[–—-]|по|до)\\s*(\\d{1,2})\\s+${MONTH_WORD_RE}(?:\\s+(\\d{2,4}))?`,
    'iu',
  ));
  const numericRange = value.match(
    /(?:^|[^\d])(\d{1,2})(?:[./](\d{1,2}))?(?:[./](\d{2,4}))?\s*(?:[–—-]|по|до)\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=$|[^\d])/u,
  );

  if (namedCrossMonth) {
    const departMonth = monthNumber(namedCrossMonth[2]);
    const returnMonth = monthNumber(namedCrossMonth[4]);
    departDate = isoDate(Number(namedCrossMonth[1]), departMonth, namedCrossMonth[5], validRef);
    if (departDate) {
      returnDate = isoDate(
        Number(namedCrossMonth[3]), returnMonth,
        rollReturnYear(departDate, returnMonth, namedCrossMonth[5]),
        validRef,
      );
    }
  } else if (namedSameMonth) {
    const month = monthNumber(namedSameMonth[3]);
    departDate = isoDate(Number(namedSameMonth[1]), month, namedSameMonth[4], validRef);
    if (departDate) {
      returnDate = isoDate(Number(namedSameMonth[2]), month, departDate.slice(0, 4), validRef);
    }
  } else if (numericRange) {
    const returnMonth = Number(numericRange[5]);
    const departMonth = Number(numericRange[2] || returnMonth);
    departDate = isoDate(Number(numericRange[1]), departMonth, numericRange[3], validRef);
    if (departDate) {
      returnDate = isoDate(
        Number(numericRange[4]), returnMonth,
        rollReturnYear(departDate, returnMonth, numericRange[6]),
        validRef,
      );
    }
  }

  if (!departDate) {
    const numeric = value.match(/(?:^|[^\d])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?=$|[^\d])/u);
    const namedList = value.match(new RegExp(
      `(\\d{1,2})(?=\\s*(?:,|и))(?:(?:\\s*,\\s*\\d{1,2})|(?:\\s+и\\s+\\d{1,2}))+\\s+${MONTH_WORD_RE}(?:\\s+(\\d{2,4}))?`,
      'iu',
    ));
    const named = namedList || value.match(new RegExp(`(?:с|со|на)?\\s*(\\d{1,2})\\s+${MONTH_WORD_RE}(?:\\s+(\\d{2,4}))?`, 'iu'));
    if (numeric) {
      departDate = isoDate(Number(numeric[1]), Number(numeric[2]), numeric[3], validRef);
    }
    if (!departDate && named) {
      departDate = isoDate(Number(named[1]), monthNumber(named[2]), named[3], validRef);
    }
    if (!departDate) {
      const monthOnly = value.match(new RegExp(`(?:в|на)\\s+(?:начале|начало|середине|середину|конце|конец)?\\s*${MONTH_WORD_RE}`, 'iu'));
      const month = monthOnly ? monthNumber(monthOnly[1]) : null;
      if (month) departDate = isoMonth(month, validRef);
    }
  }

  if (!returnDate && nights && departDate?.length === 10) {
    returnDate = addDays(departDate, nights);
  }
  return { departDate, returnDate };
}

function parseDepartDate(text, refIso) {
  return parseTravelDates(text, refIso).departDate;
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
  const nights = nightsM ? Number(nightsM[1]) : null;
  const segmentDates = parseTravelDates(seg, postCtx.date, nights);
  const departDate = segmentDates.departDate || postCtx.travelDates?.departDate || null;
  const returnDate = segmentDates.returnDate
    || (nights ? addDays(departDate, nights) : null)
    || postCtx.travelDates?.returnDate
    || null;
  const oneway = /в одну сторону|one\s*way/i.test(seg);
  const roundTrip = !oneway && (ROUND_TRIP_RE.test(seg) || postCtx.roundTrip);
  const segmentConnections = extractConnections(seg);
  const connections = segmentConnections.length > 0
    ? segmentConnections
    : postCtx.connections || [];

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

  const fromMeta = placeMeta(from.code, from.name);
  const toMeta = placeMeta(to.code, to.name);
  return {
    type,
    from: { name: from.name, code: from.code, ...fromMeta },
    to: { name: to.name, code: to.code, ...toMeta },
    price, oldPrice, savings, discount, oneway, roundTrip, connections,
    nights,
    departDate, returnDate,
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
    roundTrip: ROUND_TRIP_RE.test(text),
    connections: extractConnections(text),
    travelDates: parseTravelDates(text, post.date),
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

function buildDeals(items, refPrices = new Map()) {
  const seen = new Set();
  const deals = [];
  for (const post of items || []) {
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

  return deals;
}

async function main() {
  const raw = JSON.parse(await readFile(join(ROOT, 'public', 'tours.json'), 'utf8'));
  const refPrices = await loadRefPrices();
  const deals = buildDeals(raw.items, refPrices);
  const payload = {
    updatedAt: new Date().toISOString(), marker: MARKER, deals, health: raw.health || [],
  };
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

export {
  buildDeals, extractConnections, findCities, findCity, isExpired, loadRefPrices, parseSegment,
  parseDepartDate, parseTravelDates, resolveRoute, structure,
};
