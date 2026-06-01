import { useState } from 'react';
import { Plane, Luggage, BedDouble, Percent, ChevronDown, ExternalLink, Send } from 'lucide-react';
import { domainOf } from './parseTourMeta';

const TYPE_ICON = { air: Plane, tour: Luggage, hotel: BedDouble, promo: Percent };

function formatTime(iso, lang) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function TourRow({ tour, meta, t, i18n }) {
    const [open, setOpen] = useState(false);
    const Icon = TYPE_ICON[meta.type] || Plane;

    return (
        <div className={`tour-row ${open ? 'tour-row--open' : ''}`}>
            <button
                type="button"
                className="tour-row__head"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <span className={`tour-row__type tour-row__type--${meta.type}`}>
                    <Icon size={18} aria-hidden="true" />
                </span>

                <span className="tour-row__main">
                    <span className="tour-row__route">{meta.primary || tour.text.slice(0, 60)}</span>
                    {meta.details && <span className="tour-row__details">{meta.details}</span>}
                </span>

                <span className="tour-row__price">{meta.price}</span>
                <span className="tour-row__when">{meta.when}</span>

                <span className="tour-row__source">
                    <span className="tour-row__channel">@{tour.channel}</span>
                    <span className="tour-row__time">{formatTime(tour.date, i18n.language)}</span>
                </span>

                <ChevronDown size={18} className="tour-row__chevron" aria-hidden="true" />
            </button>

            {open && (
                <div className="tour-row__panel">
                    <div className="tour-row__panel-label">{t('travel.fullPost')}</div>
                    <p className="tour-row__fulltext">{tour.text}</p>

                    <div className="tour-row__actions">
                        {meta.links.map((url) => (
                            <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="tour-row__offer"
                            >
                                <ExternalLink size={15} aria-hidden="true" />
                                {t('travel.openOffer')} ({domainOf(url)})
                            </a>
                        ))}
                        <a
                            href={tour.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tour-row__tg"
                        >
                            <Send size={14} aria-hidden="true" />
                            {t('travel.originalInTelegram')}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
