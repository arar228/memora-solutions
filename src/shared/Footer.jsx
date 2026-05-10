import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import './Footer.css';

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="footer">
            <div className="footer__inner container">
                <div className="footer__brand">
                    <img src="/logo.png" alt={t('brand')} className="footer__logo" />
                    <span className="footer__brand-text">{t('brand')}</span>
                </div>
                <div className="footer__info">
                    <p className="footer__made-with">
                        {t('footer.madeWith')} <Heart size={14} className="footer__heart" />
                    </p>
                    <p className="footer__copyright">{t('footer.copyright')}</p>
                </div>
            </div>
        </footer>
    );
}
