/**
 * Destination dictionary for Telegram deal parsing.
 *
 * This is deliberately broader than VISA_DESTINATIONS. The public price radar
 * may focus on easy-entry countries, while the Telegram feed must understand
 * any real offer published by a source, including visa-required destinations.
 *
 * Shape: [IATA city code, display name, aliases/stems used in channel posts].
 * Aliases are lowercase substrings, so use stable roots that survive Russian
 * declension and avoid roots shorter than four characters.
 */
import { VISA_DESTINATIONS } from '../src/pages/TravelRadar3/visaDestinations.js';

const EXTRA_DESTINATIONS = [
    // Russia: domestic offers are just as valid as international ones.
    ['RGK', 'Алтай', ['алтай', 'горный алтай', 'манжерок', 'горно-алтайск']],
    ['MRV', 'Кавказские Минеральные Воды', ['кавминвод', 'кавказские минеральные воды', 'минеральные воды']],
    ['IKT', 'Байкал', ['байкал', 'иркутск']],
    ['PES', 'Карелия', ['карели', 'петрозаводск']],
    ['MMK', 'Мурманск', ['мурманск', 'териберк']],
    ['KGD', 'Калининград', ['калининград']],
    ['AER', 'Сочи', ['сочи', 'красная поляна']],
    ['MCX', 'Дагестан', ['дагестан', 'махачкал', 'дербент']],
    ['UUS', 'Сахалин', ['сахалин', 'южно-сахалинск']],
    ['PKC', 'Камчатка', ['камчат', 'петропавловск-камчатский']],
    ['VVO', 'Владивосток', ['владивосток', 'приморье']],

    // Oceania
    ['AKL', 'Новая Зеландия', ['новая зеландия', 'новой зеландии', 'новую зеландию', 'зеланд', 'new zealand']],
    ['AKL', 'Окленд', ['окленд', 'auckland']],
    ['CHC', 'Крайстчерч', ['крайстчерч', 'christchurch']],
    ['ZQN', 'Куинстаун', ['куинстаун', 'queenstown']],
    ['SYD', 'Австралия', ['австрали', 'australia']],
    ['SYD', 'Сидней', ['сидней', 'sydney']],
    ['MEL', 'Мельбурн', ['мельбурн', 'melbourne']],
    ['BNE', 'Брисбен', ['брисбен', 'brisbane']],
    ['PER', 'Перт', ['перт', 'perth']],

    // Europe beyond the visa/easy-entry catalog
    ['PAR', 'Франция', ['франц', 'france']],
    ['PAR', 'Париж', ['париж', 'paris']],
    ['NCE', 'Ницца', ['ницц', 'nice']],
    ['ROM', 'Италия', ['итал', 'italy']],
    ['ROM', 'Рим', ['риме', 'рим ', 'rome']],
    ['MIL', 'Милан', ['милан', 'milan']],
    ['VCE', 'Венеция', ['венеци', 'venice']],
    ['NAP', 'Неаполь', ['неапол', 'naples']],
    ['BCN', 'Испания', ['испан', 'spain']],
    ['BCN', 'Барселона', ['барселон', 'barcelona']],
    ['MAD', 'Мадрид', ['мадрид', 'madrid']],
    ['AGP', 'Малага', ['малаг', 'malaga']],
    ['BER', 'Германия', ['германи', 'germany']],
    ['BER', 'Берлин', ['берлин', 'berlin']],
    ['MUC', 'Мюнхен', ['мюнхен', 'munich']],
    ['FRA', 'Франкфурт', ['франкфурт', 'frankfurt']],
    ['ATH', 'Греция', ['греци', 'greece']],
    ['ATH', 'Афины', ['афин', 'athens']],
    ['SKG', 'Салоники', ['салоник', 'thessaloniki']],
    ['HER', 'Крит', ['крите', 'крит ', 'crete']],
    ['RHO', 'Родос', ['родос', 'rhodes']],
    ['LCA', 'Кипр', ['кипр', 'cyprus']],
    ['LCA', 'Ларнака', ['ларнак', 'larnaca']],
    ['PFO', 'Пафос', ['пафос', 'paphos']],
    ['LIS', 'Португалия', ['португал', 'portugal']],
    ['LIS', 'Лиссабон', ['лиссабон', 'lisbon']],
    ['OPO', 'Порту', ['порту', 'porto']],
    ['AMS', 'Нидерланды', ['нидерланд', 'голланди', 'netherlands']],
    ['AMS', 'Амстердам', ['амстердам', 'amsterdam']],
    ['VIE', 'Австрия', ['австри', 'austria']],
    ['VIE', 'Вена', ['вену', 'вене', 'вена', 'vienna']],
    ['ZRH', 'Швейцария', ['швейцар', 'switzerland']],
    ['ZRH', 'Цюрих', ['цюрих', 'zurich']],
    ['GVA', 'Женева', ['женев', 'geneva']],
    ['PRG', 'Чехия', ['чехи', 'czech']],
    ['PRG', 'Прага', ['праг', 'prague']],
    ['BUD', 'Венгрия', ['венгри', 'hungary']],
    ['BUD', 'Будапешт', ['будапешт', 'budapest']],
    ['ZAG', 'Хорватия', ['хорвати', 'croatia']],
    ['ZAG', 'Загреб', ['загреб', 'zagreb']],
    ['SPU', 'Сплит', ['сплит', 'split']],
    ['DBV', 'Дубровник', ['дубровник', 'dubrovnik']],
    ['LJU', 'Словения', ['словени', 'slovenia']],
    ['BTS', 'Словакия', ['словаки', 'slovakia']],
    ['WAW', 'Польша', ['польш', 'poland']],
    ['WAW', 'Варшава', ['варшав', 'warsaw']],
    ['KRK', 'Краков', ['краков', 'krakow']],
    ['GDN', 'Гданьск', ['гданьск', 'gdansk']],
    ['HEL', 'Финляндия', ['финлянд', 'finland']],
    ['HEL', 'Хельсинки', ['хельсинк', 'helsinki']],
    ['STO', 'Швеция', ['швеци', 'sweden']],
    ['STO', 'Стокгольм', ['стокгольм', 'stockholm']],
    ['OSL', 'Норвегия', ['норвеги', 'norway']],
    ['OSL', 'Осло', ['осло', 'oslo']],
    ['CPH', 'Дания', ['дания', 'данию', 'denmark']],
    ['CPH', 'Копенгаген', ['копенгаген', 'copenhagen']],
    ['KEF', 'Исландия', ['исланди', 'iceland']],
    ['KEF', 'Рейкьявик', ['рейкьявик', 'reykjavik']],
    ['MLA', 'Мальта', ['мальт', 'malta']],
    ['BRU', 'Бельгия', ['бельги', 'belgium']],
    ['BRU', 'Брюссель', ['брюссел', 'brussels']],
    ['SOF', 'Болгария', ['болгари', 'bulgaria']],
    ['SOF', 'София', ['софи', 'sofia']],
    ['VAR', 'Варна', ['варн', 'varna']],
    ['BOJ', 'Бургас', ['бургас', 'burgas']],
    ['BUH', 'Румыния', ['румыни', 'romania']],
    ['BUH', 'Бухарест', ['бухарест', 'bucharest']],
    ['TIA', 'Албания', ['албани', 'albania']],
    ['TIA', 'Тирана', ['тиран', 'tirana']],
    ['SJJ', 'Босния и Герцеговина', ['босни', 'герцеговин', 'bosnia']],
    ['SKP', 'Северная Македония', ['македони', 'macedonia']],
    ['LON', 'Великобритания', ['великобритан', 'англию', 'англии', 'united kingdom', 'great britain']],
    ['LON', 'Лондон', ['лондон', 'london']],
    ['EDI', 'Эдинбург', ['эдинбург', 'edinburgh']],
    ['DUB', 'Ирландия', ['ирланди', 'ireland']],
    ['DUB', 'Дублин', ['дублин', 'dublin']],

    // East, South and South-East Asia
    ['TYO', 'Япония', ['япони', 'japan']],
    ['TYO', 'Токио', ['токио', 'tokyo']],
    ['OSA', 'Осака', ['осак', 'osaka']],
    ['SEL', 'Южная Корея', ['южн коре', 'корею', 'корее', 'south korea']],
    ['SEL', 'Сеул', ['сеул', 'seoul']],
    ['DEL', 'Индия', ['индию', 'индии', 'india']],
    ['DEL', 'Дели', ['дели', 'delhi']],
    ['GOI', 'Гоа', ['гоа', 'goa']],
    ['BOM', 'Мумбаи', ['мумбаи', 'бомбей', 'mumbai']],
    ['KUL', 'Малайзия', ['малайзи', 'malaysia']],
    ['KUL', 'Куала-Лумпур', ['куала-лумпур', 'куала лумпур', 'kuala lumpur']],
    ['SIN', 'Сингапур', ['сингапур', 'singapore']],
    ['MNL', 'Филиппины', ['филиппин', 'philippines']],
    ['MNL', 'Манила', ['манил', 'manila']],
    ['CEB', 'Себу', ['себу', 'cebu']],
    ['TPE', 'Тайвань', ['тайван', 'taiwan']],
    ['TPE', 'Тайбэй', ['тайбэ', 'taipei']],
    ['HKG', 'Гонконг', ['гонконг', 'hong kong']],
    ['MFM', 'Макао', ['макао', 'macau']],
    ['DAC', 'Бангладеш', ['бангладеш', 'bangladesh']],
    ['ISB', 'Пакистан', ['пакистан', 'pakistan']],

    // Americas
    ['NYC', 'США', ['сша', 'соединенн штат', 'united states', 'usa']],
    ['NYC', 'Нью-Йорк', ['нью-йорк', 'нью йорк', 'new york']],
    ['LAX', 'Лос-Анджелес', ['лос-анджелес', 'лос анджелес', 'los angeles']],
    ['MIA', 'Майами', ['майами', 'miami']],
    ['SFO', 'Сан-Франциско', ['сан-франциско', 'сан франциско', 'san francisco']],
    ['YTO', 'Канада', ['канад', 'canada']],
    ['YTO', 'Торонто', ['торонто', 'toronto']],
    ['YVR', 'Ванкувер', ['ванкувер', 'vancouver']],
    ['CUN', 'Мексика', ['мексик', 'mexico']],
    ['CUN', 'Канкун', ['канкун', 'cancun']],
    ['MEX', 'Мехико', ['мехико', 'mexico city']],
    ['RIO', 'Бразилия', ['бразили', 'brazil']],
    ['RIO', 'Рио-де-Жанейро', ['рио-де-жанейро', 'рио де жанейро', 'rio de janeiro']],
    ['SAO', 'Сан-Паулу', ['сан-паулу', 'сан паулу', 'sao paulo']],
    ['BUE', 'Аргентина', ['аргентин', 'argentina']],
    ['BUE', 'Буэнос-Айрес', ['буэнос-айрес', 'буэнос айрес', 'buenos aires']],
    ['SCL', 'Чили', ['чили', 'chile']],
    ['LIM', 'Перу', ['перу', 'peru']],
    ['LIM', 'Лима', ['лиму', 'лиме', 'лима', 'lima']],
    ['BOG', 'Колумбия', ['колумби', 'colombia']],
    ['BOG', 'Богота', ['богот', 'bogota']],
    ['CTG', 'Картахена', ['картахен', 'cartagena']],

    // Africa and the Middle East
    ['CPT', 'ЮАР', ['юар', 'южн африк', 'south africa']],
    ['CPT', 'Кейптаун', ['кейптаун', 'cape town']],
    ['JNB', 'Йоханнесбург', ['йоханнесбург', 'johannesburg']],
    ['ADD', 'Эфиопия', ['эфиопи', 'ethiopia']],
    ['ADD', 'Аддис-Абеба', ['аддис-абеб', 'аддис абеб', 'addis ababa']],
    ['TNR', 'Мадагаскар', ['мадагаскар', 'madagascar']],
    ['WDH', 'Намибия', ['намиби', 'namibia']],
    ['TLV', 'Израиль', ['израил', 'israel']],
    ['TLV', 'Тель-Авив', ['тель-авив', 'тель авив', 'tel aviv']],
    ['THR', 'Иран', ['иране', 'иран ', 'iran']],
    ['THR', 'Тегеран', ['тегеран', 'tehran']],
];

