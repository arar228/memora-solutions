import { Component } from 'react';
import i18n from '../i18n/i18n';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
        this.onLanguageChanged = () => this.forceUpdate();
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidMount() {
        i18n.on('languageChanged', this.onLanguageChanged);
    }

    componentWillUnmount() {
        i18n.off('languageChanged', this.onLanguageChanged);
    }

    componentDidCatch(error, errorInfo) {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--color-text, #ccc)',
                }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                        {i18n.t('errorBoundary.title')}
                    </h2>
                    <p style={{ opacity: 0.7, maxWidth: '400px', marginBottom: '1.5rem' }}>
                        {i18n.t('errorBoundary.text')}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 2rem',
                            background: 'var(--color-gold, #C89B6D)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        {i18n.t('errorBoundary.reload')}
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
