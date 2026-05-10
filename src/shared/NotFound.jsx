import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home } from 'lucide-react';

export default function NotFound() {
    const { t } = useTranslation();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem', opacity: 0.4 }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t('notFound.title')}</h2>
            <p style={{ opacity: 0.7, maxWidth: '420px', marginBottom: '1.5rem' }}>
                {t('notFound.text')}
            </p>
            <Link
                to="/"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--color-gold, #C89B6D)',
                    color: '#000',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 600,
                }}
            >
                <Home size={16} /> {t('notFound.backHome')}
            </Link>
        </div>
    );
}
