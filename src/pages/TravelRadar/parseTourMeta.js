/**
 * Best-effort, client-side extraction of structured fields from a raw Telegram
 * travel post. The MVP brief is explicit: parse route/price/type "as far as a
 * simple parser gets you; whatever doesn't parse, show as-is in the
 * Route/Details field." No LLM, no profit-% analytics.
 *
 * Everything is derived from `item.text` (and `item.links` when the scraper
 * provides them), so it works on the existing tours.json with no CI round-trip.
 *
 * Note: JS `\s` already matches non-breaking / thin spaces (U+00A0, U+2007,
 * U+202F, …), so collapsing with /\s+/ normalises the odd spaces Telegram uses
 * inside prices like "28 400 ₽" without any literal whitespace in this source.
 */

const MONTHS = 'янв|фев|март|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек';

// A place token: starts with a capital (Cyrillic or Latin), allows a second
// word (e.g. "Нижний Новгород").
const PLACE = '[A-ZА-ЯЁ][A-Za-zА-Яа-яёЁ.\\-]+(?:\\s[A-ZА-ЯЁ][A-Za-zА-Яа-яёЁ.\\-]+)?';

// Map common declined city forms back to nominative so "из Москвы в Барселону"
// reads "Москва → Барселона". Best-effort dictionary — unknown forms pass
// through unchanged (still readable).
const CITY_NOM = {
    'москвы': 'Москва', 'москву': 'Москва', 'москве': 'Москва',
    'петербурга': 'Санкт-Петербург', 'петербург': 'Санкт-Петербург',
    'питера': 'Санкт-Петербург', 'питер': 'Санкт-Петербург', 'спб': 'Санкт-Петербург',
    'сочи': 'Сочи', 'самары': 'Самара', 'самару': 'Самара',
    'казани': 'Казань', 'екатеринбурга': 'Екатеринбург', 'екатеринбург': 'Екатеринбург',
    'новосибирска': 'Новосибирск', 'нижнего': 'Нижний Новгород',
    'барселоны': 'Барселона', 'барселону': 'Барселона',
    'тюмени': 'Тюмень', 'еревана': 'Ереван', 'ереван': 'Ереван',
    'анталии': 'Анталья', 'анталью': 'Анталья', 'антальи': 'Анталья', 'анталья': 'Анталья',
    'пхукета': 'Пхукет', 'пхукет': 'Пхукет', 'токио': 'Токио',
    'дубая': 'Дубай', 'дубай': 'Дубай', 'дубаи': 'Дубай',
    'ниццы': 'Ницца', 'ниццу': 'Ницца', 'сараево': 'Сараево',
    'нячанга': 'Нячанг', 'нячанг': 'Нячанг', 'батуми': 'Батуми', 'мале': 'Мале',
    'пекина': 'Пекин', 'пекин': 'Пекин',
    'шри-ланки': 'Шри-Ланка', 'шри-ланку': 'Шри-Ланка',
};

// Posts pepper routes with flag emoji ("из Антальи 🇹🇷 в Москву 🇷🇺 ..."), which
// Windows renders as the bare 2-letter country codes (TR, RU). Either form sits
// between the cities and breaks route parsing / clutters the headline, so strip
// both: the regional-indicator emoji themselves and any orphan lowercase
// 2-letter code. Uppercase tokens (RT/OW) are kept.
function stripFlagCodes(s) {
    return (s || '')
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
        .replace(/\s+[a-z]{2}(?=[\s.,)]|$)/g, '')
        .replace(/[ \t]{2,}/g, ' ');
}

function clean(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
}

// Strip leading non-letter/non-digit characters (emoji, flags, bullets, dashes)
// so a headline starts on a real word.
function stripLead(s) {
    return clean(s).replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

// Tidy a captured place: drop a trailing connector word the regex over-grabbed
// ("Москву за" → "Москву") and cap length so a run-on never fills the cell.
function cleanPlace(s) {
    let p = clean(s).replace(/\s+(?:за|на|во?|от|до|из|и|с|по|к)$/i, '');
    if (p.length > 24) p = p.slice(0, 24).trim();
    return CITY_NOM[p.toLowerCase()] || p;
}

/** All external (non-Telegram) URLs from the post, deduped. */
export function extractLinks(item) {
    const out = [];
    const seen = new Set();
    const push = (raw) => {
        if (!raw) return;
        const url = String(raw).trim().replace(/[.,;)\]]+$/, '');
        if (!/^https?:\/\//i.test(url)) return;
        if (/(?:^|\/\/)(?:[\w.-]*\.)?(?:t\.me|telegram\.me|telegram\.org)\b/i.test(url)) return;
        const key = url.replace(/\/+$/, '').toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(url);
    };
    if (Array.isArray(item.links)) item.links.forEach(push);
    const m = (item.text || '').match(/https?:\/\/[^\s)<>"']+/gi);
    if (m) m.forEach(push);
    return out;
}

/** Human domain for a link button label, e.g. "smkt.us". */
export function domainOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return String(url).replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '');
    }
}

/**
 * One of: 'air' | 'tour' | 'hotel' | 'promo'. Defaults to 'air'.
 * Order matters: an explicit tours post that merely mentions a promo code is a
 * tour, not a promo — so tour/hotel are checked before the promo keywords.
 */
