import { useTranslation } from 'react-i18next';
import { Send, CheckCircle2 } from 'lucide-react';
import AnimatedSection from './AnimatedSection';
import './ProductPage.css';

const FEATURES = ['f1', 'f2', 'f3', 'f4', 'f5'];
const STEPS = ['step1', 'step2', 'step3', 'step4'];

export default function ProductPage({
    productKey,
    pageVariant,
    iconVariant,
    iconImg,
    iconAlt,
    botUrl,
    HeaderIcon,
}) {
    const { t } = useTranslation();
    const k = (path) => `products.${productKey}.${path}`;

    return (
        <div className={`product-page product-page--${pageVariant}`}>
            <div className="container">
                <AnimatedSection>
                    <div className="product-page__header">
                        <div className="product-page__badge product-page__badge--active">
                            {t('statusActive')}
                        </div>
                        <div className={`product-page__icon product-page__icon--${iconVariant}`}>
                            <img src={iconImg} alt={iconAlt} className="product-page__icon-img" />
                        </div>
                        <h1>{t(k('title'))}</h1>
                        <p className="product-page__desc">{t(k('desc'))}</p>
                        <a
                            href={botUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary product-page__cta"
                        >
                            <Send size={18} aria-hidden="true" /> {t('openBot')} {t(k('bot'))}
                        </a>
                    </div>
                </AnimatedSection>

                <div className="product-bento">
                    <AnimatedSection delay={0.05} className="bento-card bento-card--about">
                        <h2>
                            <HeaderIcon size={24} aria-hidden="true" /> {t(k('about.title'))}
                        </h2>
                        <p className="about-desc">{t(k('about.desc'))}</p>
                    </AnimatedSection>

                    <AnimatedSection delay={0.15} className="bento-card bento-card--features">
                        <h2>
                            <CheckCircle2 size={24} aria-hidden="true" /> {t(k('features.title'))}
                        </h2>
                        <ul className="product-features">
                            {FEATURES.map((f, i) => (
                                <li
                                    key={f}
                                    className="product-features__item"
                                    style={{ '--feature-delay': `${0.2 + i * 0.1}s` }}
                                >
                                    <div className="feature-icon-wrapper">
                                        <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                                    </div>
                                    <span>{t(k(`features.${f}`))}</span>
                                </li>
                            ))}
                        </ul>
                    </AnimatedSection>

                    <AnimatedSection delay={0.2} className="bento-card bento-card--howto">
                        <h2>{t(k('howTo.title'))}</h2>
                        <ol className="product-steps">
                            {STEPS.map((s, i) => (
                                <li key={s}>
                                    <div className="step-number">{i + 1}</div>
                                    <div className="step-content">
                                        {t(k(`howTo.${s}`))}
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
