import { useTranslation } from 'react-i18next';
import { Cake, Send, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedSection from '../components/AnimatedSection';
import './ProductPage.css';

export default function BdayBotPage() {
    const { t } = useTranslation();

    const features = ['f1', 'f2', 'f3', 'f4', 'f5'];
    const steps = ['step1', 'step2', 'step3', 'step4'];

    return (
        <div className="product-page">
            <div className="container">
                <AnimatedSection>
                    <div className="product-page__header">
                        <div className="product-page__badge product-page__badge--active">
                            {t('statusActive')}
                        </div>
                        <div className="product-page__icon product-page__icon--blue">
                            <Cake size={40} />
                        </div>
                        <h1>{t('products.bdayBot.title')}</h1>
                        <p className="product-page__desc">{t('products.bdayBot.desc')}</p>
                        <a
                            href="https://t.me/MemoraBDayBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary product-page__cta"
                        >
                            <Send size={16} /> {t('openBot')} {t('products.bdayBot.bot')}
                        </a>
                    </div>
                </AnimatedSection>

                <div className="product-page__content">
                    <AnimatedSection delay={0.1}>
                        <div className="product-section card">
                            <h2>{t('products.bdayBot.features.title')}</h2>
                            <ul className="product-features">
                                {features.map((f, i) => (
                                    <motion.li
                                        key={f}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + i * 0.08 }}
                                    >
                                        <CheckCircle size={18} className="feature-icon" />
                                        {t(`products.bdayBot.features.${f}`)}
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection delay={0.2}>
                        <div className="product-section card">
                            <h2>{t('products.bdayBot.howTo.title')}</h2>
                            <ol className="product-steps">
                                {steps.map((s, i) => (
                                    <li key={s}>
                                        <span className="step-number">{i + 1}</span>
                                        {t(`products.bdayBot.howTo.${s}`)}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </AnimatedSection>
                </div>
            </div>
        </div>
    );
}
