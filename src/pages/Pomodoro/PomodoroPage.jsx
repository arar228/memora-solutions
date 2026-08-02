import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Timer, Play, Maximize2 } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import './PomodoroPage.css';

// Permanent, version-less URL (electron-builder artifactName is stable).
const WIN_INSTALLER = 'https://github.com/arar228/memora-solutions/releases/latest/download/Memora-Pomodoro-Setup.exe';
const RELEASES_LATEST = 'https://github.com/arar228/memora-solutions/releases/latest';
// Веб-копия приложения: та же кодовая база, что и у десктопа, собирается
// командой `npm run build:web` в memora-pomodoro/ прямо в public/app/pomodoro.
const WEB_APP_URL = import.meta.env.DEV
    ? '/app/pomodoro/index.html'
    : 'https://arar228.github.io/memora-solutions/app/pomodoro/index.html';
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

    // Номер и дата актуальной версии — файл пишется сборкой веб-копии.
    const [release, setRelease] = useState(null);
    useEffect(() => {
        let cancelled = false;
        fetch('/pomodoro-version.json', { cache: 'no-cache' })
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (!cancelled) setRelease(d); })
            .catch(() => { /* без надписи о версии страница остаётся рабочей */ });
        return () => { cancelled = true; };
    }, []);
    const releaseLine = release?.version
        ? (ru
            ? `Актуальная версия ${release.version} · от ${new Date(release.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : `Latest version ${release.version} · ${new Date(release.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`)
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
                        <div className="pomodoro-hero__hint">
                            {isWin
                                ? t(k('downloadHint'))
                                : (ru
                                    ? 'Сейчас доступна версия для Windows. macOS и Linux — скоро.'
                                    : 'Windows build available now. macOS and Linux coming soon.')}
                        </div>

                        {releaseLine && (
                            <div className="pomodoro-hero__version">{releaseLine}</div>
                        )}

                        <div className="pomodoro-hero__update">
                            {ru
                                ? '↻ Обновляетесь? Просто запустите новый установщик поверх старой версии — вся статистика и настройки сохранятся.'
                                : '↻ Updating? Just run the new installer over the old version — all your stats and settings are kept.'}
                        </div>

                        <details className="pomodoro-hero__install">
                            <summary>
                                {ru
                                    ? 'Windows показывает «Система Windows защитила ваш компьютер»? Что делать'
                                    : 'Windows shows "Windows protected your PC"? What to do'}
                            </summary>
                            <div className="pomodoro-hero__install-body">
                                <ol>
                                    <li>
                                        {ru ? 'Нажмите ' : 'Click '}
                                        <b>{ru ? '«Подробнее»' : '"More info"'}</b>
                                    </li>
                                    <li>
                                        {ru ? 'Затем ' : 'Then click '}
                                        <b>{ru ? '«Выполнить в любом случае»' : '"Run anyway"'}</b>
                                    </li>
                                </ol>
                                <p>
                                    {ru
                                        ? 'Это нормально для нового приложения без платной цифровой подписи — файл безопасен и собран из открытого кода этого проекта.'
                                        : 'This is normal for a new app without a paid code-signing certificate — the file is safe and built from this project’s open source.'}
                                </p>
                            </div>
                        </details>
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
                                src={WEB_APP_URL}
                                title={ru ? 'Мемора Помодоро — веб-версия' : 'Memora Pomodoro — web version'}
                                loading="lazy"
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
