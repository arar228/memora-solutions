import { useTranslation } from 'react-i18next';
import { Cake, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedSection from '../components/AnimatedSection';
import './ProductPage.css';

export default function BdayBotPage() {
    const { t } = useTranslation();

    const features = ['f1', 'f2', 'f3', 'f4', 'f5'];
    const steps = ['step1', 'step2', 'step3', 'step4'];

    return (
        <div className="product-page product-page--bday">
            <div className="container">
                <AnimatedSection>
                    <div className="product-page__header">
                        <div className="product-page__badge product-page__badge--active">
                            {t('statusActive')}
                        </div>
                        <div className="product-page__icon product-page__icon--blue">
                            <Cake size={48} strokeWidth={1.5} />
                        </div>
                        <h1>{t('products.bdayBot.title')}</h1>
                        <p className="product-page__desc">{t('products.bdayBot.desc')}</p>
                        <a
                            href="https://t.me/MemoraBDayBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary product-page__cta"
                        >
                            <Send size={18} /> {t('openBot')} {t('products.bdayBot.bot')}
                        </a>
                    </div>
                </AnimatedSection>

                <div className="product-bento">
                    {/* About / Value Prop Bento Card */}
                    <AnimatedSection delay={0.05} className="bento-card bento-card--about">
                        <h2>
                            <Cake size={24} /> {t('products.bdayBot.about.title')}
                        </h2>
                        <p className="about-desc">{t('products.bdayBot.about.desc')}</p>
                    </AnimatedSection>

                    {/* Features Bento Card */}
                    <AnimatedSection delay={0.15} className="bento-card bento-card--features">
                        <h2>
                            <CheckCircle2 size={24} /> {t('products.bdayBot.features.title')}
                        </h2>
                        <ul className="product-features">
                            {features.map((f, i) => (
                                <motion.li
                                    key={f}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + i * 0.1 }}
                                >
                                    <div className="feature-icon-wrapper">
                                        <CheckCircle2 size={18} strokeWidth={2} />
                                    </div>
                                    <span>{t(`products.bdayBot.features.${f}`)}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </AnimatedSection>

                    {/* How It Works Bento Card */}
                    <AnimatedSection delay={0.2} className="bento-card bento-card--howto">
                        <h2>{t('products.bdayBot.howTo.title')}</h2>
                        <ol className="product-steps">
                            {steps.map((s, i) => (
                                <li key={s}>
                                    <div className="step-number">{i + 1}</div>
                                    <div className="step-content">
                                        {t(`products.bdayBot.howTo.${s}`)}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </AnimatedSection>
                </div>
            </div>
        </div>
    );
}
