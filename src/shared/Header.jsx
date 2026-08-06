import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staticAsset } from './staticAsset';
import { Globe, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const NAV_LINKS = [
    { to: '/', key: 'home' },
    { to: '/travel-radar', key: 'travelRadar' },
    { to: '/products', key: 'products' },
    { to: '/kanban', key: 'kanban' },
];

export default function Header() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close the mobile menu on navigation.
    useEffect(() => {
        setMobileOpen(false);
    }, [location]);

    const toggleLang = () => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru');

    const isActive = (to) => {
        if (to === '/products') {
            return ['/products', '/wallet', '/bday-bot', '/pomodoro'].includes(location.pathname);
        }
        return location.pathname === to;
    };

    return (
        <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
            <div className="header__inner container">
                <Link to="/" className="header__logo">
                    <img src={staticAsset('/logo.png?v=2')} alt="Memora Solutions" className="header__logo-img" />
                    <span className="header__logo-text">{t('brand')}</span>
                </Link>

                <nav className="header__nav">
                    {NAV_LINKS.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`header__nav-link ${isActive(link.to) ? 'header__nav-link--active' : ''}`}
                        >
                            {t(`nav.${link.key}`)}
                        </Link>
                    ))}
                </nav>

                <div className="header__actions">
                    <button
                        onClick={toggleLang}
                        className="header__action-btn"
                        aria-label={i18n.language === 'ru' ? t('a11y.switchToEn') : t('a11y.switchToRu')}
                    >
                        <Globe size={18} aria-hidden="true" />
                        <span className="header__lang-label">{i18n.language === 'ru' ? 'EN' : 'RU'}</span>
                    </button>

                    <button
                        className="header__burger"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label={mobileOpen ? t('a11y.closeMenu') : t('a11y.openMenu')}
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="header__mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {NAV_LINKS.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`header__mobile-link ${isActive(link.to) ? 'header__mobile-link--active' : ''}`}
                            >
                                {t(`nav.${link.key}`)}
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
