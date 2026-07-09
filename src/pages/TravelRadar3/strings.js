// Self-contained i18n for the isolated Travel Radar 3.0 module.
// Kept local (not in the global locale files) so the whole feature can be
// rolled back by deleting this folder + its route + header entry.

export const STR = {
    ru: {
        pageTitle: 'Радар цен',
        subtitle: 'Живые цены на авиабилеты — обновляются автоматически. Каждая цена ведёт на Aviasales.',
        updated: 'обновлено',
        source: 'данные Travelpayouts',
        loading: 'Загружаем цены…',
        noData: 'Данные пока не подгрузились. Обновите страницу через минуту.',

        hotTitle: 'Горящие рейсы',
        hotDesc: 'Билеты заметно дешевле обычной цены маршрута.',
        hotEmpty: 'Сейчас крупных скидок нет — лента обновляется каждые пару часов, загляните позже.',
        usually: 'обычно',

        cheapTitle: 'Куда улететь дёшево',
        cheapDesc: 'Самые дешёвые направления прямо сейчас из выбранного города.',
        from: 'Откуда',
        fromPrice: 'от',

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
        disclaimer: 'Цены из Travelpayouts Data API — кэшированы (не в реальном времени), обновляются автоматически. Ссылки партнёрские, бронирование на Aviasales.',
    },
    en: {
        pageTitle: 'Price Radar',
        subtitle: 'Live flight prices — refreshed automatically. Every price links to Aviasales.',
        updated: 'updated',
        source: 'data by Travelpayouts',
        loading: 'Loading prices…',
        noData: 'Data has not loaded yet. Refresh the page in a minute.',

        hotTitle: 'Hot flights',
        hotDesc: 'Tickets noticeably below the route’s usual price.',
        hotEmpty: 'No big drops right now — the feed refreshes every couple of hours, check back later.',
        usually: 'usually',

        cheapTitle: 'Where to fly cheap',
        cheapDesc: 'The cheapest destinations right now from the selected city.',
        from: 'From',
        fromPrice: 'from',

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
        disclaimer: 'Prices from the Travelpayouts Data API — cached (not real-time), refreshed automatically. Links are affiliate; booking on Aviasales.',
    },
};

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
