import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    ArrowDownUp,
    BedDouble,
    Bell,
    CalendarDays,
    ChevronDown,
    CheckCircle2,
    CreditCard,
    ExternalLink,
    Flame,
    LayoutGrid,
    Plane,
    RefreshCw,
    Search,
    Send,
    SlidersHorizontal,
    Sparkles,
    TableProperties,
    Ticket,
    X,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { fmtPrice } from './helpers';
import bundledTravelFeed from '../../../public/hot-deals.json';
import './TravelRadar3.css';

const FEED_REQUEST_TIMEOUT_MS = 1_500;

async function fetchTravelFeed() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FEED_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch('/api/travel/deals', {
            cache: 'no-cache',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Travel feed HTTP ${response.status}`);
        return await response.json();
    } finally {
        window.clearTimeout(timeout);
    }
}

const COPY = {
    ru: {
        eyebrow: 'Живые находки',
        title: 'Горящие туры и билеты',
        alertsCta: 'Получать уведомления',
        updated: 'Лента обновлена',
        all: 'Все',
        flights: 'Билеты',
        tours: 'Туры',
        allOrigins: 'Откуда угодно',
        allDestinations: 'Куда угодно',
        countriesGroup: 'Страны',
        citiesGroup: 'Города',
        typeCity: 'город или страна',
        noPlaces: 'Совпадений нет',
        search: 'Страна, город или канал',
        filters: 'Фильтры',
        resetFilters: 'Сбросить',
        showMore: 'Показать ещё',
        from: 'из',
        oneWay: 'в одну сторону',
        roundTrip: 'туда‑обратно',
        connection: 'стыковка',
        nights: 'ночей',
        open: 'Открыть предложение',
        tableOpen: 'Открыть',
        advertisement: 'Реклама',
        source: 'Источник',
        noDeals: 'Измените фильтры, чтобы увидеть подходящие предложения.',
        found: 'предложений',
        foundShort: 'найдено',
        tableView: 'Таблица',
        cardView: 'Карточки',
        viewLabel: 'Вид предложений',
        sortLabel: 'Сортировка',
        sortNewest: 'Сначала новые',
        sortDeparture: 'Ближайший вылет',
        sortPriceLow: 'Сначала дешевле',
        sortPriceHigh: 'Сначала дороже',
        sortSavings: 'Максимальная экономия',
        sortOrigin: 'Город вылета А–Я',
        sortDestination: 'Направление А–Я',
        sortNewestShort: 'Новые',
        sortDepartureShort: 'Вылет раньше',
        sortPriceLowShort: 'Цена ↑',
        sortPriceHighShort: 'Цена ↓',
        sortSavingsShort: 'Экономия',
        sortOriginShort: 'Откуда А–Я',
        sortDestinationShort: 'Куда А–Я',
        tableCaption: 'Актуальные предложения Радара путешествий',
        origin: 'Откуда',
        destination: 'Куда',
        departure: 'Дата вылета',
        arrival: 'Дата прилёта',
        dealType: 'Тип',
        people: 'Цена за',
        price: 'Цена',
        savings: 'Экономия',
        description: 'Описание',
        expandDescription: 'Показать полностью',
        collapseDescription: 'Свернуть',
        offerDate: 'Опубликовано',
        link: 'Сайт',
        noDate: 'Не указано',
        usefulEyebrow: 'Следующий шаг',
        usefulTitle: 'Полезные сервисы для поездки',
        usefulLead: 'Когда предложение найдено, здесь можно подобрать жильё, экскурсии и проверить другие варианты.',
        disclosure: 'Партнёрские ссылки отмечены словом «Реклама». За подтверждённое бронирование сервис может выплатить нам комиссию.',
        freshNote: 'Цены быстро меняются. Проверяйте итоговую стоимость и условия на странице продавца.',
        alertsEyebrow: 'Персональный радар',
        alertsTitle: 'Уведомления о подходящих предложениях',
        alertsLead: 'Задайте маршрут и бюджет. Как только в каналах появится подходящее предложение, бот пришлёт его в Telegram.',
        maxPrice: 'Цена не выше, ₽',
        minDiscount: 'Скидка от, %',
        email: 'Email для оплаты и чека',
        consent: 'Согласен на списание 300 ₽ каждые 30 дней. Автопродление можно отключить в любой момент.',
        privacyConsent: 'Согласен на обработку данных по политике конфиденциальности.',
        connect: 'Настроить уведомления',
        openTelegram: 'Подключить Telegram',
        telegramHint: 'Откройте бота и нажмите Start, затем вернитесь на эту страницу.',
        checkTelegram: 'Проверить подключение',
        checkingTelegram: 'Проверяем Telegram…',
        statusRefreshFailed: 'Статус не обновился. Проверьте соединение и повторите.',
        sessionExpired: 'Ссылка подключения устарела. Настройте уведомления заново.',
        pay: 'Оплатить 300 ₽',
        activeAlert: 'Уведомления активны',
        activeUntil: 'Оплачено до',
        cancelRenewal: 'Отключить автопродление и отвязать способ оплаты',
        cancelRenewalConfirm: 'Отключить автопродление и отвязать сохранённый способ оплаты? Уведомления продолжат работать до конца оплаченного периода.',
        editAlerts: 'Изменить фильтры',
        saveAlerts: 'Сохранить фильтры',
        cancellationScheduled: 'Автопродление отключено · способ оплаты отвязан',
        capabilitiesLoading: 'Проверяем подключение оплаты…',
        alertsUnavailable: 'Подключение оплаты требует проверки. Обновите страницу через минуту.',
        paymentNote: '300 ₽ за 30 дней · оплата через YooKassa · автопродление',
    },
    en: {
        eyebrow: 'Live finds',
        title: 'Hot tours and flight deals',
        alertsCta: 'Get alerts',
        updated: 'Feed updated',
        all: 'All',
        flights: 'Flights',
        tours: 'Tours',
        allOrigins: 'From anywhere',
        allDestinations: 'To anywhere',
        countriesGroup: 'Countries',
        citiesGroup: 'Cities',
        typeCity: 'city or country',
        noPlaces: 'No matches',
        search: 'Country, city or channel',
        filters: 'Filters',
        resetFilters: 'Reset',
        showMore: 'Show more',
        from: 'from',
        oneWay: 'one way',
        roundTrip: 'round trip',
        connection: 'connection',
        nights: 'nights',
        open: 'Open deal',
        tableOpen: 'Open',
        advertisement: 'Ad',
        source: 'Source',
        noDeals: 'Adjust the filters to see matching deals.',
        found: 'deals',
        foundShort: 'found',
        tableView: 'Table',
        cardView: 'Cards',
        viewLabel: 'Deal view',
        sortLabel: 'Sort',
        sortNewest: 'Newest first',
        sortDeparture: 'Soonest departure',
        sortPriceLow: 'Lowest price',
        sortPriceHigh: 'Highest price',
        sortSavings: 'Biggest saving',
        sortOrigin: 'Origin A–Z',
        sortDestination: 'Destination A–Z',
        sortNewestShort: 'Newest',
        sortDepartureShort: 'Soonest',
        sortPriceLowShort: 'Price ↑',
        sortPriceHighShort: 'Price ↓',
        sortSavingsShort: 'Savings',
        sortOriginShort: 'From A–Z',
        sortDestinationShort: 'To A–Z',
        tableCaption: 'Current Travel Radar deals',
        origin: 'From',
        destination: 'To',
        departure: 'Departure date',
        arrival: 'Arrival date',
        dealType: 'Type',
        people: 'Price for',
        price: 'Price',
        savings: 'Saving',
        description: 'Description',
        expandDescription: 'Show full description',
        collapseDescription: 'Collapse',
        offerDate: 'Published',
        link: 'Deal',
        noDate: 'Not specified',
        usefulEyebrow: 'Next step',
        usefulTitle: 'Useful services for your trip',
        usefulLead: 'Once you find a deal, use these links to choose a stay, activities and compare alternatives.',
        disclosure: 'Affiliate links carry an “Ad” label. We may receive a commission for a confirmed booking.',
        freshNote: 'Prices change quickly. Confirm the final price and terms on the seller page.',
        alertsEyebrow: 'Personal radar',
        alertsTitle: 'Alerts for matching deals',
        alertsLead: 'Set your route and budget. The bot will send a Telegram alert as soon as a matching deal appears.',
        maxPrice: 'Maximum price, RUB',
        minDiscount: 'Minimum discount, %',
        email: 'Email for payment receipt',
        consent: 'I agree to a 300 RUB charge every 30 days. Auto-renewal can be disabled at any time.',
        privacyConsent: 'I agree to data processing under the privacy policy.',
        connect: 'Configure alerts',
        openTelegram: 'Connect Telegram',
        telegramHint: 'Open the bot and press Start, then return to this page.',
        checkTelegram: 'Check connection',
        checkingTelegram: 'Checking Telegram…',
        statusRefreshFailed: 'The status did not update. Check your connection and try again.',
        sessionExpired: 'The connection link has expired. Configure alerts again.',
        pay: 'Pay 300 RUB',
        activeAlert: 'Alerts are active',
        activeUntil: 'Paid until',
        cancelRenewal: 'Disable auto-renewal and unlink payment method',
        cancelRenewalConfirm: 'Disable auto-renewal and unlink the saved payment method? Alerts will remain active until the paid period ends.',
        editAlerts: 'Edit filters',
        saveAlerts: 'Save filters',
        cancellationScheduled: 'Auto-renewal disabled · payment method unlinked',
        capabilitiesLoading: 'Checking payment connection…',
        alertsUnavailable: 'The payment connection needs verification. Refresh the page in a minute.',
        paymentNote: '300 RUB for 30 days · YooKassa checkout · auto-renewal',
    },
};

const SERVICES = [
    {
        icon: BedDouble,
        title: { ru: 'Жильё', en: 'Stays' },
        description: { ru: 'Отели и квартиры', en: 'Hotels and apartments' },
        links: [
            { name: 'Островок', url: 'https://ostrovok.tpx.gr/hNufxzWm' },
            { name: 'Суточно.ру', url: 'https://sutochno.tpx.gr/GpFGHGCz' },
            { name: 'Яндекс Путешествия', url: 'https://yandex.tpx.gr/JT6O6DFZ' },
            { name: 'Avito Путешествия', url: 'https://avito.tpx.gr/bNAvjcvf' },
        ],
    },
    {
        icon: Sparkles,
        title: { ru: 'Впечатления', en: 'Things to do' },
        description: { ru: 'Экскурсии и активности', en: 'Tours and activities' },
        links: [
            { name: 'Трипстер', url: 'https://tripster.tpx.gr/DWvu8aIU' },
            { name: 'Sputnik8', url: 'https://sputnik8.tpx.gr/v1gXh4nK' },
        ],
    },
    {
        icon: Plane,
        title: { ru: 'Сравнить билеты', en: 'Compare flights' },
        description: { ru: 'Проверить другие даты и маршруты', en: 'Check other dates and routes' },
        links: [
            { name: 'Aviasales', url: 'https://www.aviasales.ru/' },
            { name: 'Яндекс Путешествия', url: 'https://travel.yandex.ru/avia/' },
        ],
    },
];

function formatUpdated(value, lang) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function publishedAt(deal) {
    const timestamp = Date.parse(deal.date || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function dateValue(value) {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDealDate(value, lang, { withTime = false } = {}) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    if (/^\d{4}-\d{2}$/.test(value)) {
        return parsed.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        });
    }

    return parsed.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        day: 'numeric',
        month: 'short',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : undefined,
    });
}

function peopleInPrice(deal) {
    const explicit = Number(deal.people ?? deal.peopleCount ?? deal.persons);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    const text = String(deal.text || '').toLocaleLowerCase('ru');
    const numeric = text.match(/(?:на|за)\s*(\d{1,2})\s*(?:чел|человек|персон)/i);
    if (numeric) return Number(numeric[1]);
    if (/(?:на|за)\s+двоих|двухмест/i.test(text)) return 2;
    if (/(?:на|за)\s+троих/i.test(text)) return 3;
    if (/(?:на|за)\s+четверых/i.test(text)) return 4;
    if (/\/\s*чел|(?:на|за|с)\s+человека|per\s+person|\bpp\b/i.test(text)) return 1;

    // Published flight fares are quoted for one passenger unless the source
    // explicitly says otherwise.
    return deal.type === 'flight' ? 1 : null;
}

function formatPeople(count, lang) {
    if (lang === 'ru') return `${count} чел.`;
    return `${count} ${count === 1 ? 'person' : 'people'}`;
}

function formatPriceBasis(count, lang) {
    return `${lang === 'ru' ? 'за' : 'for'} ${formatPeople(count, lang)}`;
}

function arrivalForDeal(deal) {
    const explicit = deal.arrivalDate || deal.returnDate;
    return explicit ? { value: explicit } : null;
}

function cleanDescription(value) {
    return String(value || '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/(?:➡️)+\s*/gu, '')
        .replace(/\s+\d+\s*$/u, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function DealTypeDetails({ deal, copy, withIcon = false }) {
    const DealIcon = deal.type === 'tour' ? Ticket : Plane;
    const connectionNames = deal.connections?.map((place) => place.name).filter(Boolean) || [];
    const hasFacts = deal.oneway || deal.roundTrip || connectionNames.length > 0;

    return (
        <div className="travel-feed__type-details">
            <span className={`travel-feed__type travel-feed__type--${deal.type}`}>
                {withIcon ? <DealIcon size={14} aria-hidden="true" /> : null}
                {deal.type === 'tour' ? copy.tours : copy.flights}
            </span>
            {hasFacts ? (
                <div className="travel-feed__deal-facts">
                    {deal.oneway && !deal.roundTrip ? <span>{copy.oneWay}</span> : null}
                    {deal.roundTrip ? <span>↔ {copy.roundTrip}</span> : null}
                    {connectionNames.length > 0 ? (
                        <span>{copy.connection}: {connectionNames.join(', ')}</span>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function ExpandableDescription({ value, fallback, copy, variant = 'table' }) {
    const [expanded, setExpanded] = useState(false);
    const [canExpand, setCanExpand] = useState(false);
    const content = value || fallback;
    const descriptionId = useId();
    const textRef = useRef(null);

    useEffect(() => {
        if (expanded) return undefined;
        const text = textRef.current;
        if (!text) return undefined;
        const measure = () => setCanExpand(text.scrollHeight > text.clientHeight + 1);
        measure();
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
        observer?.observe(text);
        window.addEventListener('resize', measure);
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [content, expanded, variant]);

    return (
        <div className={`travel-feed__expandable-description travel-feed__expandable-description--${variant} ${expanded ? 'is-expanded' : ''}`}>
            <p ref={textRef} id={descriptionId} className="travel-feed__description-text">{content}</p>
            {canExpand ? (
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={descriptionId}
                    onClick={() => setExpanded((current) => !current)}
                >
                    {expanded ? copy.collapseDescription : copy.expandDescription}
                </button>
            ) : null}
        </div>
    );
}

function optionalCompare(a, b, direction = 'asc') {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return direction === 'asc' ? a - b : b - a;
}

function sortDeals(deals, sort, lang) {
    return [...deals].sort((a, b) => {
        switch (sort) {
            case 'departure-asc':
                return optionalCompare(dateValue(a.departDate), dateValue(b.departDate), 'asc')
                    || publishedAt(b) - publishedAt(a);
            case 'departure-desc':
                return optionalCompare(dateValue(a.departDate), dateValue(b.departDate), 'desc')
                    || publishedAt(b) - publishedAt(a);
            case 'arrival-asc':
                return optionalCompare(dateValue(arrivalForDeal(a)?.value), dateValue(arrivalForDeal(b)?.value), 'asc')
                    || publishedAt(b) - publishedAt(a);
            case 'arrival-desc':
                return optionalCompare(dateValue(arrivalForDeal(a)?.value), dateValue(arrivalForDeal(b)?.value), 'desc')
                    || publishedAt(b) - publishedAt(a);
            case 'price-asc':
                return a.price - b.price || publishedAt(b) - publishedAt(a);
            case 'price-desc':
                return b.price - a.price || publishedAt(b) - publishedAt(a);
            case 'savings-asc':
                return optionalCompare(a.savings, b.savings, 'asc')
                    || optionalCompare(a.discount, b.discount, 'asc')
                    || publishedAt(b) - publishedAt(a);
            case 'savings-desc':
                return optionalCompare(a.savings, b.savings, 'desc')
                    || optionalCompare(a.discount, b.discount, 'desc')
                    || publishedAt(b) - publishedAt(a);
            case 'origin-asc':
                return (a.from?.name || '').localeCompare(b.from?.name || '', lang)
                    || (a.to?.name || '').localeCompare(b.to?.name || '', lang);
            case 'origin-desc':
                return (b.from?.name || '').localeCompare(a.from?.name || '', lang)
                    || (b.to?.name || '').localeCompare(a.to?.name || '', lang);
            case 'destination-asc':
                return (a.to?.name || '').localeCompare(b.to?.name || '', lang)
                    || (a.from?.name || '').localeCompare(b.from?.name || '', lang);
            case 'destination-desc':
                return (b.to?.name || '').localeCompare(a.to?.name || '', lang)
                    || (b.from?.name || '').localeCompare(a.from?.name || '', lang);
            case 'published-asc':
                return publishedAt(a) - publishedAt(b)
                    || a.price - b.price;
            default:
                return publishedAt(b) - publishedAt(a)
                    || (b.savings || 0) - (a.savings || 0)
                    || a.price - b.price;
        }
    });
}

function useMobileLayout() {
    const [mobile, setMobile] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
    ));

    useEffect(() => {
        const media = window.matchMedia('(max-width: 640px)');
        const update = () => setMobile(media.matches);
        update();
        media.addEventListener?.('change', update);
        return () => media.removeEventListener?.('change', update);
    }, []);

    return mobile;
}

function normalizePlaceQuery(value) {
    return String(value || '')
        .toLocaleLowerCase('ru')
        .replace(/ё/g, 'е')
        .trim();
}

function PlaceCombobox({ value, onChange, options, label, copy }) {
    const selected = options.find((option) => option.value === value);
    const [query, setQuery] = useState(selected?.label || '');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const listboxId = useId();
    const rootRef = useRef(null);

    useEffect(() => {
        setQuery(selected?.label || '');
    }, [selected?.label]);

    useEffect(() => {
        const close = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, []);

    const normalized = normalizePlaceQuery(query);
    const filtered = options
        .filter((option) => !normalized || option.searchText.includes(normalized))
        .slice(0, 18);

    const selectOption = (option) => {
        onChange(option.value);
        setQuery(option.label);
        setOpen(false);
        setActiveIndex(0);
    };

    const handleInput = (event) => {
        const next = event.target.value;
        setQuery(next);
        setOpen(true);
        setActiveIndex(0);
        if (!next.trim()) onChange('all');
    };

    const handleBlur = () => {
        window.setTimeout(() => {
            if (rootRef.current?.contains(document.activeElement)) return;
            const exact = options.find((option) => normalizePlaceQuery(option.label) === normalizePlaceQuery(query));
            if (exact) selectOption(exact);
            else setQuery(selected?.label || '');
            setOpen(false);
        }, 0);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
        } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
            event.preventDefault();
            selectOption(filtered[activeIndex]);
        } else if (event.key === 'Escape') {
            setOpen(false);
            setQuery(selected?.label || '');
        }
    };

    let previousGroup = '';
    return (
        <div className="travel-feed__place-combobox" ref={rootRef}>
            <Search size={16} aria-hidden="true" />
            <input
                type="text"
                value={query}
                placeholder={`${label}: ${copy.typeCity}`}
                aria-label={label}
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-expanded={open}
                role="combobox"
                autoComplete="off"
                onChange={handleInput}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
            <ChevronDown size={16} aria-hidden="true" />
            {open ? (
                <div id={listboxId} className="travel-feed__place-options" role="listbox">
                    {filtered.length ? filtered.map((option, index) => {
                        const showGroup = option.group !== previousGroup;
                        previousGroup = option.group;
                        return (
                            <div key={option.value}>
                                {showGroup ? (
                                    <div className="travel-feed__place-group">
                                        {option.group === 'country' ? copy.countriesGroup : copy.citiesGroup}
                                    </div>
                                ) : null}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={option.value === value}
                                    className={index === activeIndex ? 'is-active' : ''}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => selectOption(option)}
                                >
                                    <span>{option.label}</span>
                                    {option.meta ? <small>{option.meta}</small> : null}
                                </button>
                            </div>
                        );
                    }) : <div className="travel-feed__place-empty">{copy.noPlaces}</div>}
                </div>
            ) : null}
        </div>
    );
}

function DealCard({ deal, lang, copy }) {
    const arrival = arrivalForDeal(deal);
    const departureLabel = formatDealDate(deal.departDate, lang);
    const arrivalLabel = formatDealDate(arrival?.value, lang);
    const publishedLabel = formatDealDate(deal.date, lang);
    const people = peopleInPrice(deal);

    return (
        <article className="travel-feed__card">
            <div className="travel-feed__card-top">
                <DealTypeDetails deal={deal} copy={copy} withIcon />
                {deal.discount ? (
                    <span className="travel-feed__discount">−{Math.round(deal.discount * 100)}%</span>
                ) : null}
            </div>

            <h2 className="travel-feed__route">
                <span>{deal.from?.name}</span>
                <ArrowRight size={18} aria-hidden="true" />
                <span>{deal.to?.name}</span>
            </h2>

            <div className="travel-feed__price-row">
                <span className="travel-feed__price">{copy.from} {fmtPrice(deal.price, lang)}</span>
                {deal.oldPrice ? <span className="travel-feed__old-price">{fmtPrice(deal.oldPrice, lang)}</span> : null}
                {people ? <span className="travel-feed__price-basis">{formatPriceBasis(people, lang)}</span> : null}
            </div>

            <div className="travel-feed__meta">
                {departureLabel ? (
                    <span>
                        <CalendarDays size={16} aria-hidden="true" />
                        <strong>{copy.departure}:</strong> {departureLabel}
                    </span>
                ) : null}
                {arrivalLabel ? <span><strong>{copy.arrival}:</strong> {arrivalLabel}</span> : null}
                {deal.nights ? <span>{deal.nights} {copy.nights}</span> : null}
            </div>

            {publishedLabel ? (
                <span className="travel-feed__card-published" title={new Date(deal.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}>
                    {copy.offerDate}: {publishedLabel}
                </span>
            ) : null}

            {deal.text ? (
                <ExpandableDescription
                    value={cleanDescription(deal.text)}
                    fallback={`${deal.from?.name || ''} — ${deal.to?.name || ''}`}
                    copy={copy}
                    variant="card"
                />
            ) : null}

            <div className="travel-feed__actions">
                <a
                    href={deal.link}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="travel-feed__deal-link"
                >
                    {copy.open}
                    <ExternalLink size={15} aria-hidden="true" />
                </a>
                {deal.isAffiliate ? (
                    <span className="travel-feed__affiliate-note">
                        {copy.advertisement} · {deal.affiliateBrand}
                    </span>
                ) : null}
                {deal.source ? (
                    <a
                        href={`https://t.me/${deal.source}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="travel-feed__source"
                        aria-label={`${copy.source}: @${deal.source}`}
                    >
                        @{deal.source}
                    </a>
                ) : null}
            </div>
        </article>
    );
}

