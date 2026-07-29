import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    BedDouble,
    CalendarDays,
    ExternalLink,
    Flame,
    LayoutGrid,
    MapPin,
    Plane,
    RefreshCw,
    Search,
    Sparkles,
    TableProperties,
    Ticket,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { fmtPrice } from './helpers';
import './TravelRadar3.css';

const COPY = {
    ru: {
        eyebrow: 'Живые находки из Telegram',
        title: 'Горящие туры и билеты — в одной ленте',
        lead: 'Собираем предложения из тревел-каналов, приводим их к одному виду и оставляем ссылку на первоисточник. Никаких сложных графиков: открыл, отфильтровал, перешёл к предложению.',
        updated: 'Лента обновлена',
        all: 'Все',
        flights: 'Билеты',
        tours: 'Туры',
        allCities: 'Все города',
        search: 'Страна, город или канал',
        from: 'из',
        oneWay: 'в одну сторону',
        nights: 'ночей',
        open: 'Открыть предложение',
        source: 'Источник',
        noDeals: 'По этим фильтрам предложений пока нет.',
        found: 'предложений',
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
        tableCaption: 'Актуальные предложения Радара путешествий',
        origin: 'Откуда',
        destination: 'Куда',
        departure: 'Вылет',
        arrival: 'Прилёт',
        dealType: 'Тип',
        people: 'В цене',
        price: 'Цена',
        savings: 'Экономия',
        description: 'Описание',
        offerDate: 'Добавлено',
        link: 'Ссылка',
        noDate: 'Не указано',
        usefulEyebrow: 'Следующий шаг',
        usefulTitle: 'Полезные сервисы для поездки',
        usefulLead: 'Когда предложение найдено, здесь можно подобрать жильё, экскурсии и проверить другие варианты.',
        disclosure: 'Часть ссылок партнёрские: сервис может выплатить нам комиссию, но цена для вас не меняется.',
        freshNote: 'Цены быстро меняются. Проверяйте итоговую стоимость и условия на странице продавца.',
    },
    en: {
        eyebrow: 'Live finds from Telegram',
        title: 'Hot tours and flight deals in one feed',
        lead: 'We collect offers from travel channels, normalize them and keep a clear path to the source. No complicated charts: open, filter and continue to the deal.',
        updated: 'Feed updated',
        all: 'All',
        flights: 'Flights',
        tours: 'Tours',
        allCities: 'All cities',
        search: 'Country, city or channel',
        from: 'from',
        oneWay: 'one way',
        nights: 'nights',
        open: 'Open deal',
        source: 'Source',
        noDeals: 'No deals match these filters yet.',
        found: 'deals',
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
        tableCaption: 'Current Travel Radar deals',
        origin: 'From',
        destination: 'To',
        departure: 'Departure',
        arrival: 'Arrival',
        dealType: 'Type',
        people: 'Included',
        price: 'Price',
        savings: 'Saving',
        description: 'Description',
        offerDate: 'Added',
        link: 'Link',
        noDate: 'Not specified',
        usefulEyebrow: 'Next step',
        usefulTitle: 'Useful services for your trip',
        usefulLead: 'Once you find a deal, use these links to choose a stay, activities and compare alternatives.',
        disclosure: 'Some links are affiliate links. We may receive a commission, while your price stays the same.',
        freshNote: 'Prices change quickly. Confirm the final price and terms on the seller page.',
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
    if (/\/\s*чел|на\s+человека|за\s+человека|per\s+person|\bpp\b/i.test(text)) return 1;

    // Published flight fares are quoted for one passenger unless the source
    // explicitly says otherwise.
    return deal.type === 'flight' ? 1 : null;
}

function formatPeople(count, lang) {
    if (lang === 'ru') return `${count} чел.`;
    return `${count} ${count === 1 ? 'person' : 'people'}`;
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
            case 'price-asc':
                return a.price - b.price || publishedAt(b) - publishedAt(a);
            case 'price-desc':
                return b.price - a.price || publishedAt(b) - publishedAt(a);
            case 'savings-desc':
                return optionalCompare(a.savings, b.savings, 'desc')
                    || optionalCompare(a.discount, b.discount, 'desc')
                    || publishedAt(b) - publishedAt(a);
            case 'origin-asc':
                return (a.from?.name || '').localeCompare(b.from?.name || '', lang)
                    || (a.to?.name || '').localeCompare(b.to?.name || '', lang);
            case 'destination-asc':
                return (a.to?.name || '').localeCompare(b.to?.name || '', lang)
                    || (a.from?.name || '').localeCompare(b.from?.name || '', lang);
            default:
                return publishedAt(b) - publishedAt(a)
                    || (b.savings || 0) - (a.savings || 0)
                    || a.price - b.price;
        }
    });
}

