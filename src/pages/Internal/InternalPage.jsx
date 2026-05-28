import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import DevShowcase from '../../shared/DevShowcase';
import './InternalPage.css';

export default function InternalPage() {
    const { t } = useTranslation();

    return (
        <div className="internal-page">
            <section className="internal-hero">
                <div className="internal-hero__glow" />
                <div className="container">
                    <motion.div
                        className="internal-hero__inner"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <span className="internal-hero__eyebrow">
                            <Cpu size={16} aria-hidden="true" /> {t('internal.eyebrow')}
                        </span>
                        <h1 className="internal-hero__title">
                            {t('internal.heroTitle')}{' '}
                            <span className="internal-hero__title-accent">{t('internal.heroAccent')}</span>
                        </h1>
                        <p className="internal-hero__lead">{t('internal.heroLead')}</p>
                    </motion.div>
                </div>
            </section>

            <div className="container internal-page__body">
                <AnimatedSection>
                    <section className="internal-section">
                        <h2 className="internal-section__title">{t('internal.introTitle')}</h2>
                        <p className="internal-section__text">{t('internal.introText')}</p>
                    </section>
                </AnimatedSection>

                <AnimatedSection>
                    <DevShowcase t={t} />
                </AnimatedSection>
            </div>
        </div>
    );
}
