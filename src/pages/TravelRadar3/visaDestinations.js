// Curated catalog of destinations a RUSSIAN passport holder can reach WITHOUT a
// pre-arranged visa — either fully visa-free, or with an easy visa-on-arrival /
// e-visa. Travelpayouts serves flight PRICES but has NO visa data, so this
// allowlist is what turns the radar from "cheapest flights anywhere" (which is
// always short domestic hops) into "hot tickets ABROAD without a visa".
//
// Shared by scripts/fetch-radar.js (feed filter) AND the page (safety filter +
// visa labels), so the two can never drift. Keyed by IATA AIRPORT code (flights
// use airport codes, not city codes) — any code not in this map is dropped.
//
// visa categories drive the badge; `note` carries the RU/EN detail (tooltip):
//   'free'  — no visa at all, just fly & enter
//   'voa'   — visa on arrival, issued at the airport (may carry a fee)
//   'evisa' — quick electronic visa / entry permit obtained before flying
//
// Verified against 2026 entry rules for RF citizens (checked Jul 2026). Visa
// policy shifts — keep this current; the whole radar's accuracy rides on it.

const FREE = 'free';
const VOA = 'voa';
const EVISA = 'evisa';

// [ IATA, city RU, city EN ] grouped per country. A country block may set a
// per-city visa/note override via a 4th element (object) when one city differs.
const COUNTRIES = [
    { country: { ru: 'Турция', en: 'Turkey' }, flag: '🇹🇷', visa: FREE, note: { ru: 'без визы до 60 дней', en: 'visa-free up to 60 days' }, cities: [
        ['IST', 'Стамбул', 'Istanbul'], ['SAW', 'Стамбул', 'Istanbul'], ['AYT', 'Анталия', 'Antalya'],
        ['BJV', 'Бодрум', 'Bodrum'], ['DLM', 'Даламан', 'Dalaman'], ['ADB', 'Измир', 'Izmir'], ['ESB', 'Анкара', 'Ankara'], ['TZX', 'Трабзон', 'Trabzon'],
    ] },
    { country: { ru: 'ОАЭ', en: 'UAE' }, flag: '🇦🇪', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['DXB', 'Дубай', 'Dubai'], ['AUH', 'Абу-Даби', 'Abu Dhabi'], ['SHJ', 'Шарджа', 'Sharjah'], ['RKT', 'Рас-эль-Хайма', 'Ras Al Khaimah'],
    ] },
    { country: { ru: 'Таиланд', en: 'Thailand' }, flag: '🇹🇭', visa: FREE, note: { ru: 'без визы до 60 дней', en: 'visa-free up to 60 days' }, cities: [
        ['BKK', 'Бангкок', 'Bangkok'], ['DMK', 'Бангкок', 'Bangkok'], ['HKT', 'Пхукет', 'Phuket'],
        ['KBV', 'Краби', 'Krabi'], ['USM', 'Самуи', 'Koh Samui'], ['CNX', 'Чиангмай', 'Chiang Mai'], ['UTP', 'Паттайя', 'Pattaya'],
    ] },
    { country: { ru: 'Египет', en: 'Egypt' }, flag: '🇪🇬', visa: VOA, note: { ru: 'виза по прилёту (Синай — бесплатно)', en: 'visa on arrival (Sinai — free)' }, cities: [
        ['HRG', 'Хургада', 'Hurghada'], ['SSH', 'Шарм-эль-Шейх', 'Sharm El Sheikh'], ['CAI', 'Каир', 'Cairo'],
        ['RMF', 'Марса-Алам', 'Marsa Alam'], ['HBE', 'Александрия', 'Alexandria'],
    ] },
    { country: { ru: 'Армения', en: 'Armenia' }, flag: '🇦🇲', visa: FREE, note: { ru: 'без визы до 180 дней', en: 'visa-free up to 180 days' }, cities: [
        ['EVN', 'Ереван', 'Yerevan'], ['LWN', 'Гюмри', 'Gyumri'],
    ] },
    { country: { ru: 'Грузия', en: 'Georgia' }, flag: '🇬🇪', visa: FREE, note: { ru: 'без визы до 1 года', en: 'visa-free up to 1 year' }, cities: [
        ['TBS', 'Тбилиси', 'Tbilisi'], ['BUS', 'Батуми', 'Batumi'], ['KUT', 'Кутаиси', 'Kutaisi'],
    ] },
    { country: { ru: 'Азербайджан', en: 'Azerbaijan' }, flag: '🇦🇿', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['GYD', 'Баку', 'Baku'],
    ] },
    { country: { ru: 'Казахстан', en: 'Kazakhstan' }, flag: '🇰🇿', visa: FREE, note: { ru: 'без визы', en: 'visa-free' }, cities: [
        ['ALA', 'Алматы', 'Almaty'], ['NQZ', 'Астана', 'Astana'], ['SCO', 'Актау', 'Aktau'], ['CIT', 'Шымкент', 'Shymkent'],
    ] },
    { country: { ru: 'Узбекистан', en: 'Uzbekistan' }, flag: '🇺🇿', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['TAS', 'Ташкент', 'Tashkent'], ['SKD', 'Самарканд', 'Samarkand'], ['BHK', 'Бухара', 'Bukhara'], ['UGC', 'Ургенч', 'Urgench'],
    ] },
    { country: { ru: 'Киргизия', en: 'Kyrgyzstan' }, flag: '🇰🇬', visa: FREE, note: { ru: 'без визы', en: 'visa-free' }, cities: [
        ['FRU', 'Бишкек', 'Bishkek'], ['OSS', 'Ош', 'Osh'],
    ] },
    { country: { ru: 'Беларусь', en: 'Belarus' }, flag: '🇧🇾', visa: FREE, note: { ru: 'без визы', en: 'visa-free' }, cities: [
        ['MSQ', 'Минск', 'Minsk'],
    ] },
    { country: { ru: 'Молдова', en: 'Moldova' }, flag: '🇲🇩', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['KIV', 'Кишинёв', 'Chisinau'],
    ] },
    { country: { ru: 'Сербия', en: 'Serbia' }, flag: '🇷🇸', visa: FREE, note: { ru: 'без визы до 30 дней', en: 'visa-free up to 30 days' }, cities: [
        ['BEG', 'Белград', 'Belgrade'], ['INI', 'Ниш', 'Nis'],
    ] },
    { country: { ru: 'Черногория', en: 'Montenegro' }, flag: '🇲🇪', visa: FREE, note: { ru: 'без визы до 30 дней', en: 'visa-free up to 30 days' }, cities: [
        ['TIV', 'Тиват', 'Tivat'], ['TGD', 'Подгорица', 'Podgorica'],
    ] },
    { country: { ru: 'Мальдивы', en: 'Maldives' }, flag: '🇲🇻', visa: FREE, note: { ru: 'бесплатная виза по прилёту, 30 дней', en: 'free visa on arrival, 30 days' }, cities: [
        ['MLE', 'Мале', 'Male'],
    ] },
    { country: { ru: 'Китай', en: 'China' }, flag: '🇨🇳', visa: FREE, note: { ru: 'без визы до 30 дней (2025–2027)', en: 'visa-free up to 30 days (2025–2027)' }, cities: [
        ['PEK', 'Пекин', 'Beijing'], ['PKX', 'Пекин', 'Beijing'], ['PVG', 'Шанхай', 'Shanghai'], ['CAN', 'Гуанчжоу', 'Guangzhou'],
        ['SZX', 'Шэньчжэнь', 'Shenzhen'], ['CTU', 'Чэнду', 'Chengdu'], ['XIY', 'Сиань', 'Xian'], ['SYX', 'Санья', 'Sanya'], ['URC', 'Урумчи', 'Urumqi'],
    ] },
    { country: { ru: 'Катар', en: 'Qatar' }, flag: '🇶🇦', visa: FREE, note: { ru: 'без визы до 30 дней', en: 'visa-free up to 30 days' }, cities: [
        ['DOH', 'Доха', 'Doha'],
    ] },
    { country: { ru: 'Марокко', en: 'Morocco' }, flag: '🇲🇦', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['CMN', 'Касабланка', 'Casablanca'], ['RAK', 'Марракеш', 'Marrakesh'], ['AGA', 'Агадир', 'Agadir'], ['FEZ', 'Фес', 'Fez'], ['TNG', 'Танжер', 'Tangier'],
    ] },
    { country: { ru: 'Тунис', en: 'Tunisia' }, flag: '🇹🇳', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['TUN', 'Тунис', 'Tunis'], ['NBE', 'Энфида', 'Enfidha'], ['DJE', 'Джерба', 'Djerba'], ['MIR', 'Монастир', 'Monastir'],
    ] },
    { country: { ru: 'Куба', en: 'Cuba' }, flag: '🇨🇺', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['HAV', 'Гавана', 'Havana'], ['VRA', 'Варадеро', 'Varadero'], ['HOG', 'Ольгин', 'Holguin'], ['CCC', 'Кайо-Коко', 'Cayo Coco' ],
    ] },
    { country: { ru: 'Доминикана', en: 'Dominican Rep.' }, flag: '🇩🇴', visa: FREE, note: { ru: 'без визы (туристическая карта)', en: 'visa-free (tourist card)' }, cities: [
        ['PUJ', 'Пунта-Кана', 'Punta Cana'], ['SDQ', 'Санто-Доминго', 'Santo Domingo'], ['POP', 'Пуэрто-Плата', 'Puerto Plata'],
    ] },
    { country: { ru: 'Сейшелы', en: 'Seychelles' }, flag: '🇸🇨', visa: FREE, note: { ru: 'без визы (разрешение по прилёту)', en: 'visa-free (entry permit on arrival)' }, cities: [
        ['SEZ', 'Маэ', 'Mahe'],
    ] },
    { country: { ru: 'Маврикий', en: 'Mauritius' }, flag: '🇲🇺', visa: FREE, note: { ru: 'без визы до 90 дней', en: 'visa-free up to 90 days' }, cities: [
        ['MRU', 'Маврикий', 'Mauritius'],
    ] },
    { country: { ru: 'Мьянма', en: 'Myanmar' }, flag: '🇲🇲', visa: FREE, note: { ru: 'без визы до 30 дней', en: 'visa-free up to 30 days' }, cities: [
        ['RGN', 'Янгон', 'Yangon'],
    ] },
    { country: { ru: 'Монголия', en: 'Mongolia' }, flag: '🇲🇳', visa: FREE, note: { ru: 'без визы до 30 дней', en: 'visa-free up to 30 days' }, cities: [
        ['ULN', 'Улан-Батор', 'Ulaanbaatar'],
    ] },
    { country: { ru: 'Саудовская Аравия', en: 'Saudi Arabia' }, flag: '🇸🇦', visa: FREE, note: { ru: 'без визы (с 11.05.2026)', en: 'visa-free (from 11 May 2026)' }, cities: [
        ['JED', 'Джидда', 'Jeddah'], ['RUH', 'Эр-Рияд', 'Riyadh'],
    ] },
    // ---- visa on arrival / e-visa (issued at the airport or online) ----
    { country: { ru: 'Индонезия', en: 'Indonesia' }, flag: '🇮🇩', visa: VOA, note: { ru: 'виза по прилёту (платно)', en: 'visa on arrival (paid)' }, cities: [
        ['DPS', 'Бали', 'Bali'], ['CGK', 'Джакарта', 'Jakarta'],
    ] },
    { country: { ru: 'Шри-Ланка', en: 'Sri Lanka' }, flag: '🇱🇰', visa: EVISA, note: { ru: 'электронное разрешение ETA', en: 'ETA e-permit' }, cities: [
        ['CMB', 'Коломбо', 'Colombo'],
    ] },
    { country: { ru: 'Иордания', en: 'Jordan' }, flag: '🇯🇴', visa: VOA, note: { ru: 'виза по прилёту', en: 'visa on arrival' }, cities: [
        ['AMM', 'Амман', 'Amman'], ['AQJ', 'Акаба', 'Aqaba'],
    ] },
    { country: { ru: 'Оман', en: 'Oman' }, flag: '🇴🇲', visa: EVISA, note: { ru: 'электронная виза', en: 'e-visa' }, cities: [
        ['MCT', 'Маскат', 'Muscat'],
    ] },
    { country: { ru: 'Танзания', en: 'Tanzania' }, flag: '🇹🇿', visa: VOA, note: { ru: 'виза по прилёту', en: 'visa on arrival' }, cities: [
        ['ZNZ', 'Занзибар', 'Zanzibar'], ['DAR', 'Дар-эс-Салам', 'Dar es Salaam'], ['JRO', 'Килиманджаро', 'Kilimanjaro'],
    ] },
    { country: { ru: 'Кения', en: 'Kenya' }, flag: '🇰🇪', visa: EVISA, note: { ru: 'электронное разрешение eTA', en: 'eTA e-permit' }, cities: [
        ['NBO', 'Найроби', 'Nairobi'], ['MBA', 'Момбаса', 'Mombasa'],
    ] },
    { country: { ru: 'Непал', en: 'Nepal' }, flag: '🇳🇵', visa: VOA, note: { ru: 'виза по прилёту', en: 'visa on arrival' }, cities: [
        ['KTM', 'Катманду', 'Kathmandu'],
    ] },
    { country: { ru: 'Камбоджа', en: 'Cambodia' }, flag: '🇰🇭', visa: VOA, note: { ru: 'виза по прилёту', en: 'visa on arrival' }, cities: [
        ['REP', 'Сием-Реап', 'Siem Reap'], ['PNH', 'Пномпень', 'Phnom Penh'],
    ] },
    { country: { ru: 'Лаос', en: 'Laos' }, flag: '🇱🇦', visa: VOA, note: { ru: 'виза по прилёту', en: 'visa on arrival' }, cities: [
        ['VTE', 'Вьентьян', 'Vientiane'],
    ] },
    { country: { ru: 'Бахрейн', en: 'Bahrain' }, flag: '🇧🇭', visa: EVISA, note: { ru: 'электронная виза', en: 'e-visa' }, cities: [
        ['BAH', 'Манама', 'Manama'],
    ] },
    // Vietnam: mainland is e-visa, but Phu Quoc island is visa-free 30 days.
    { country: { ru: 'Вьетнам', en: 'Vietnam' }, flag: '🇻🇳', visa: EVISA, note: { ru: 'электронная виза', en: 'e-visa' }, cities: [
        ['SGN', 'Хошимин', 'Ho Chi Minh'], ['HAN', 'Ханой', 'Hanoi'], ['CXR', 'Нячанг', 'Nha Trang'], ['DAD', 'Дананг', 'Da Nang'],
        ['PQC', 'Фукуок', 'Phu Quoc', { visa: FREE, note: { ru: 'о. Фукуок — без визы 30 дней', en: 'Phu Quoc — visa-free 30 days' } }],
    ] },
];

// Flatten to { IATA: { code, country, city:{ru,en}, flag, visa, note } }.
export const VISA_DESTINATIONS = {};
for (const c of COUNTRIES) {
    for (const [code, ru, en, override] of c.cities) {
        VISA_DESTINATIONS[code] = {
            code,
            country: c.country,
            city: { ru, en },
            flag: c.flag,
            visa: override?.visa || c.visa,
            note: override?.note || c.note,
        };
    }
}

// Visa info for a destination airport code, or null if it's not a target
// (domestic / visa-required) destination — which is the filter signal.
export function visaInfo(code) {
    return VISA_DESTINATIONS[code] || null;
}

// True when a destination is reachable without a pre-arranged visa (our target).
export function isVisaTarget(code) {
    return Boolean(VISA_DESTINATIONS[code]);
}

// Localized destination city name from the catalog (falls back to the code).
export function destName(code, lang) {
    const d = VISA_DESTINATIONS[code];
    return d ? d.city[lang] || d.city.en : code;
}
