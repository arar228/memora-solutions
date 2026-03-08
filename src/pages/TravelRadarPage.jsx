import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Star, Flame, Clock, ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import { usefulServices } from '../data/mockData';
import './TravelRadarPage.css';

function DealCard({ deal, t, i18n }) {
    const discount = deal.discount;
    const isUltraHot = discount > 50;

    return (
        <motion.div
            className="deal-card card"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <div className="deal-card__image">
                <img src={deal.image} alt={deal.country} loading="lazy" />
                {isUltraHot && <span className="badge-ultra-hot"><Flame size={12} /> {t('travel.ultraHot')}</span>}
                <span className="deal-card__discount">-{discount}%</span>
            </div>
            <div className="deal-card__body">
                <div className="deal-card__header">
                    <span className="deal-card__flag">{deal.flag}</span>
                    <span className="deal-card__country">{deal.country}</span>
                    <span className="deal-card__stars">
                        {Array.from({ length: deal.stars }).map((_, i) => <Star key={i} size={12} fill="var(--color-gold)" color="var(--color-gold)" />)}
                    </span>
                </div>
                <h3 className="deal-card__resort">{deal.resort}</h3>
                <div className="deal-card__details">
                    <span><Clock size={14} /> {deal.nights} {t('travel.nightsLabel')}</span>
                    <span><MapPin size={14} /> {t(`travel.mealsOptions.${deal.meals}`)}</span>
                </div>
                <div className="deal-card__footer">
                    <div className="deal-card__pricing">
                        {deal.oldPrice && <span className="deal-card__old-price">{deal.oldPrice?.toLocaleString()} ₽</span>}
                        <span className="deal-card__price">{deal.price?.toLocaleString()} ₽</span>
                        <span className="deal-card__per-person">{t('travel.perPerson')}</span>
                    </div>
                    <div className="deal-card__meta">
                        <span className="deal-card__departure">{t('travel.departureDate')}: {new Date(deal.departureDate).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}</span>
                        {deal.urgent && <span className="deal-card__urgent"><Flame size={12} /> {t('travel.lastPlaces')}</span>}
                    </div>
                </div>
                <div className="deal-card__operator">{t('travel.operator')}: {deal.operator}</div>
            </div>
        </motion.div>
    );
}

