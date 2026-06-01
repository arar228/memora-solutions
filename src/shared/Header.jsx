import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

// Top-level links shown before / after the Products dropdown.
const LINKS_BEFORE = [
    { to: '/', key: 'home' },
    { to: '/travel-radar', key: 'travelRadar' },
];
const LINKS_AFTER = [
    { to: '/kanban', key: 'kanban' },
    { to: '/internal', key: 'internal' },
    { to: '/creator', key: 'creator' },
];
// Grouped under the "Products" dropdown.
const PRODUCTS = [
    { to: '/travel-radar', key: 'travelRadar' },
    { to: '/wallet', key: 'wallet' },
    { to: '/bday-bot', key: 'bdayBot' },
    { to: '/pomodoro', key: 'pomodoro' },
];

export default function Header() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [productsOpen, setProductsOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close both menus on navigation.
    useEffect(() => {
        setMobileOpen(false);
        setProductsOpen(false);
    }, [location]);

    const toggleLang = () => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru');

    const isActive = (to) => location.pathname === to;
    const productsActive = PRODUCTS.some(p => p.to === location.pathname);

    return (
        <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
            <div className="header__inner container">
                <Link to="/" className="header__logo">
                    <img src="/logo.png" alt="Memora Solutions" className="header__logo-img" />
                    <span className="header__logo-text">{t('brand')}</span>
                </Link>

                <nav className="header__nav">
                    {LINKS_BEFORE.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`header__nav-link ${isActive(link.to) ? 'header__nav-link--active' : ''}`}
                        >
                            {t(`nav.${link.key}`)}
                        </Link>
                    ))}

                    {/* Products dropdown */}
                    <div
                        className="header__dropdown"
                        onMouseEnter={() => setProductsOpen(true)}
                        onMouseLeave={() => setProductsOpen(false)}
                    >
                        <button
                            type="button"
                            className={`header__nav-link header__dropdown-toggle ${productsActive ? 'header__nav-link--active' : ''}`}
                            onClick={() => setProductsOpen(o => !o)}
                            aria-haspopup="true"
                            aria-expanded={productsOpen}
                        >
                            {t('nav.products')}
                            <ChevronDown size={14} aria-hidden="true" className={`header__chev ${productsOpen ? 'open' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {productsOpen && (
                                <motion.div
                                    className="header__dropdown-menu"
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {PRODUCTS.map(p => (
                                        <Link
                                            key={p.to}
                                            to={p.to}
                                            className={`header__dropdown-item ${isActive(p.to) ? 'header__dropdown-item--active' : ''}`}
                                        >
                                            {t(`nav.${p.key}`)}
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {LINKS_AFTER.map(link => (
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
                        {LINKS_BEFORE.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`header__mobile-link ${isActive(link.to) ? 'header__mobile-link--active' : ''}`}
                            >
                                {t(`nav.${link.key}`)}
                            </Link>
                        ))}

                        <div className="header__mobile-group-label">{t('nav.products')}</div>
                        {PRODUCTS.map(p => (
                            <Link
                                key={`m-${p.to}`}
                                to={p.to}
                                className={`header__mobile-link header__mobile-sublink ${isActive(p.to) ? 'header__mobile-link--active' : ''}`}
                            >
                                {t(`nav.${p.key}`)}
                            </Link>
                        ))}

                        {LINKS_AFTER.map(link => (
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
