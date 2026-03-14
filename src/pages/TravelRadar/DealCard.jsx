import { motion } from 'framer-motion';
import { Star, Flame, Clock, MapPin } from 'lucide-react';

export default function DealCard({ deal, t, i18n }) {
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
