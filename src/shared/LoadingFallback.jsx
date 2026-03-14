export default function LoadingFallback() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '1.5rem',
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid rgba(200, 155, 109, 0.2)',
                borderTop: '3px solid var(--color-gold, #C89B6D)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
