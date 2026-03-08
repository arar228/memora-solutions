import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Compass, Wallet, Cake, Heart, CalendarCheck, Clock, ChevronDown } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import './HomePage.css';

function GoldParticles() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        const particles = [];
        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 35; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2.5 + 0.5,
                dx: (Math.random() - 0.5) * 0.3,
                dy: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.4 + 0.1,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(6, 182, 212, ${p.opacity})`;
                ctx.fill();
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} className="hero__particles" />;
}

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
        },
    ];

    const pillars = [
        { icon: <Heart size={28} />, title: t('home.pillar1Title'), desc: t('home.pillar1Desc') },
        { icon: <CalendarCheck size={28} />, title: t('home.pillar2Title'), desc: t('home.pillar2Desc') },
        { icon: <Clock size={28} />, title: t('home.pillar3Title'), desc: t('home.pillar3Desc') },
    ];

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero__bg">
                    <div className="hero__gradient" />
                    <GoldParticles />
                </div>
                <div className="hero__content container">
                    <motion.div
                        className="hero__text"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <img src="/logo.png" alt="" className="hero__logo" />
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
                            <h2>Полезные сервисы для путешественников</h2>
                            <p className="section-subtitle">Облегчите подготовку и проведение своих поездок с нашими инструментами в Telegram.</p>
                        </div>
                    </AnimatedSection>

                    <div className="products-grid-large">
                        {/* Travel Radar Card */}
                        <AnimatedSection delay={0.1}>
                            <Link to="/travel-radar" className="product-card-large card product-card-large--gold">
                                <div className="product-card-large__content">
                                    <div className="product-card-large__icon product-card-large__icon--gold">
                                        <Compass size={32} />
                                    </div>
                                    <div className="product-card-large__info">
                                        <div className="product-card-large__header">
                                            <h3 className="product-card-large__title">{t('products.travelRadar.title')}</h3>
                                            <span className="product-card__status product-card__status--dev">{t('statusDev')}</span>
                                        </div>
                                        <p className="product-card-large__desc">Мониторинг выгодных туров и билетов. Экономьте время и деньги, получая оперативные уведомления в Telegram.</p>
                                        <div className="product-card-large__bot">@MemoraTravelRadarBot</div>
                                        <div className="product-card-large__cta btn btn-primary">Попробовать →</div>
                                    </div>
                                </div>
                                <div className="product-card-large__visual product-card-large__visual--gold mockup-container">
                                    <div className="mockup-chat">
                                        <div className="mockup-bubble mockup-bubble--in">
                                            <span className="mockup-icon">🌴</span> <b>Найден тур на Бали!</b> <br />Скидка 40% на перелет и отель.
                                            <div className="mockup-btn">Смотреть билеты</div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </AnimatedSection>

                        {/* Wallet Card */}
                        <AnimatedSection delay={0.2}>
                            <Link to="/wallet" className="product-card-large card product-card-large--green">
                                <div className="product-card-large__content">
                                    <div className="product-card-large__icon product-card-large__icon--green">
                                        <Wallet size={32} />
                                    </div>
                                    <div className="product-card-large__info">
                                        <div className="product-card-large__header">
                                            <h3 className="product-card-large__title">{t('products.wallet.title')}</h3>
                                            <span className="product-card__status product-card__status--active">{t('statusActive')}</span>
                                        </div>
                                        <p className="product-card-large__desc">Удобный бот для контроля совместного бюджета в поездках. Вносите расходы прямо в чате и знайте, кто кому должен.</p>
                                        <div className="product-card-large__bot">@MemoraWallet_bot</div>
                                        <div className="product-card-large__cta btn btn-primary">Попробовать →</div>
                                    </div>
                                </div>
                                <div className="product-card-large__visual product-card-large__visual--green mockup-container">
                                    <div className="mockup-chat">
                                        <div className="mockup-bubble mockup-bubble--out">
                                            Потратил 1500 руб. на такси 🚕
                                        </div>
                                        <div className="mockup-bubble mockup-bubble--in mockup-bubble--success">
                                            Расход добавлен! Остаток бюджета: 45 000 руб.
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </AnimatedSection>

                        {/* BDay Bot Card */}
                        <AnimatedSection delay={0.3}>
                            <Link to="/bday-bot" className="product-card-large card product-card-large--blue">
                                <div className="product-card-large__content">
                                    <div className="product-card-large__icon product-card-large__icon--blue">
                                        <Cake size={32} />
                                    </div>
                                    <div className="product-card-large__info">
                                        <div className="product-card-large__header">
                                            <h3 className="product-card-large__title">{t('products.bdayBot.title')}</h3>
                                            <span className="product-card__status product-card__status--active">{t('statusActive')}</span>
                                        </div>
                                        <p className="product-card-large__desc">Надежные напоминания о днях рождения близких и коллег, чтобы вы никогда не забывали о важных датах даже в роуминге.</p>
                                        <div className="product-card-large__bot">@MemoraBDayBot</div>
                                        <div className="product-card-large__cta btn btn-primary">Попробовать →</div>
                                    </div>
                                </div>
                                <div className="product-card-large__visual product-card-large__visual--blue mockup-container">
                                    <div className="mockup-chat">
                                        <div className="mockup-bubble mockup-bubble--in">
                                            <span className="mockup-icon">🎉</span> <b>Напоминание!</b><br />Завтра день рождения у Анны. <br />Не забудьте подготовить подарок!
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </AnimatedSection>
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
