import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function isWebGLAvailable() {
    if (typeof window === 'undefined') return true;
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
        return false;
    }
}

export default function WebGLFallback({ children, fallback }) {
    const { t } = useTranslation();
    // Lazy initial state — runs once, no render-time side effects.
    const [supported] = useState(isWebGLAvailable);

    if (!supported) {
        return fallback ?? (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '320px',
                padding: '2rem',
                background: '#0D0D1A',
                color: 'rgba(255,255,255,0.5)',
                borderRadius: '12px',
                textAlign: 'center',
                fontSize: '0.9rem',
            }}>
                {t('creator.scene.webglUnsupported')}
            </div>
        );
    }

    return children;
}
