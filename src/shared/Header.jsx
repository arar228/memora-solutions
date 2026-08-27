import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staticAsset } from './staticAsset';
import { Globe, Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const NAV_LINKS = [
    { to: '/', key: 'home' },
    { to: '/travel-radar', key: 'travelRadar' },
    { to: '/products', key: 'products' },
    { to: '/attention-lab', key: 'attentionLab' },
    { to: '/kanban', key: 'kanban' },
];

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
    const [mobileProductsOpen, setMobileProductsOpen] = useState(false);

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
        setProductsOpen(false);
        setMobileProductsOpen(false);
    }, [location]);

    const toggleLang = () => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru');

    const isActive = (to) => {
        if (to === '/products') {
            return ['/products', '/wallet', '/bday-bot', '/pomodoro'].includes(location.pathname);
        }
        return location.pathname === to;
    };

    const productLabel = (product) => t(`nav.${product.key}`);

    const handleProductsBlur = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setProductsOpen(false);
        }
    };

    return (
        <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
            <div className="header__inner container">
                <Link to="/" className="header__logo">
                    <img src={staticAsset('/logo.webp?v=2')} alt="Memora Solutions" className="header__logo-img" decoding="async" />
                    <span className="header__logo-text">{t('brand')}</span>
                </Link>

                <nav className="header__nav">
                    {NAV_LINKS.map(link => link.to === '/products' ? (
                        <div
                            key={link.to}
                            className="header__dropdown"
                            onMouseEnter={() => setProductsOpen(true)}
                            onMouseLeave={() => setProductsOpen(false)}
                            onFocus={() => setProductsOpen(true)}
                            onBlur={handleProductsBlur}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setProductsOpen(false);
                                    event.currentTarget.querySelector('.header__dropdown-toggle')?.focus();
                                }
                            }}
                        >
                            <Link
                                to={link.to}
                                className={`header__nav-link header__dropdown-toggle ${isActive(link.to) ? 'header__nav-link--active' : ''}`}
                                aria-haspopup="menu"
                                aria-expanded={productsOpen}
                            >
                                {t(`nav.${link.key}`)}
                                <ChevronDown size={14} aria-hidden="true" className={`header__chev ${productsOpen ? 'open' : ''}`} />
                            </Link>

                            <AnimatePresence>
                                {productsOpen && (
                                    <motion.div
                                        className="header__dropdown-menu"
                                        role="menu"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {PRODUCTS.map(product => (
                                            <Link
                                                key={product.to}
                                                to={product.to}
                                                role="menuitem"
                                                className={`header__dropdown-item ${location.pathname === product.to ? 'header__dropdown-item--active' : ''}`}
                                            >
                                                {productLabel(product)}
                                            </Link>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
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
                        {NAV_LINKS.map(link => link.to === '/products' ? (
                            <div key={link.to} className="header__mobile-products">
                                <div className="header__mobile-products-row">
                                    <Link
                                        to={link.to}
                                        className={`header__mobile-link header__mobile-products-link ${isActive(link.to) ? 'header__mobile-link--active' : ''}`}
                                    >
                                        {t(`nav.${link.key}`)}
                                    </Link>
                                    <button
                                        type="button"
                                        className="header__mobile-products-toggle"
                                        onClick={() => setMobileProductsOpen(open => !open)}
                                        aria-label={t(`nav.${link.key}`)}
                                        aria-expanded={mobileProductsOpen}
                                    >
                                        <ChevronDown size={18} aria-hidden="true" className={`header__chev ${mobileProductsOpen ? 'open' : ''}`} />
                                    </button>
                                </div>
                                <AnimatePresence initial={false}>
                                    {mobileProductsOpen && (
                                        <motion.div
                                            className="header__mobile-products-list"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.18 }}
                                        >
                                            {PRODUCTS.map(product => (
                                                <Link
                                                    key={`mobile-${product.to}`}
                                                    to={product.to}
                                                    className={`header__mobile-link header__mobile-sublink ${location.pathname === product.to ? 'header__mobile-link--active' : ''}`}
                                                >
                                                    {productLabel(product)}
                                                </Link>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
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
