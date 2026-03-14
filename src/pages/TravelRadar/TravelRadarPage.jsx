import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { usefulServices } from '../../data/mockData';
import DealCard from './DealCard';
import ServiceAccordion from './ServiceAccordion';
import './TravelRadarPage.css';

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
            setTours([]);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    };

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
                                tours.map((deal) => (
                                    <DealCard key={deal.id} deal={deal} t={t} i18n={i18n} />
                                ))
                            ) : (
                                <div className="empty-state">
                                    <p>{t('travel.noResults')}</p>
                                </div>
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
                        {usefulServices.map((cat) => (
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