function DealCard({ deal, lang, copy }) {
    const DealIcon = deal.type === 'tour' ? Ticket : Plane;
    // The calendar in this live feed communicates freshness, so show the
    // publication timestamp used by the ordering. Fall back to departure only
    // for legacy items that do not have a source publication date.
    const date = deal.date || deal.departDate;
    const dateLabel = date
        ? new Date(date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric',
            month: 'short',
        })
        : '';

    return (
        <article className="travel-feed__card">
            <div className="travel-feed__card-top">
                <span className={`travel-feed__type travel-feed__type--${deal.type}`}>
                    <DealIcon size={14} aria-hidden="true" />
                    {deal.type === 'tour' ? copy.tours : copy.flights}
                </span>
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
            </div>

            <div className="travel-feed__meta">
                {dateLabel ? <span><CalendarDays size={14} aria-hidden="true" />{dateLabel}</span> : null}
                {deal.nights ? <span>{deal.nights} {copy.nights}</span> : null}
                {deal.oneway ? <span>{copy.oneWay}</span> : null}
            </div>

            {deal.text ? <p className="travel-feed__excerpt">{deal.text}</p> : null}

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

function DealTable({ deals, lang, copy }) {
    return (
        <div className="travel-feed__table-shell" tabIndex="0" aria-label={copy.tableCaption}>
            <table className="travel-feed__table">
                <caption className="travel-feed__sr-only">{copy.tableCaption}</caption>
                <thead>
                    <tr>
                        <th scope="col">{copy.origin}</th>
                        <th scope="col">{copy.destination}</th>
                        <th scope="col">{copy.departure}</th>
                        <th scope="col">{copy.arrival}</th>
                        <th scope="col">{copy.dealType}</th>
                        <th scope="col">{copy.people}</th>
                        <th scope="col" className="is-numeric">{copy.price}</th>
                        <th scope="col">{copy.savings}</th>
                        <th scope="col">{copy.description}</th>
                        <th scope="col">{copy.offerDate}</th>
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
                            <tr key={`${deal.type}-${deal.source}-${deal.from?.code}-${deal.to?.code}-${deal.price}-${index}`}>
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
                                <td>
                                    <span className={`travel-feed__type travel-feed__type--${deal.type}`}>
                                        {deal.type === 'tour' ? copy.tours : copy.flights}
                                    </span>
                                </td>
                                <td className="travel-feed__people-cell">
                                    {people ? formatPeople(people, lang) : <span className="travel-feed__missing">—</span>}
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
                                    <span title={description}>{description || routeLabel}</span>
                                </td>
                                <td className="travel-feed__published-cell">
                                    {deal.date ? (
                                        <time dateTime={deal.date} title={new Date(deal.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}>
                                            {formatDealDate(deal.date, lang, { withTime: true })}
                                        </time>
                                    ) : <span className="travel-feed__missing">—</span>}
                                </td>
                                <td className="travel-feed__table-link-cell">
                                    <a
                                        href={deal.link}
                                        target="_blank"
                                        rel="noopener noreferrer sponsored"
                                        aria-label={`${copy.open}: ${routeLabel}`}
                                    >
                                        <ExternalLink size={14} aria-hidden="true" />
                                    </a>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function TravelRadar3Page() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const copy = COPY[lang];
    const [feed, setFeed] = useState({ deals: [], updatedAt: '' });
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState('all');
    const [city, setCity] = useState('all');
    const [query, setQuery] = useState('');
    const [view, setView] = useState('table');
    const [sort, setSort] = useState('published-desc');

    useEffect(() => {
        let cancelled = false;
        fetch('/hot-deals.json', { cache: 'no-cache' })
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error('feed unavailable'))))
            .then((data) => {
                if (!cancelled) setFeed({ deals: data.deals || [], updatedAt: data.updatedAt || '' });
            })
            .catch(() => {
                if (!cancelled) setFeed({ deals: [], updatedAt: '' });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const cities = useMemo(() => {
        const result = new Map();
        feed.deals.forEach((deal) => {
            if (deal.from?.code && deal.from?.name) result.set(deal.from.code, deal.from.name);
        });
        return [...result.entries()].sort((a, b) => a[1].localeCompare(b[1], lang));
    }, [feed.deals, lang]);

    const visibleDeals = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase(lang);
        const filtered = feed.deals
            .filter((deal) => {
                if (type !== 'all' && deal.type !== type) return false;
                if (city !== 'all' && deal.from?.code !== city) return false;
                if (!normalizedQuery) return true;
                return [deal.from?.name, deal.to?.name, deal.source, deal.text]
                    .filter(Boolean)
                    .some((value) => value.toLocaleLowerCase(lang).includes(normalizedQuery));
            });
        return sortDeals(filtered, sort, lang);
    }, [city, feed.deals, lang, query, sort, type]);

    const sortOptions = [
        ['published-desc', copy.sortNewest],
        ['departure-asc', copy.sortDeparture],
        ['price-asc', copy.sortPriceLow],
        ['price-desc', copy.sortPriceHigh],
        ['savings-desc', copy.sortSavings],
        ['origin-asc', copy.sortOrigin],
        ['destination-asc', copy.sortDestination],
    ];

    return (
        <main className="travel-feed">
            <div className="container">
                <AnimatedSection>
                    <header className="travel-feed__hero">
                        <span className="travel-feed__eyebrow"><Flame size={16} aria-hidden="true" />{copy.eyebrow}</span>
                        <h1>{copy.title}</h1>
                        <p>{copy.lead}</p>
                        {feed.updatedAt ? (
                            <span className="travel-feed__updated">
                                <RefreshCw size={14} aria-hidden="true" />
                                {copy.updated}: {formatUpdated(feed.updatedAt, lang)}
                            </span>
                        ) : null}
                    </header>
                </AnimatedSection>

                <AnimatedSection delay={0.05}>
                    <section className="travel-feed__workspace" aria-label={copy.title}>
                        <div className="travel-feed__filters">
                            <div className="travel-feed__tabs" role="group" aria-label={copy.title}>
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

                            <label className="travel-feed__search">
                                <Search size={16} aria-hidden="true" />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={copy.search}
                                    aria-label={copy.search}
                                />
                            </label>

                            <label className="travel-feed__city">
                                <MapPin size={16} aria-hidden="true" />
                                <select value={city} onChange={(event) => setCity(event.target.value)} aria-label={copy.allCities}>
                                    <option value="all">{copy.allCities}</option>
                                    {cities.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="travel-feed__toolbar">
                            <div className="travel-feed__count">{loading ? '…' : `${visibleDeals.length} ${copy.found}`}</div>
                            <div className="travel-feed__display-controls">
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
                            </div>
                        </div>

                        {loading ? (
                            <div className="travel-feed__empty"><RefreshCw className="travel-feed__spinner" aria-hidden="true" /></div>
                        ) : visibleDeals.length > 0 ? (
                            view === 'table' ? (
                                <DealTable deals={visibleDeals} lang={lang} copy={copy} />
                            ) : (
                                <div className="travel-feed__grid">
                                    {visibleDeals.map((deal, index) => (
                                        <DealCard
                                            key={`${deal.type}-${deal.source}-${deal.from?.code}-${deal.to?.code}-${index}`}
                                            deal={deal}
                                            lang={lang}
                                            copy={copy}
                                        />
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="travel-feed__empty">{copy.noDeals}</div>
                        )}

                        <p className="travel-feed__fresh-note">{copy.freshNote}</p>
                    </section>
                </AnimatedSection>

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
        </main>
    );
}