function normalize(value) {
    return String(value || '')
        .toLocaleLowerCase('ru')
        .replaceAll('ё', 'е')
        .replace(/[‐‑‒–—]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function automaticStem(name) {
    const normalized = normalize(name);
    if (normalized.length < 5) return normalized;
    return normalized.slice(0, Math.max(4, normalized.length - 1));
}

const entries = [];
const seen = new Set();

function add(stem, code, name) {
    const normalized = normalize(stem);
    if (normalized.length < 4) return;
    const key = `${normalized}:${code}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push([normalized, code, name]);
}

// All existing visa/easy-entry city names remain supported.
for (const destination of Object.values(VISA_DESTINATIONS)) {
    add(destination.city.ru, destination.code, destination.city.ru);
    add(automaticStem(destination.city.ru), destination.code, destination.city.ru);
}

// Country mentions are now handled systematically, rather than by a small
// hand-picked list. The first airport in a country is its representative hub.
const representativeCountries = new Map();
for (const destination of Object.values(VISA_DESTINATIONS)) {
    if (!representativeCountries.has(destination.country.ru)) {
        representativeCountries.set(destination.country.ru, destination);
    }
}
for (const [country, destination] of representativeCountries) {
    add(country, destination.code, country);
    add(automaticStem(country), destination.code, country);
}

for (const [code, name, aliases] of EXTRA_DESTINATIONS) {
    add(name, code, name);
    add(automaticStem(name), code, name);
    aliases.forEach((alias) => add(alias, code, name));
}

export const DEAL_DESTINATIONS = entries;
