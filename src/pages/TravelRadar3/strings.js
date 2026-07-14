// Self-contained i18n for the isolated Travel Radar 3.0 module.
// Kept local (not in the global locale files) so the whole feature can be
// rolled back by deleting this folder + its route + header entry.

export const STR = {
    ru: {
        pageTitle: 'Радар путешествий',
        visaTag: 'без визы',
        subtitle: 'Горящие авиабилеты из России в страны без визы — живые цены, обновляются автоматически. Каждая ведёт на Aviasales.',
        updated: 'обновлено',
        source: 'данные Travelpayouts',
        loading: 'Загружаем цены…',
        noData: 'Данные пока не подгрузились. Обновите страницу через минуту.',

        hotTitle: 'Горящие билеты за границу',
        hotDesc: 'Билеты в безвизовые страны заметно дешевле обычной цены маршрута.',
        hotEmpty: 'Сейчас крупных скидок в безвизовые страны нет — лента обновляется каждые пару часов, загляните позже.',
        usually: 'обычно',

        cheapTitle: 'Куда улететь без визы',
        cheapDesc: 'Самые дешёвые безвизовые направления прямо сейчас из выбранного города.',
        from: 'Откуда',
        fromPrice: 'от',

        visaFree: 'без визы',
        visaVoa: 'виза по прилёту',
        visaEvisa: 'e-виза',

        calTitle: 'Календарь цен',
        calDesc: 'Выбери город и направление — покажем самые дешёвые даты вылета.',
        direction: 'Куда',
        cheapest: 'дешевле всего',
        legendCheap: 'дёшево',
        legendMid: 'средне',
        legendExp: 'дорого',

        hotelTitle: 'Отели',
        hotelDesc: 'Поиск отелей в популярных городах. Цены и наличие — на странице поиска.',
        hotelFind: 'Найти отели',

        partnersTitle: 'Забронировать',
        partnersDesc: 'Отели, жильё и экскурсии у проверенных сервисов. Цены и наличие — на их сайтах.',
        hotelPricesLabel: 'Подборка отелей',

        direct: 'прямой',
        buy: 'Купить на Aviasales',
        disclaimer: 'Цены из Travelpayouts Data API — кэшированы (не в реальном времени), обновляются автоматически. Визовые условия — справочно, уточняйте перед поездкой. Ссылки партнёрские, бронирование на Aviasales.',
    },
    en: {
        pageTitle: 'Travel Radar',
        visaTag: 'visa-free',
        subtitle: 'Hot flights from Russia to visa-free countries — live prices, refreshed automatically. Every one links to Aviasales.',
        updated: 'updated',
        source: 'data by Travelpayouts',
        loading: 'Loading prices…',
        noData: 'Data has not loaded yet. Refresh the page in a minute.',

        hotTitle: 'Hot flights abroad',
        hotDesc: 'Tickets to visa-free countries noticeably below the route’s usual price.',
        hotEmpty: 'No big drops to visa-free countries right now — the feed refreshes every couple of hours, check back later.',
        usually: 'usually',

        cheapTitle: 'Where to fly visa-free',
        cheapDesc: 'The cheapest visa-free destinations right now from the selected city.',
        from: 'From',
        fromPrice: 'from',

        visaFree: 'visa-free',
        visaVoa: 'visa on arrival',
        visaEvisa: 'e-visa',

        calTitle: 'Price calendar',
        calDesc: 'Pick a city and route — we’ll show the cheapest departure dates.',
        direction: 'To',
        cheapest: 'cheapest',
        legendCheap: 'cheap',
        legendMid: 'mid',
        legendExp: 'pricey',

        hotelTitle: 'Hotels',
        hotelDesc: 'Search hotels in popular cities. Prices and availability on the search page.',
        hotelFind: 'Find hotels',

        partnersTitle: 'Book',
        partnersDesc: 'Hotels, stays and tours via trusted services. Prices and availability on their sites.',
        hotelPricesLabel: 'Featured hotels',

        direct: 'direct',
        buy: 'Book on Aviasales',
        disclaimer: 'Prices from the Travelpayouts Data API — cached (not real-time), refreshed automatically. Visa terms are for reference — verify before travel. Links are affiliate; booking on Aviasales.',
    },
};

// Short visa-category label for the destination badge ('free' | 'voa' | 'evisa').
export function visaShort(cat, s) {
    if (cat === 'voa') return s.visaVoa;
    if (cat === 'evisa') return s.visaEvisa;
    return s.visaFree;
}

// Localized "N transfers" (RU plural-aware).
export function transfersLabel(n, lang, s) {
    if (n === 0 || n == null) return s.direct;
    if (lang === 'ru') {
        const mod10 = n % 10, mod100 = n % 100;
        const word = mod10 === 1 && mod100 !== 11 ? 'пересадка'
            : [2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100) ? 'пересадки'
                : 'пересадок';
        return `${n} ${word}`;
    }
    return `${n} ${n === 1 ? 'stop' : 'stops'}`;
}
