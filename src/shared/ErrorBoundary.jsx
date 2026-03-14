import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
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
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Что-то пошло не так</h2>
                    <p style={{ opacity: 0.7, maxWidth: '400px', marginBottom: '1.5rem' }}>
                        Произошла ошибка при загрузке страницы. Попробуйте обновить.
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
                        Обновить страницу
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
