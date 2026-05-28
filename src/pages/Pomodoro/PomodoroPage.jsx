import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Download, CheckCircle2, Timer } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import PomodoroShowcase from '../../shared/PomodoroShowcase';
import './PomodoroPage.css';

const DOWNLOAD_URL = 'https://github.com/arar228/memora-solutions/releases';
const FEATURES = ['f1', 'f2', 'f3', 'f4', 'f5'];
const STEPS = ['step1', 'step2', 'step3', 'step4'];

export default function PomodoroPage() {
    const { t } = useTranslation();
    const k = (path) => `pomodoro.${path}`;

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
                            href={DOWNLOAD_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary pomodoro-hero__cta"
                        >
                            <Download size={18} aria-hidden="true" /> {t(k('download'))}
                        </a>
                        <div className="pomodoro-hero__hint">{t(k('downloadHint'))}</div>
                    </motion.div>
                </div>
            </section>

            <div className="container pomodoro-page__body">
                <AnimatedSection>
                    <PomodoroShowcase t={t} />
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
