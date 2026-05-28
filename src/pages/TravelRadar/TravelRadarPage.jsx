import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { usefulServices } from '../../data/mockData';
import TourCard from './TourCard';
import ServiceAccordion from './ServiceAccordion';
import './TravelRadarPage.css';

export default function TravelRadarPage() {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [feed, setFeed] = useState({ items: [], sources: [], updatedAt: null });
    const [activeChannel, setActiveChannel] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch('/tours.json', { cache: 'no-cache' })
            .then(res => (res.ok ? res.json() : Promise.reject(new Error('no feed'))))
            .then(data => { if (!cancelled) setFeed(data); })
            .catch(() => { if (!cancelled) setFeed({ items: [], sources: [], updatedAt: null }); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const channels = useMemo(() => {
        const present = new Set(feed.items.map(i => i.channel));
        return (feed.sources || []).filter(c => present.has(c));
    }, [feed]);

    const visible = useMemo(() => (
        activeChannel ? feed.items.filter(i => i.channel === activeChannel) : feed.items
    ), [feed, activeChannel]);

    const updatedLabel = useMemo(() => {
        if (!feed.updatedAt) return '';
        const d = new Date(feed.updatedAt);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    }, [feed.updatedAt, i18n.language]);

    return (
        <div className="travel-page">
            <div className="container">
                <AnimatedSection>
                    <div className="travel-page__header">
                        <h1>{t('travel.pageTitle')}</h1>
                        <p className="travel-page__subtitle">{t('travel.feedSubtitle')}</p>
                    </div>
                </AnimatedSection>

                <AnimatedSection delay={0.1}>
                    <div className="feed-bar">
                        <div className="feed-chips">
                            <button
                                className={`feed-chip ${activeChannel === '' ? 'feed-chip--active' : ''}`}
                                onClick={() => setActiveChannel('')}
                            >
                                {t('travel.allSources')}
                            </button>
                            {channels.map(c => (
                                <button
                                    key={c}
                                    className={`feed-chip ${activeChannel === c ? 'feed-chip--active' : ''}`}
                                    onClick={() => setActiveChannel(c)}
                                >
                                    @{c}
                                </button>
                            ))}
                        </div>
                        {updatedLabel && (
                            <span className="feed-updated">
                                <RefreshCw size={13} aria-hidden="true" /> {t('travel.updatedAt')}: {updatedLabel}
                            </span>
                        )}
                    </div>
                </AnimatedSection>

                {loading && (
                    <div className="loading-state">
                        <div className="loading-state__text">{t('travel.loading')}</div>
                        <div className="feed-grid">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton-card">
                                    <div className="skeleton" style={{ height: 150, borderRadius: '16px 16px 0 0' }} />
                                    <div style={{ padding: 18 }}>
                                        <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 12 }} />
                                        <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
                                        <div className="skeleton" style={{ height: 14, width: '70%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!loading && (
                    <div className="feed-grid">
                        <AnimatePresence>
                            {visible.length > 0 ? (
                                visible.map(tour => (
                                    <TourCard key={tour.id} tour={tour} t={t} i18n={i18n} />
                                ))
                            ) : (
                                <div className="empty-state">
                                    <p>{t('travel.noFeed')}</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

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