function DealTable({ deals, lang, copy, sort, onSort }) {
    const sortableHeader = (label, column, className = '') => {
        const asc = `${column}-asc`;
        const desc = `${column}-desc`;
        const active = sort === asc || sort === desc;
        const direction = sort === asc ? 'ascending' : sort === desc ? 'descending' : 'none';
        const next = sort === asc ? desc : asc;
        return (
            <th scope="col" className={className} aria-sort={direction}>
                <button
                    type="button"
                    className={`travel-feed__column-sort ${active ? 'is-active' : ''}`}
                    onClick={() => onSort(next)}
                >
                    <span>{label}</span>
                    <ArrowDownUp size={14} aria-hidden="true" />
                </button>
            </th>
        );
    };

    return (
        <div className="travel-feed__table-shell" tabIndex="0" aria-label={copy.tableCaption}>
            <table className="travel-feed__table">
                <caption className="travel-feed__sr-only">{copy.tableCaption}</caption>
                <thead>
                    <tr>
                        {sortableHeader(copy.origin, 'origin')}
                        {sortableHeader(copy.destination, 'destination')}
                        {sortableHeader(copy.departure, 'departure')}
                        {sortableHeader(copy.arrival, 'arrival')}
                        <th scope="col">{copy.dealType}</th>
                        <th scope="col">{copy.people}</th>
                        {sortableHeader(copy.price, 'price', 'is-numeric')}
                        {sortableHeader(copy.savings, 'savings')}
                        <th scope="col">{copy.description}</th>
                        {sortableHeader(copy.offerDate, 'published')}
                        <th scope="col" className="travel-feed__table-link-head">{copy.link}</th>
                    </tr>
                </thead>
                <tbody>
                    {deals.map((deal, index) => {
                        const people = peopleInPrice(deal);
                        const arrival = arrivalForDeal(deal);
                        const description = cleanDescription(deal.text);
                        const routeLabel = `${deal.from?.name || copy.origin} — ${deal.to?.name || copy.destination}`;

                        return (
                            <tr key={`${deal.link || `${deal.type}-${deal.source}-${deal.from?.code}-${deal.to?.code}-${deal.price}-${deal.date || ''}`}-${index}`}>
                                <td className="travel-feed__city-cell">
                                    <strong title={deal.from?.name}>{deal.from?.name || '—'}</strong>
                                    {deal.from?.code ? <small>{deal.from.code}</small> : null}
                                </td>
                                <td className="travel-feed__city-cell">
                                    <strong title={deal.to?.name}>{deal.to?.name || '—'}</strong>
                                    {deal.to?.code ? <small>{deal.to.code}</small> : null}
                                </td>
                                <td className="travel-feed__date-cell">
                                    {deal.departDate ? (
                                        <time dateTime={deal.departDate}>{formatDealDate(deal.departDate, lang)}</time>
                                    ) : <span className="travel-feed__missing" title={copy.noDate}>—</span>}
                                </td>
                                <td className="travel-feed__date-cell">
                                    {arrival ? (
                                        <time
                                            dateTime={arrival.value}
                                        >
                                            {formatDealDate(arrival.value, lang)}
                                        </time>
                                    ) : <span className="travel-feed__missing" title={copy.noDate}>—</span>}
                                </td>
                                <td className="travel-feed__type-cell">
                                    <DealTypeDetails deal={deal} copy={copy} />
                                </td>
                                <td className="travel-feed__people-cell">
                                    {people ? formatPriceBasis(people, lang) : <span className="travel-feed__missing">—</span>}
                                </td>
                                <td className="travel-feed__table-price">{fmtPrice(deal.price, lang)}</td>
                                <td className="travel-feed__saving-cell">
                                    {deal.savings ? (
                                        <>
                                            <strong>−{fmtPrice(deal.savings, lang)}</strong>
                                            {deal.discount ? <small>−{Math.round(deal.discount * 100)}%</small> : null}
                                        </>
                                    ) : <span className="travel-feed__missing">—</span>}
                                </td>
                                <td className="travel-feed__description-cell">
                                    <ExpandableDescription
                                        value={description}
                                        fallback={routeLabel}
                                        copy={copy}
                                    />
                                </td>
                                <td className="travel-feed__published-cell">
                                    {deal.date ? (
                                        <time dateTime={deal.date} title={new Date(deal.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}>
                                            {formatDealDate(deal.date, lang, { withTime: true })}
                                        </time>
                                    ) : <span className="travel-feed__missing">—</span>}
                                </td>
                                <td className="travel-feed__table-link-cell">
                                    <div className="travel-feed__table-link-stack">
                                        <a
                                            href={deal.link}
                                            target="_blank"
                                            rel="noopener noreferrer sponsored"
                                            aria-label={`${copy.open}: ${routeLabel}`}
                                        >
                                            <span>{copy.tableOpen}</span>
                                            <ExternalLink size={14} aria-hidden="true" />
                                        </a>
                                        {deal.isAffiliate ? (
                                            <small className="travel-feed__affiliate-note">
                                                {copy.advertisement} · {deal.affiliateBrand}
                                            </small>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function buildPlaceOptions(deals, side, lang) {
    const cities = new Map();
    const countries = new Map();
    deals.forEach((deal) => {
        const place = deal[side];
        if (!place?.code || place.code === 'ANY' || !place.name) return;
        const country = place.country?.[lang] || place.country?.ru || '';
        const countryKey = place.country?.ru || country;
        if (countryKey) countries.set(countryKey, {
            value: `country:${countryKey}`,
            label: country,
            selectLabel: country,
            meta: '',
            group: 'country',
            searchText: normalizePlaceQuery(`${country} ${countryKey}`),
        });
        if (place.kind !== 'country') {
            cities.set(place.code, {
                value: `city:${place.code}`,
                label: place.name,
                selectLabel: country ? `${place.name} — ${country}` : place.name,
                meta: country,
                group: 'city',
                searchText: normalizePlaceQuery(`${place.name} ${country} ${place.code}`),
            });
        }
    });
    return [
        ...[...cities.values()].sort((a, b) => a.label.localeCompare(b.label, lang)),
        ...[...countries.values()].sort((a, b) => a.label.localeCompare(b.label, lang)),
    ];
}

function selectedPlaceMatches(place, selected) {
    if (selected === 'all') return true;
    const separator = selected.indexOf(':');
    const kind = selected.slice(0, separator);
    const value = selected.slice(separator + 1);
    if (kind === 'city') return place?.code === value;
    return [place?.country?.ru, place?.country?.en].includes(value);
}

function filterPayload(selected) {
    if (selected === 'all') return { kind: 'all', value: '' };
    const separator = selected.indexOf(':');
    return { kind: selected.slice(0, separator), value: selected.slice(separator + 1) };
}

function filterValue(filter) {
    return !filter || filter.kind === 'all' ? 'all' : `${filter.kind}:${filter.value}`;
}

function TravelAlerts({ copy, lang, originOptions, destinationOptions, defaultOrigin, defaultDestination, dealType }) {
    const reviewMode = useMemo(() => new URLSearchParams(window.location.search).get('autopay-review') === '1', []);
    const [reviewAutoRenew, setReviewAutoRenew] = useState(true);
    const [reviewPeriodEnd] = useState(() => new Date(Date.now() + (30 * 24 * 60 * 60 * 1_000)).toISOString());
    const [capabilities, setCapabilities] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('memora_travel_subscription_token') || '');
    const [subscription, setSubscription] = useState(null);
    const [telegramUrl, setTelegramUrl] = useState('');
    const [form, setForm] = useState({
        origin: defaultOrigin,
        destination: defaultDestination,
        dealType,
        maxPrice: '',
        minDiscount: '',
        email: '',
        consent: false,
        privacyConsent: false,
    });
    const [busy, setBusy] = useState(false);
    const [statusChecking, setStatusChecking] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        let retryTimer;
        let controller;
        const loadCapabilities = async (attempt = 0) => {
            controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 8_000);
            try {
                const response = await fetch('/api/travel/capabilities', {
                    cache: 'no-store',
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('CAPABILITIES_UNAVAILABLE');
                const data = await response.json();
                if (!cancelled) setCapabilities(data);
            } catch {
                if (cancelled) return;
                if (attempt < 2) {
                    retryTimer = window.setTimeout(() => loadCapabilities(attempt + 1), 1_000 * (attempt + 1));
                    return;
                }
                setCapabilities({ subscriptionsAvailable: false, connectionFailed: true });
            } finally {
                window.clearTimeout(timeout);
            }
        };
        loadCapabilities();
        return () => {
            cancelled = true;
            controller?.abort();
            window.clearTimeout(retryTimer);
        };
    }, []);

    const refreshSubscription = useCallback(async ({ silent = false } = {}) => {
        if (!token) return null;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8_000);
        if (!silent) setStatusChecking(true);
        try {
            const response = await fetch('/api/travel/subscriptions/status', {
                method: 'POST',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
                signal: controller.signal,
            });
            const data = await response.json().catch(() => ({}));
            if (response.status === 404) {
                localStorage.removeItem('memora_travel_subscription_token');
                setToken('');
                setSubscription(null);
                setTelegramUrl('');
                setError(copy.sessionExpired);
                return null;
            }
            if (!response.ok) throw new Error(data.error || copy.statusRefreshFailed);
            setSubscription(data.subscription);
            if (!silent) setError('');
            return data.subscription;
        } catch (requestError) {
            if (!silent) {
                setError(requestError.name === 'AbortError'
                    ? copy.statusRefreshFailed
                    : requestError.message || copy.statusRefreshFailed);
            }
            return null;
        } finally {
            window.clearTimeout(timeout);
            if (!silent) setStatusChecking(false);
        }
    }, [copy.sessionExpired, copy.statusRefreshFailed, token]);

    useEffect(() => {
        if (!token) return undefined;
        let cancelled = false;
        let timer;
        const poll = async () => {
            const next = await refreshSubscription({ silent: true });
            if (cancelled || ['active', 'canceling', 'canceled', 'past_due'].includes(next?.status)) return;
            timer = window.setTimeout(poll, 5_000);
        };
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') refreshSubscription({ silent: true });
        };
        poll();
        window.addEventListener('focus', refreshWhenVisible);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            window.removeEventListener('focus', refreshWhenVisible);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [refreshSubscription, token]);

    useEffect(() => {
        if (!subscription?.filters || editing) return;
        setForm((current) => ({
            ...current,
            origin: filterValue(subscription.filters.origin),
            destination: filterValue(subscription.filters.destination),
            dealType: subscription.filters.dealType || 'all',
            maxPrice: subscription.filters.maxPrice || '',
            minDiscount: subscription.filters.minDiscount || '',
        }));
    }, [editing, subscription?.filters]);

    const submit = async () => {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/travel/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email,
                    consent: form.consent,
                    privacyConsent: form.privacyConsent,
                    filters: {
                        origin: filterPayload(form.origin),
                        destination: filterPayload(form.destination),
                        dealType: form.dealType,
                        maxPrice: form.maxPrice,
                        minDiscount: form.minDiscount,
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            localStorage.setItem('memora_travel_subscription_token', data.token);
            setToken(data.token);
            setSubscription(data.subscription);
            setTelegramUrl(data.telegramUrl);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось создать подписку');
        } finally {
            setBusy(false);
        }
    };

    const checkout = async () => {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/travel/subscriptions/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await response.json();
            if (!response.ok || !data.confirmationUrl) throw new Error(data.error || 'Платёж не создан');
            window.location.assign(data.confirmationUrl);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось перейти к оплате');
            setBusy(false);
        }
    };

    const cancel = async () => {
        if (!window.confirm(copy.cancelRenewalConfirm)) return;
        if (reviewMode) {
            setReviewAutoRenew(false);
            return;
        }
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/travel/subscriptions/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setSubscription(data.subscription);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось изменить подписку');
        } finally {
            setBusy(false);
        }
    };

    const saveSettings = async () => {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/travel/subscriptions/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    filters: {
                        origin: filterPayload(form.origin),
                        destination: filterPayload(form.destination),
                        dealType: form.dealType,
                        maxPrice: form.maxPrice,
                        minDiscount: form.minDiscount,
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setSubscription(data.subscription);
            setEditing(false);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось сохранить фильтры');
        } finally {
            setBusy(false);
        }
    };

    const displayedSubscription = reviewMode ? {
        status: 'active',
        autoRenew: reviewAutoRenew,
        currentPeriodEnd: reviewPeriodEnd,
    } : subscription;
    const status = displayedSubscription?.status;
    const isActive = ['active', 'canceling'].includes(status);
    const connectTelegramUrl = telegramUrl || (capabilities?.telegramUsername && token
        ? `https://t.me/${capabilities.telegramUsername}?start=radar_${token}`
        : '');
    return (
        <AnimatedSection delay={0.07}>
            <section id="personal-radar" className="travel-alerts" aria-labelledby="travel-alerts-title">
                <div className="travel-alerts__intro">
                    <span className="travel-feed__eyebrow"><Bell size={16} aria-hidden="true" />{copy.alertsEyebrow}</span>
                    <h2 id="travel-alerts-title">{copy.alertsTitle}</h2>
                    <p>{copy.alertsLead}</p>
                    <div className="travel-alerts__price">300 ₽ <span>/ 30 дней</span></div>
                    <p className="travel-alerts__note">{copy.paymentNote}</p>
                </div>

                {!reviewMode && capabilities === null ? (
                    <div className="travel-alerts__unavailable">{copy.capabilitiesLoading}</div>
                ) : !reviewMode && !capabilities.subscriptionsAvailable ? (
                    <div className="travel-alerts__unavailable">{copy.alertsUnavailable}</div>
                ) : isActive ? (
                    <div className="travel-alerts__status">
                        <CheckCircle2 size={26} aria-hidden="true" />
                        <div>
                            <strong>{copy.activeAlert}</strong>
                            <span>{copy.activeUntil}: {new Date(displayedSubscription.currentPeriodEnd).toLocaleDateString(lang)}</span>
                        </div>
                        {displayedSubscription.autoRenew ? (
                            <button type="button" disabled={busy} onClick={cancel}>{copy.cancelRenewal}</button>
                        ) : <span className="travel-alerts__canceled">{copy.cancellationScheduled}</span>}
                        {!reviewMode ? <button type="button" disabled={busy} onClick={() => setEditing(!editing)}>{copy.editAlerts}</button> : null}
                        {!reviewMode && editing ? (
                            <div className="travel-alerts__form travel-alerts__form--settings">
                                <label><span>{copy.origin}</span><select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}><option value="all">{copy.allOrigins}</option>{originOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                                <label><span>{copy.destination}</span><select value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}><option value="all">{copy.allDestinations}</option>{destinationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                                <label><span>{copy.dealType}</span><select value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}><option value="all">{copy.all}</option><option value="flight">{copy.flights}</option><option value="tour">{copy.tours}</option></select></label>
                                <label><span>{copy.maxPrice}</span><input type="number" min="0" max="2000000" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} /></label>
                                <label><span>{copy.minDiscount}</span><input type="number" min="0" max="90" value={form.minDiscount} onChange={(e) => setForm({ ...form, minDiscount: e.target.value })} /></label>
                                <button className="travel-alerts__primary" type="button" disabled={busy} onClick={saveSettings}>{copy.saveAlerts}</button>
                            </div>
                        ) : null}
                    </div>
                ) : token ? (
                    <div className="travel-alerts__steps">
                        {!subscription?.telegramConnected ? (
                            <>
                                <div className="travel-alerts__actions">
                                    {connectTelegramUrl ? (
                                        <a className="travel-alerts__primary" href={connectTelegramUrl} target="_blank" rel="noopener noreferrer">
                                            <Send size={17} aria-hidden="true" />{copy.openTelegram}
                                        </a>
                                    ) : null}
                                    <button className="travel-alerts__secondary" type="button" disabled={statusChecking} onClick={() => refreshSubscription()}>
                                        <RefreshCw size={17} aria-hidden="true" />{statusChecking ? copy.checkingTelegram : copy.checkTelegram}
                                    </button>
                                </div>
                                <p>{copy.telegramHint}</p>
                            </>
                        ) : (
                            <button className="travel-alerts__primary" type="button" disabled={busy} onClick={checkout}>
                                <CreditCard size={17} aria-hidden="true" />{copy.pay}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="travel-alerts__form">
                        <label><span>{copy.origin}</span><select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}><option value="all">{copy.allOrigins}</option>{originOptions.map((option) => <option key={option.value} value={option.value}>{option.selectLabel}</option>)}</select></label>
                        <label><span>{copy.destination}</span><select value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}><option value="all">{copy.allDestinations}</option>{destinationOptions.map((option) => <option key={option.value} value={option.value}>{option.selectLabel}</option>)}</select></label>
                        <label><span>{copy.dealType}</span><select value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}><option value="all">{copy.all}</option><option value="flight">{copy.flights}</option><option value="tour">{copy.tours}</option></select></label>
                        <label><span>{copy.maxPrice}</span><input type="number" min="0" max="2000000" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} /></label>
                        <label><span>{copy.minDiscount}</span><input type="number" min="0" max="90" value={form.minDiscount} onChange={(e) => setForm({ ...form, minDiscount: e.target.value })} /></label>
                        <label><span>{copy.email}</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                        <label className="travel-alerts__consent"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /><span>{copy.consent}</span></label>
                        <label className="travel-alerts__consent"><input type="checkbox" checked={form.privacyConsent} onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })} /><span>{copy.privacyConsent} <a href="/privacy" target="_blank" rel="noopener noreferrer">{lang === 'ru' ? 'Открыть политику' : 'Open policy'}</a></span></label>
                        <button className="travel-alerts__primary" type="button" disabled={busy || !form.consent || !form.privacyConsent || !form.email} onClick={submit}><Bell size={17} aria-hidden="true" />{copy.connect}</button>
                    </div>
                )}
                {error ? <p className="travel-alerts__error" role="alert">{error}</p> : null}
            </section>
        </AnimatedSection>
    );
}

