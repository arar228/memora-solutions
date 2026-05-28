import { motion } from 'framer-motion';
import { ExternalLink, Send } from 'lucide-react';

function formatDate(iso, lang) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function TourCard({ tour, t, i18n }) {
    return (
        <motion.a
            href={tour.link}
            target="_blank"
            rel="noopener noreferrer"
            className="tour-card card"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            {tour.photo && (
                <div className="tour-card__image">
                    <img src={tour.photo} alt="" loading="lazy" decoding="async" />
                </div>
            )}
            <div className="tour-card__body">
                <div className="tour-card__source">
                    <Send size={13} aria-hidden="true" />
                    <span className="tour-card__channel">@{tour.channel}</span>
                    {tour.date && <span className="tour-card__date">{formatDate(tour.date, i18n.language)}</span>}
                </div>
                <p className="tour-card__text">{tour.text}</p>
                <span className="tour-card__link">
                    {t('travel.openInTelegram')} <ExternalLink size={13} aria-hidden="true" />
                </span>
            </div>
        </motion.a>
    );
}
