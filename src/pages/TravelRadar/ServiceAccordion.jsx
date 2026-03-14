import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export default function ServiceAccordion({ service, t, i18n }) {
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
