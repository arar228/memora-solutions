import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    BedDouble,
    CalendarDays,
    ExternalLink,
    Flame,
    MapPin,
    Plane,
    RefreshCw,
    Search,
    Sparkles,
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

export default function TravelRadar3Page() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const copy = COPY[lang];
    const [feed, setFeed] = useState({ deals: [], updatedAt: '' });
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState('all');
    const [city, setCity] = useState('all');
    const [query, setQuery] = useState('');

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
        return feed.deals
            .filter((deal) => {
                if (type !== 'all' && deal.type !== type) return false;
                if (city !== 'all' && deal.from?.code !== city) return false;
                if (!normalizedQuery) return true;
                return [deal.from?.name, deal.to?.name, deal.source, deal.text]
                    .filter(Boolean)
                    .some((value) => value.toLocaleLowerCase(lang).includes(normalizedQuery));
            })
            .sort((a, b) => publishedAt(b) - publishedAt(a));
    }, [city, feed.deals, lang, query, type]);

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

                        <div className="travel-feed__count">{loading ? '…' : `${visibleDeals.length} ${copy.found}`}</div>

                        {loading ? (
                            <div className="travel-feed__empty"><RefreshCw className="travel-feed__spinner" aria-hidden="true" /></div>
                        ) : visibleDeals.length > 0 ? (
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