export function detectType(text) {
    const s = (text || '').toLowerCase();
    const first = s.split('\n')[0] || '';
    // A post that leads with discounts/promos is a promo (even if it later
    // mentions hotels); a promo code buried in a tours post is not.
    if (/скидк|акци|промокод|распродаж|кэшбэк|кешбэк|купон/.test(first)) return 'promo';
    // Strong package-tour signal beats an incidental hotel mention.
    if (/перел[её]т\w*\s+включ|горящие\s+тур|пакетн\w*\s+тур/.test(s)) return 'tour';
    if (/отел|гостиниц|апарт|вилл|resort|\bhotel\b/.test(s)) return 'hotel';
    if (/\bтур[аовы]?\b|туры|туров|путёвк|путевк|всё\s*включено|все\s*включено|за\s*двоих|на\s*неделю/.test(s)) return 'tour';
    return 'air';
}

/** "City → City" when we can find it, else ''. */
export function extractRoute(text) {
    const head = (text || '').slice(0, 240);
    // 1) Dash/arrow between two place tokens (usually nominative: "Москва — Казань").
    let m = head.match(new RegExp(`(${PLACE})\\s*(?:→|—|–|->)\\s*(${PLACE})`));
    if (m && !/https?/i.test(m[0])) return `${cleanPlace(m[1])} → ${cleanPlace(m[2])}`;
    // 2) "из X в|на Y" (declined forms — shown as-is, still readable).
    m = (text || '').match(new RegExp(`из\\s+(${PLACE})\\s+(?:в|на)\\s+(${PLACE})`, 'i'));
    if (m) return `${cleanPlace(m[1])} → ${cleanPlace(m[2])}`;
    return '';
}

/** "28 400 ₽" / "от 48 000 ₽" / '' */
export function extractPrice(text) {
    const s = text || '';
    // Thousands are written with a space OR a dot ("36 600" / "36.600"), so the
    // number group allows both; the dot/space is normalised to a space below.
    const m = s.match(/(от\s*)?(\d[\d\s.]{1,9}\d|\d{3,})\s*(₽|руб(?:\.|лей|ля)?|р\.|[Рр](?=[\s.,!)]|$)|RUB|\/чел|\$|€)/);
    if (!m) return '';
    const prefix = m[1] ? 'от ' : '';
    const num = m[2].replace(/[.\s]+/g, ' ').trim();
    const cur = /\$/.test(m[0]) ? '$' : /€/.test(m[0]) ? '€' : '₽';
    return `${prefix}${num} ${cur}`;
}

/** "нояб–дек" / "5-12 июня" / "июнь" / '' */
export function extractWhen(text) {
    const s = text || '';
    let m = s.match(new RegExp(`\\(([^)]{0,28}(?:${MONTHS})[^)]{0,18})\\)`, 'i'));
    if (m) return clean(m[1]);
    m = s.match(new RegExp(`(?:вылет[ыа]?\\s+)?(\\d{1,2}(?:\\s*[–-]\\s*\\d{1,2})?\\s+(?:${MONTHS})[а-я]*)`, 'i'));
    if (m) return clean(m[1]);
    m = s.match(new RegExp(`\\b((?:${MONTHS})[а-я]*)\\b`, 'i'));
    if (m) return clean(m[1]);
    return '';
}

function lines(text) {
    return (text || '').split('\n').map((l) => clean(l)).filter(Boolean);
}

/**
 * Combine everything into the fields the row needs.
 * `primary` is the headline cell: the parsed route, or — when nothing parses —
 * the first line of the post shown verbatim (the brief's Route/Details fallback).
 */
export function deriveMeta(item) {
    // Parse a flag-code-stripped copy so orphan "tr"/"ru" tokens don't break
    // route detection or clutter the headline. Links still come from the
    // original text (extractLinks reads item.text), and the expanded panel
    // shows the original full post unchanged.
    const text = stripFlagCodes(item.text || '');
    const route = extractRoute(text);
    const ls = lines(text);

    // Headline: the parsed route, or — when nothing parses — the first line of
    // the post shown verbatim (capped, emoji stripped) per the brief's fallback.
    let primary = route;
    if (!primary) {
        primary = stripLead(ls[0] || '');
        if (primary.length > 100) primary = primary.slice(0, 100).trim() + '…';
    }

    // A short context subline: the first line mentioning a carrier / direct /
    // nights / inclusion. Only when we already have a route headline.
    let details = '';
    if (route) {
        const hit = ls.find((l) =>
            /прям|пересад|\bрейс|ночей|включено|\bRT\b|\bOW\b|туда[\s-]*обратно|в одну сторону|Pegasus|Аэрофлот|Red Wings|\bS7\b|Победа|Уральски|Nordwind|Azur|Smartavia/i.test(l)
        );
        if (hit) {
            const d = stripLead(hit);
            details = d.length > 120 ? d.slice(0, 120).trim() + '…' : d;
        }
    } else if (ls.length > 1) {
        const d = stripLead(ls[1]);
        details = d.length > 120 ? d.slice(0, 120).trim() + '…' : d;
    }

    return {
        type: detectType(text),
        route,
        primary,
        details,
        price: extractPrice(text),
        when: extractWhen(text),
        links: extractLinks(item),
    };
}
