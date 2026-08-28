import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Timer, Play, Maximize2, RefreshCw, ShieldCheck, ChevronDown } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import './PomodoroPage.css';

// Permanent, version-less URL (electron-builder artifactName is stable).
const WIN_INSTALLER = 'https://github.com/arar228/memora-solutions/releases/latest/download/Memora-Pomodoro-Setup.exe';
const RELEASES_LATEST = 'https://github.com/arar228/memora-solutions/releases/latest';
const CHECKSUMS = '/Memora-Pomodoro-Setup.sha256';
// Веб-копия приложения: та же кодовая база, что и у десктопа, собирается
// командой `npm run build:web` в memora-pomodoro/ прямо в public/app/pomodoro.
const WEB_APP_URL = '/app/pomodoro/index.html';
const FEATURES = ['f1', 'f2', 'f3', 'f4', 'f5'];
const STEPS = ['step1', 'step2', 'step3', 'step4'];

function detectOS() {
    if (typeof navigator === 'undefined') return 'other';
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('linux') || ua.includes('x11') || ua.includes('android')) return 'linux';
    return 'other';
}

export default function PomodoroPage() {
    const { t, i18n } = useTranslation();
    const k = (path) => `pomodoro.${path}`;
    const ru = i18n.language === 'ru';

    // Only Windows is published so far. Windows users get a one-click direct
    // download; everyone else is sent to the releases page.
    const os = detectOS();
    const isWin = os === 'windows';
    const downloadHref = isWin ? WIN_INSTALLER : RELEASES_LATEST;
    const selectedAssetSource = typeof document !== 'undefined'
        ? document.documentElement.dataset.memoraAssetSource
        : '';
    const webAppSrc = selectedAssetSource
        ? `${WEB_APP_URL}?assetSource=${encodeURIComponent(selectedAssetSource)}`
        : WEB_APP_URL;

    // Vite embeds the release metadata in this page chunk. A new Pomodoro
    // release changes the chunk hash; repeat visits use the immutable cache.
    const release = import.meta.env.POMODORO_RELEASE;
    const releaseLine = release?.version
        ? (ru
            ? `Версия ${release.version} · ${new Date(release.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : `Version ${release.version} · ${new Date(release.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`)
        : '';

    return (
        <div className="pomodoro-page">
            <section className="pomodoro-hero">
                <div className="pomodoro-hero__glow" />
                <div className="container">
                    <motion.div
                        className="pomodoro-hero__inner"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="pomodoro-hero__badge">
                            <Timer size={14} aria-hidden="true" /> {t(k('badge'))}
                        </div>
                        <h1 className="pomodoro-hero__title">{t(k('heroTitle'))}</h1>
                        <p className="pomodoro-hero__lead">{t(k('heroLead'))}</p>
                        <a
                            href={downloadHref}
                            {...(isWin
                                ? { download: '' }
                                : { target: '_blank', rel: 'noopener noreferrer' })}
                            className="btn btn-primary pomodoro-hero__cta"
                        >
                            <Download size={18} aria-hidden="true" />{' '}
                            {isWin
                                ? (ru ? 'Скачать для Windows' : 'Download for Windows')
                                : t(k('download'))}
                        </a>
                        <div className="pomodoro-hero__meta">
                            <span>
                                {isWin
                                    ? t(k('downloadHint'))
                                    : (ru ? 'Версия для Windows' : 'Windows build')}
                            </span>
                            {releaseLine && <span>{releaseLine}</span>}
                        </div>

                        <div className="pomodoro-hero__support">
                            <div className="pomodoro-hero__update">
                                <RefreshCw size={15} aria-hidden="true" />
                                <span>
                                    {ru
                                        ? 'Статистика и настройки сохраняются'
                                        : 'Updates keep your stats and settings.'}
                                </span>
                            </div>

                            <details className="pomodoro-hero__install">
                                <summary>
                                    <ShieldCheck size={16} aria-hidden="true" />
                                    <span>
                                        {ru
                                            ? 'Проверка установщика'
                                            : 'Verify the installer'}
                                    </span>
                                    <ChevronDown className="pomodoro-hero__install-chevron" size={15} aria-hidden="true" />
                                </summary>
                                <div className="pomodoro-hero__install-body">
                                    <p>
                                        {ru
                                            ? 'Текущий установщик выпускается без цифровой подписи, поэтому SmartScreen показывает предупреждение. Скачайте файл со страницы официального релиза и сравните его SHA-256 с опубликованной контрольной суммой.'
                                            : 'The current installer is unsigned, so SmartScreen shows a warning. Download it from the official release page and compare its SHA-256 with the published checksum.'}
                                    </p>
                                    <p><code>Get-FileHash .\Memora-Pomodoro-Setup.exe -Algorithm SHA256</code></p>
                                    <p><a href={CHECKSUMS} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть опубликованный SHA-256' : 'Open the published SHA-256'}</a></p>
                                    <p>{ru ? 'Контрольная сумма должна совпасть полностью. При расхождении файл запускать нельзя.' : 'The checksum must match exactly. Do not run a file whose checksum differs.'}</p>
                                </div>
                            </details>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Рабочая веб-копия приложения — та же кодовая база, что у десктопа */}
            <div className="container pomodoro-page__body">
                <AnimatedSection>
                    <section className="pomodoro-live">
                        <div className="pomodoro-live__head">
                            <h2>
                                <Play size={18} aria-hidden="true" />{' '}
                                {ru ? 'Попробовать прямо здесь' : 'Try it right here'}
                            </h2>
                            <a
                                className="pomodoro-live__open"
                                href={WEB_APP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Maximize2 size={14} aria-hidden="true" />{' '}
                                {ru ? 'Открыть в отдельной вкладке' : 'Open in a new tab'}
                            </a>
                        </div>
                        <p className="pomodoro-live__lead">
                            {ru
                                ? 'Таймер, секундомер, сцены и статистика. Данные сохраняются только в этом браузере.'
                                : 'Timer, stopwatch, scenes, and stats. Data stays in this browser.'}
                        </p>
                        <div className="pomodoro-live__frame">
                            <iframe
                                src={webAppSrc}
                                title={ru ? 'Мемора Помодоро — веб-версия' : 'Memora Pomodoro — web version'}
                                loading="eager"
                                fetchPriority="high"
                            />
                        </div>
                    </section>
                </AnimatedSection>

                <div className="pomodoro-bento">
                    <AnimatedSection delay={0.05} className="pomodoro-card pomodoro-card--about">
                        <h2>{t(k('about.title'))}</h2>
                        <p>{t(k('about.desc'))}</p>
                    </AnimatedSection>

                    <AnimatedSection delay={0.15} className="pomodoro-card pomodoro-card--features">
                        <h2>
                            <CheckCircle2 size={22} aria-hidden="true" /> {t(k('features.title'))}
                        </h2>
                        <ul className="pomodoro-features">
                            {FEATURES.map((f) => (
                                <li key={f}>
                                    <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                                    <span>{t(k(`features.${f}`))}</span>
                                </li>
                            ))}
                        </ul>
                    </AnimatedSection>

                    <AnimatedSection delay={0.2} className="pomodoro-card pomodoro-card--howto">
                        <h2>{t(k('howTo.title'))}</h2>
                        <ol className="pomodoro-steps">
                            {STEPS.map((s, i) => (
                                <li key={s}>
                                    <div className="pomodoro-steps__num">{i + 1}</div>
                                    <span>{t(k(`howTo.${s}`))}</span>
                                </li>
                            ))}
                        </ol>
                    </AnimatedSection>
                </div>
            </div>
        </div>
    );
}
