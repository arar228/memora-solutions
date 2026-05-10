import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

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

    useEffect(() => {
        setMobileOpen(false);
    }, [location]);

    const toggleLang = () => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru');

    const navLinks = [
        { to: '/', label: t('nav.home') },
        { to: '/travel-radar', label: t('nav.travelRadar') },
        { to: '/wallet', label: t('nav.wallet') },
        { to: '/bday-bot', label: t('nav.bdayBot') },
        { to: '/kanban', label: t('nav.kanban') },
        { to: '/creator', label: t('nav.creator') },
    ];

    return (
        <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
            <div className="header__inner container">
                <Link to="/" className="header__logo">
                    <img src="/logo.png" alt="Memora Solutions" className="header__logo-img" />
                    <span className="header__logo-text">{t('brand')}</span>
                </Link>

                <nav className="header__nav">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`header__nav-link ${location.pathname === link.to ? 'header__nav-link--active' : ''}`}
                        >
                            {link.label}
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
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`header__mobile-link ${location.pathname === link.to ? 'header__mobile-link--active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
