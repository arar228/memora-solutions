import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Compass, Wallet, Cake, Heart, CalendarCheck, Clock, ChevronDown } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import './HomePage.css';

export default function HomePage() {
    const { t } = useTranslation();

    const products = [
        {
            icon: <Compass size={32} />,
            title: t('products.travelRadar.title'),
            desc: t('products.travelRadar.desc'),
            status: t('statusDev'),
            statusClass: 'dev',
            bot: '@MemoraTravelRadarBot',
            to: '/travel-radar',
            color: 'gold',
            logo: '/logo.png',
        },
        {
            icon: <Wallet size={32} />,
            title: t('products.wallet.title'),
            desc: t('products.wallet.desc'),
            status: t('statusActive'),
            statusClass: 'active',
            bot: '@MemoraWallet_bot',
            to: '/wallet',
            color: 'green',
            logo: '/wallet-logo.png',
        },
        {
            icon: <Cake size={32} />,
            title: t('products.bdayBot.title'),
            desc: t('products.bdayBot.desc'),
            status: t('statusActive'),
            statusClass: 'active',
            bot: '@MemoraBDayBot',
            to: '/bday-bot',
            color: 'blue',
            logo: '/bdaybot-logo.png',
        },
    ];

    const pillars = [
        { icon: <Heart size={28} />, title: t('home.pillar1Title'), desc: t('home.pillar1Desc') },
        { icon: <CalendarCheck size={28} />, title: t('home.pillar2Title'), desc: t('home.pillar2Desc') },
        { icon: <Clock size={28} />, title: t('home.pillar3Title'), desc: t('home.pillar3Desc') },
    ];

    const { scrollY } = useScroll();

    // Smoothly blur the logo from 0px to 20px over the first 300px of scroll
    const logoBlur = useTransform(scrollY, [0, 300], ["blur(0px)", "blur(20px)"]);
    // Smoothly fade out the logo over the first 400px of scroll
    const logoOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero__content container">
                    <motion.div
                        className="hero__text"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <motion.img
                            src="/logo.png"
                            alt=""
                            className="hero__logo"
                            style={{
                                filter: logoBlur,
                                opacity: logoOpacity,
                            }}
                        />
                        <h1 className="hero__title">{t('brand')}</h1>
                        <p className="hero__tagline">{t('tagline')}</p>
                        <p className="hero__subtitle">{t('heroSubtitle')}</p>
                        <div className="hero__actions">
                            <Link to="/travel-radar" className="btn btn-primary hero__cta">
                                {t('products.travelRadar.title')}
                                <Compass size={16} />
                            </Link>
                        </div>
                    </motion.div>
                    <motion.div
                        className="hero__scroll-indicator scroll-indicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        <ChevronDown size={20} />
                        <span>{t('scrollDown')}</span>
                    </motion.div>
                </div>
            </section>

            {/* Products Section */}
            <section className="section products-section">
                <div className="container">
                    <AnimatedSection>
                        <div className="section-header">
                            <h2>{t('home.productsTitle')}</h2>
                            <p className="section-subtitle">{t('home.productsSubtitle')}</p>
                        </div>
                    </AnimatedSection>

                    <div className="products-grid-large">
                        {products.map((product, i) => (
                            <AnimatedSection key={i} delay={i * 0.1}>
                                <Link to={product.to} className={`product-card-large card product-card-large--${product.color}`}>
                                    <div className="product-card-large__content">
                                        <div className={`product-card-large__icon product-card-large__icon--${product.color}`}>
                                            {product.icon}
                                        </div>
                                        <div className="product-card-large__info">
                                            <div className="product-card-large__header">
                                                <h3 className="product-card-large__title">{product.title}</h3>
                                                <span className={`product-card__status product-card__status--${product.statusClass}`}>
                                                    {product.status}
                                                </span>
                                            </div>
                                            <p className="product-card-large__desc">{product.desc}</p>
                                            <div className="product-card-large__bot">{product.bot}</div>
                                            <div className="product-card-large__cta btn btn-primary">Попробовать →</div>
                                        </div>
                                    </div>
                                    <div className={`product-card-large__visual product-card-large__visual--${product.color}`}>
                                        <img src={product.logo} alt={product.title} className="product-card-large__logo" />
                                    </div>
                                </Link>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* Philosophy Section */}
            <section className="section philosophy-section">
                <div className="container">
                    <AnimatedSection>
                        <div className="section-header">
                            <h2>{t('home.philosophyTitle')}</h2>
                        </div>
                    </AnimatedSection>

                    <div className="pillars-grid">
                        {pillars.map((pillar, i) => (
                            <AnimatedSection key={i} delay={i * 0.12}>
                                <div className="pillar-card">
                                    <div className="pillar-card__icon">{pillar.icon}</div>
                                    <h3 className="pillar-card__title">{pillar.title}</h3>
                                    <p className="pillar-card__desc">{pillar.desc}</p>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
