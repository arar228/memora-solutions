import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Globe, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

export default function Header() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('memora-theme') || 'light');
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('memora-theme', theme);
    }, [theme]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const toggleLang = () => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru');

    const navLinks = [
        { to: '/', label: t('nav.home') },
        { to: '/travel-radar', label: t('nav.travelRadar') },
        { to: '/wallet', label: t('nav.wallet') },
        { to: '/bday-bot', label: t('nav.bdayBot') },
        { to: '/kanban', label: t('nav.kanban') },
        { to: '/contacts', label: t('nav.contacts') },
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
                    <button onClick={toggleLang} className="header__action-btn" title={i18n.language === 'ru' ? 'Switch to English' : 'Переключить на русский'}>
                        <Globe size={18} />
                        <span className="header__lang-label">{i18n.language === 'ru' ? 'EN' : 'RU'}</span>
                    </button>

                    <button onClick={toggleTheme} className="header__action-btn" title={t(theme === 'light' ? 'theme.dark' : 'theme.light')}>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={theme}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: 'flex' }}
                            >
                                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                            </motion.span>
                        </AnimatePresence>
                    </button>

                    <button className="header__burger" onClick={() => setMobileOpen(!mobileOpen)}>
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
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