export default function TravelRadar3Page() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const copy = COPY[lang];
    const [feed, setFeed] = useState(() => ({
        deals: bundledTravelFeed.deals || [],
        updatedAt: bundledTravelFeed.updatedAt || '',
    }));
    const [loading, setLoading] = useState(() => !(bundledTravelFeed.deals?.length > 0));
    const [type, setType] = useState('all');
    const [origin, setOrigin] = useState('all');
    const [destination, setDestination] = useState('all');
    const [view, setView] = useState('table');
    const [sort, setSort] = useState('published-desc');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [mobileDealLimit, setMobileDealLimit] = useState(12);
    const mobileLayout = useMobileLayout();

    useEffect(() => {
        let cancelled = false;
        fetchTravelFeed()
            .then((data) => {
                if (!cancelled) setFeed({ deals: data.deals || [], updatedAt: data.updatedAt || '' });
            })
            .catch(() => {
                // The bundled snapshot is already visible. A stalled mobile
                // request must never leave the offer list behind a spinner.
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const originOptions = useMemo(
        () => buildPlaceOptions(feed.deals, 'from', lang),
        [feed.deals, lang],
    );
    const destinationOptions = useMemo(
        () => buildPlaceOptions(feed.deals, 'to', lang),
        [feed.deals, lang],
    );

    const visibleDeals = useMemo(() => {
        const filtered = feed.deals
            .filter((deal) => {
                if (type !== 'all' && deal.type !== type) return false;
                if (!selectedPlaceMatches(deal.from, origin)) return false;
                if (!selectedPlaceMatches(deal.to, destination)) return false;
                return true;
            });
        return sortDeals(filtered, sort, lang);
    }, [destination, feed.deals, lang, origin, sort, type]);

    useEffect(() => {
        setMobileDealLimit(12);
    }, [destination, origin, sort, type]);

    const activeFilterCount = Number(origin !== 'all')
        + Number(destination !== 'all')
        + Number(type !== 'all');
    const effectiveView = mobileLayout ? 'cards' : view;
    const renderedDeals = mobileLayout ? visibleDeals.slice(0, mobileDealLimit) : visibleDeals;
    const remainingDeals = Math.max(visibleDeals.length - renderedDeals.length, 0);

    const resetFilters = () => {
        setOrigin('all');
        setDestination('all');
        setType('all');
    };

    const sortOptions = [
        ['published-desc', mobileLayout ? copy.sortNewestShort : copy.sortNewest],
        ['departure-asc', mobileLayout ? copy.sortDepartureShort : copy.sortDeparture],
        ['price-asc', mobileLayout ? copy.sortPriceLowShort : copy.sortPriceLow],
        ['price-desc', mobileLayout ? copy.sortPriceHighShort : copy.sortPriceHigh],
        ['savings-desc', mobileLayout ? copy.sortSavingsShort : copy.sortSavings],
        ['origin-asc', mobileLayout ? copy.sortOriginShort : copy.sortOrigin],
        ['destination-asc', mobileLayout ? copy.sortDestinationShort : copy.sortDestination],
    ];
    const headerSortLabels = {
        'published-asc': `${copy.offerDate} ↑`,
        'departure-desc': `${copy.departure} ↓`,
        'arrival-asc': `${copy.arrival} ↑`,
        'arrival-desc': `${copy.arrival} ↓`,
        'savings-asc': `${copy.savings} ↑`,
        'origin-desc': `${copy.origin} Я–А`,
        'destination-desc': `${copy.destination} Я–А`,
    };
    if (!sortOptions.some(([value]) => value === sort) && headerSortLabels[sort]) {
        sortOptions.push([sort, headerSortLabels[sort]]);
    }

    return (
        <div className="travel-feed">
            <div className="container">
                <AnimatedSection>
                    <header className="travel-feed__hero">
                        <span className="travel-feed__eyebrow"><Flame size={16} aria-hidden="true" />{copy.eyebrow}</span>
                        <div className="travel-feed__hero-main">
                            <h1>{copy.title}</h1>
                            <a className="travel-feed__alerts-cta" href="#personal-radar">
                                <Bell size={18} aria-hidden="true" />
                                {copy.alertsCta}
                            </a>
                        </div>
                        {feed.updatedAt ? (
                            <span className="travel-feed__updated">
                                <RefreshCw size={14} aria-hidden="true" />
                                {copy.updated}: {formatUpdated(feed.updatedAt, lang)}
                            </span>
                        ) : null}
                    </header>
                </AnimatedSection>

                <AnimatedSection delay={0.05}>
                    <section className="travel-feed__workspace" aria-label={copy.title} data-typography-exempt>
                        <div className="travel-feed__filters">
                            <button
                                type="button"
                                className={`travel-feed__filter-toggle ${filtersOpen ? 'is-open' : ''}`}
                                aria-expanded={filtersOpen}
                                aria-controls="travel-radar-filter-fields"
                                onClick={() => setFiltersOpen((current) => !current)}
                            >
                                <SlidersHorizontal size={18} aria-hidden="true" />
                                <span>{copy.filters}</span>
                                {activeFilterCount > 0 ? (
                                    <span className="travel-feed__filter-count">{activeFilterCount}</span>
                                ) : null}
                                <ChevronDown className="travel-feed__filter-chevron" size={18} aria-hidden="true" />
                            </button>

                            <div
                                id="travel-radar-filter-fields"
                                className={`travel-feed__filter-fields ${filtersOpen ? 'is-open' : ''}`}
                            >
                                <div className="travel-feed__city travel-feed__city--origin">
                                    <PlaceCombobox
                                        value={origin}
                                        onChange={setOrigin}
                                        options={originOptions}
                                        label={copy.origin}
                                        copy={copy}
                                    />
                                </div>

                                <div className="travel-feed__city travel-feed__city--destination">
                                    <PlaceCombobox
                                        value={destination}
                                        onChange={setDestination}
                                        options={destinationOptions}
                                        label={copy.destination}
                                        copy={copy}
                                    />
                                </div>

                                <div className="travel-feed__tabs" role="group" aria-label={copy.dealType}>
                                    {[
                                        ['all', copy.all],
                                        ['flight', copy.flights],
                                        ['tour', copy.tours],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={type === value ? 'is-active' : ''}
                                            onClick={() => setType(value)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <label className="travel-feed__sort">
                                    <span>{copy.sortLabel}</span>
                                    <select value={sort} onChange={(event) => setSort(event.target.value)}>
                                        {sortOptions.map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </label>

                                <div className="travel-feed__view-toggle" role="group" aria-label={copy.viewLabel}>
                                    <button
                                        type="button"
                                        className={view === 'table' ? 'is-active' : ''}
                                        aria-pressed={view === 'table'}
                                        onClick={() => setView('table')}
                                    >
                                        <TableProperties size={15} aria-hidden="true" />
                                        {copy.tableView}
                                    </button>
                                    <button
                                        type="button"
                                        className={view === 'cards' ? 'is-active' : ''}
                                        aria-pressed={view === 'cards'}
                                        onClick={() => setView('cards')}
                                    >
                                        <LayoutGrid size={15} aria-hidden="true" />
                                        {copy.cardView}
                                    </button>
                                </div>

                                {activeFilterCount > 0 ? (
                                    <button type="button" className="travel-feed__filter-reset" onClick={resetFilters}>
                                        <X size={18} aria-hidden="true" />
                                        {copy.resetFilters}
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="travel-feed__toolbar">
                            <div className="travel-feed__count">
                                {loading ? '…' : `${visibleDeals.length} ${mobileLayout ? copy.foundShort : copy.found}`}
                            </div>
                        </div>

                        {loading ? (
                            <div className="travel-feed__empty"><RefreshCw className="travel-feed__spinner" aria-hidden="true" /></div>
                        ) : visibleDeals.length > 0 ? (
                            effectiveView === 'table' ? (
                                <DealTable deals={visibleDeals} lang={lang} copy={copy} sort={sort} onSort={setSort} />
                            ) : (
                                <>
                                    <div className="travel-feed__grid">
                                        {renderedDeals.map((deal, index) => (
                                            <DealCard
                                                key={`${deal.link || `${deal.type}-${deal.source}-${deal.from?.code}-${deal.to?.code}-${deal.date || ''}`}-${index}`}
                                                deal={deal}
                                                lang={lang}
                                                copy={copy}
                                            />
                                        ))}
                                    </div>
                                    {mobileLayout && remainingDeals > 0 ? (
                                        <button
                                            type="button"
                                            className="travel-feed__load-more"
                                            onClick={() => setMobileDealLimit((current) => current + 12)}
                                        >
                                            {copy.showMore} · {Math.min(remainingDeals, 12)}
                                        </button>
                                    ) : null}
                                </>
                            )
                        ) : (
                            <div className="travel-feed__empty">{copy.noDeals}</div>
                        )}

                        <p className="travel-feed__fresh-note">{copy.freshNote}</p>
                    </section>
                </AnimatedSection>

                <TravelAlerts
                    copy={copy}
                    lang={lang}
                    originOptions={originOptions}
                    destinationOptions={destinationOptions}
                    defaultOrigin={origin}
                    defaultDestination={destination}
                    dealType={type}
                />

                <AnimatedSection delay={0.08}>
                    <section className="travel-feed__useful">
                        <span className="travel-feed__eyebrow">{copy.usefulEyebrow}</span>
                        <h2>{copy.usefulTitle}</h2>
                        <p className="travel-feed__useful-lead">{copy.usefulLead}</p>

                        <div className="travel-feed__services">
                            {SERVICES.map((service) => {
                                const ServiceIcon = service.icon;
                                return (
                                    <article key={service.title.en} className="travel-feed__service">
                                        <ServiceIcon size={22} aria-hidden="true" />
                                        <div>
                                            <h3>{service.title[lang]}</h3>
                                            <p>{service.description[lang]}</p>
                                        </div>
                                        <div className="travel-feed__service-links">
                                            {service.links.map((link) => (
                                                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer sponsored">
                                                    {link.name}<ExternalLink size={13} aria-hidden="true" />
                                                </a>
                                            ))}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                        <p className="travel-feed__disclosure">{copy.disclosure}</p>
                    </section>
                </AnimatedSection>
            </div>
        </div>
    );
}