function ServiceAccordion({ service, t, i18n }) {
    const [open, setOpen] = useState(false);
    const lang = i18n.language;

    return (
        <div className="service-card card">
            <div className="service-card__header">
                <div>
                    <h4 className="service-card__name">{service.name}</h4>
                    <p className="service-card__desc">{service.desc[lang] || service.desc.en}</p>
                </div>
                <a href={service.url} target="_blank" rel="noopener noreferrer" className="service-card__link">
                    <ExternalLink size={16} />
                </a>
            </div>
            <button className="service-card__toggle" onClick={() => setOpen(!open)}>
                {t('travel.howToUse')} {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="service-card__steps"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ol>
                            {(service.steps[lang] || service.steps.en).map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                        </ol>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function TravelRadarPage() {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(true);
    const [filters, setFilters] = useState({
        destination: '',
        minStars: 0,
        maxBudget: 200000,
        sortBy: 'discount',
    });

    const destinations = ['thailand', 'vietnam', 'turkey', 'china', 'bali'];

    const [tours, setTours] = useState([]);

    const fetchTours = async () => {
        setLoading(true);
        setSearched(false);
        try {
            const queryParams = new URLSearchParams({
                destination: filters.destination,
                minStars: filters.minStars.toString(),
                maxBudget: filters.maxBudget.toString(),
                sortBy: filters.sortBy,
            }).toString();

            const res = await fetch(`/api/tours?${queryParams}`);
            if (!res.ok) throw new Error('API request failed');

            const data = await res.json();
            setTours(data);
        } catch (error) {
            console.error('Failed to fetch tours:', error);
            setTours([]); // fallback on error
        } finally {
            setLoading(false);
            setSearched(true);
        }
    };

    // Run search on mount
    useEffect(() => {
        fetchTours();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = () => {
        fetchTours();
    };

    return (
        <div className="travel-page">
            <div className="container">
                {/* Page Header */}
                <AnimatedSection>
                    <div className="travel-page__header">
                        <h1>{t('travel.pageTitle')}</h1>
                        <p className="travel-page__subtitle">{t('travel.pageSubtitle')}</p>
                    </div>
                </AnimatedSection>

                {/* Search Form */}
                <AnimatedSection delay={0.1}>
                    <div className="search-form card">
                        <h3 className="search-form__title"><Search size={20} /> {t('travel.searchTitle')}</h3>
                        <div className="search-form__grid">
                            <div className="search-form__field">
                                <label>{t('travel.departureCity')}</label>
                                <select className="search-form__input">
                                    <option>Санкт-Петербург (LED)</option>
                                    <option>Москва (SVO)</option>
                                </select>
                            </div>
                            <div className="search-form__field">
                                <label>{t('travel.destination')}</label>
                                <select
                                    className="search-form__input"
                                    value={filters.destination}
                                    onChange={e => setFilters(f => ({ ...f, destination: e.target.value }))}
                                >
                                    <option value="">{i18n.language === 'ru' ? 'Все направления' : 'All destinations'}</option>
                                    {destinations.map(d => (
                                        <option key={d} value={d}>{t(`travel.destinations.${d}`)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="search-form__field">
                                <label>{t('travel.dateFrom')}</label>
                                <input type="date" className="search-form__input" defaultValue="2026-03-15" />
                            </div>
                            <div className="search-form__field">
                                <label>{t('travel.dateTo')}</label>
                                <input type="date" className="search-form__input" defaultValue="2026-04-30" />
                            </div>
                            <div className="search-form__field">
                                <label>{t('travel.stars')}</label>
                                <div className="search-form__stars">
                                    {[0, 3, 4, 5].map(s => (
                                        <button
                                            key={s}
                                            className={`star-btn ${filters.minStars === s ? 'star-btn--active' : ''}`}
                                            onClick={() => setFilters(f => ({ ...f, minStars: s }))}
                                        >
                                            {s === 0 ? (i18n.language === 'ru' ? 'Все' : 'All') : `${s}★`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="search-form__field">
                                <label>{t('travel.budget')}: {filters.maxBudget.toLocaleString()} ₽</label>
                                <input
                                    type="range"
                                    min="20000"
                                    max="200000"
                                    step="5000"
                                    value={filters.maxBudget}
                                    onChange={e => setFilters(f => ({ ...f, maxBudget: Number(e.target.value) }))}
                                    className="search-form__range"
                                />
                            </div>
                        </div>
                        <button className="btn btn-primary search-form__submit" onClick={handleSearch}>
                            <Search size={16} /> {t('travel.search')}
                        </button>
                    </div>
                </AnimatedSection>

                {/* Sort & Filter Bar */}
                <AnimatedSection delay={0.15}>
                    <div className="sort-bar">
                        <span className="sort-bar__label"><SlidersHorizontal size={16} /> {t('travel.sortBy')}:</span>
                        {['discount', 'price', 'stars', 'date'].map(s => (
                            <button
                                key={s}
                                className={`sort-btn ${filters.sortBy === s ? 'sort-btn--active' : ''}`}
                                onClick={() => setFilters(f => ({ ...f, sortBy: s }))}
                            >
                                {t(`travel.sort${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                            </button>
                        ))}
                        <span className="sort-bar__count">{t('travel.resultsCount')}: {tours.length}</span>
                    </div>
                </AnimatedSection>

                {/* Loading State */}
                {loading && (
                    <div className="loading-state">
                        <div className="loading-state__text">{t('travel.loading')}</div>
                        <div className="skeleton-grid">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton-card">
                                    <div className="skeleton" style={{ height: 160, borderRadius: '16px 16px 0 0' }} />
                                    <div style={{ padding: 20 }}>
                                        <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
                                        <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
                                        <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 16 }} />
                                        <div className="skeleton" style={{ height: 28, width: '50%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Deal Cards */}
                {searched && !loading && (
                    <div className="deals-grid">
                        <AnimatePresence>
                            {tours.length > 0 ? (
                                tours.map((deal, i) => (
                                    <DealCard key={deal.id} deal={deal} t={t} i18n={i18n} />
                                ))
                            ) : (
                                <motion.div
                                    className="empty-state"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <p>{t('travel.noResults')}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Useful Services */}
                <AnimatedSection>
                    <div className="useful-services section">
                        <div className="section-header">
                            <h2>{t('travel.usefulServices')}</h2>
                            <p className="section-subtitle">{t('travel.usefulServicesDesc')}</p>
                        </div>
                        {usefulServices.map((cat, ci) => (
                            <div key={cat.category} className="services-category">
                                <h3 className="services-category__title">
                                    <span className="services-category__badge">{cat.category}</span>
                                    {cat.categoryName[i18n.language] || cat.categoryName.en}
                                </h3>
                                <div className="services-grid">
                                    {cat.services.map((svc, si) => (
                                        <ServiceAccordion key={si} service={svc} t={t} i18n={i18n} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </AnimatedSection>
            </div>
        </div>
    );
}
