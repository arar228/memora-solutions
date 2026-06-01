import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { usefulServices } from '../../data/mockData';
import { deriveMeta } from './parseTourMeta';
import TourRow from './TourRow';
import ServiceAccordion from './ServiceAccordion';
import './TravelRadarPage.css';

const TYPE_FILTERS = [
    { key: '', labelKey: 'travel.typeAll' },
    { key: 'air', labelKey: 'travel.typeAir' },
    { key: 'tour', labelKey: 'travel.typeTour' },
    { key: 'hotel', labelKey: 'travel.typeHotel' },
    { key: 'promo', labelKey: 'travel.typePromo' },
];

export default function TravelRadarPage() {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [feed, setFeed] = useState({ items: [], sources: [], updatedAt: null });
    const [activeChannel, setActiveChannel] = useState('');
    const [activeType, setActiveType] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch('/tours.json', { cache: 'no-cache' })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('no feed'))))
            .then((data) => { if (!cancelled) setFeed(data); })
            .catch(() => { if (!cancelled) setFeed({ items: [], sources: [], updatedAt: null }); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // Best-effort structured fields per post, derived once from the raw text.
    const metaById = useMemo(() => {
        const map = {};
        for (const it of feed.items) map[it.id] = deriveMeta(it);
        return map;
    }, [feed]);

    const channels = useMemo(() => {
        const present = new Set(feed.items.map((i) => i.channel));
        return (feed.sources || []).filter((c) => present.has(c));
    }, [feed]);

    // Live filtering by type AND source. Items arrive already sorted newest-first.
    const visible = useMemo(
        () => feed.items.filter((it) => {
            if (activeChannel && it.channel !== activeChannel) return false;
            if (activeType && metaById[it.id]?.type !== activeType) return false;
            return true;
        }),
        [feed, metaById, activeChannel, activeType]
    );

    const updatedLabel = useMemo(() => {
        if (!feed.updatedAt) return '';
        const d = new Date(feed.updatedAt);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        });
    }, [feed.updatedAt, i18n.language]);

    const sourceCount = (feed.sources || []).length;

    return (
        <div className="travel-page">
            <div className="container">
                <AnimatedSection>
                    <div className="travel-page__header">
                        <h1>{t('travel.pageTitle')}</h1>
                        <p className="travel-page__meta">
                            {updatedLabel && (
                                <span className="travel-page__updated">
                                    <RefreshCw size={13} aria-hidden="true" /> {t('travel.updatedAt')}: {updatedLabel}
                                </span>
                            )}
                            {sourceCount > 0 && (
                                <span className="travel-page__count">
                                    {' · '}{t('travel.sourcesCount', { n: sourceCount })}
                                </span>
                            )}
                        </p>
                    </div>
                </AnimatedSection>

                <AnimatedSection delay={0.05}>
                    {/* Type filter — live, active highlighted */}
                    <div className="feed-chips feed-chips--types">
                        {TYPE_FILTERS.map((f) => (
                            <button
                                key={f.key || 'all'}
                                className={`feed-chip ${activeType === f.key ? 'feed-chip--active' : ''}`}
                                onClick={() => setActiveType(f.key)}
                            >
                                {t(f.labelKey)}
                            </button>
                        ))}
                    </div>

                    {/* Source filter */}
                    {channels.length > 0 && (
                        <div className="feed-chips feed-chips--sources">
                            <button
                                className={`feed-chip feed-chip--source ${activeChannel === '' ? 'feed-chip--active' : ''}`}
                                onClick={() => setActiveChannel('')}
                            >
                                {t('travel.allSources')}
                            </button>
                            {channels.map((c) => (
                                <button
                                    key={c}
                                    className={`feed-chip feed-chip--source ${activeChannel === c ? 'feed-chip--active' : ''}`}
                                    onClick={() => setActiveChannel(c)}
                                >
                                    @{c}
                                </button>
                            ))}
                        </div>
                    )}
                </AnimatedSection>

                {loading ? (
                    <div className="tour-feed tour-feed--loading">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="tour-row tour-row--skeleton">
                                <span className="skeleton" style={{ width: 26, height: 26, borderRadius: 8 }} />
                                <span className="skeleton" style={{ height: 14, width: '45%' }} />
                                <span className="skeleton" style={{ height: 14, width: 70 }} />
                            </div>
                        ))}
                    </div>
                ) : visible.length > 0 ? (
                    <div className="tour-feed">
                        <div className="tour-feed__head" aria-hidden="true">
                            <span>{t('travel.colType')}</span>
                            <span>{t('travel.colRoute')}</span>
                            <span className="tour-feed__head-price">{t('travel.colPrice')}</span>
                            <span>{t('travel.colWhen')}</span>
                            <span>{t('travel.colSource')}</span>
                            <span />
                        </div>
                        {visible.map((tour) => (
                            <TourRow key={tour.id} tour={tour} meta={metaById[tour.id]} t={t} i18n={i18n} />
                        ))}
                        <p className="tour-feed__hint">{t('travel.chevronHint')}</p>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>{t('travel.noFeed')}</p>
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
