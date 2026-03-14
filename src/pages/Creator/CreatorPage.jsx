import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, Send, ArrowDown, Sparkles, Briefcase, Users, Cpu, Building2 } from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import SceneScale from '../../shared/scenes/SceneScale';
import SceneLogistics from '../../shared/scenes/SceneLogistics';
import SceneWorkstations from '../../shared/scenes/SceneWorkstations';
import SceneVR from '../../shared/scenes/SceneVR';
import SceneDomatrix from '../../shared/scenes/SceneDomatrix';
import SceneTeam from '../../shared/scenes/SceneTeam';
import './CreatorPage.css';

export default function CreatorPage() {
    const { t } = useTranslation();

    return (
        <div className="creator-page">

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="creator-hero">
                <div className="creator-hero__glow creator-hero__glow--1" />
                <div className="creator-hero__glow creator-hero__glow--2" />

                <div className="container creator-hero__inner">
                    <motion.div
                        className="creator-hero__text"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <span className="creator-hero__eyebrow">{t('creator.eyebrow')}</span>
                        <h1 className="creator-hero__title">
                            {t('creator.heroTitle')}<br />
                            <span className="creator-hero__title-accent">{t('creator.heroAccent')}</span>
                        </h1>
                        <p className="creator-hero__lead">{t('creator.heroLead')}</p>
                        <div className="creator-cta__links" style={{ marginTop: 'var(--space-lg)' }}>
                            <a href="mailto:s.maklakov@armk.pro" className="creator-cta__link">
                                <Mail size={18} />
                                <span>s.maklakov@armk.pro</span>
                            </a>
                            <a href="https://t.me/MemoraSolutions" target="_blank" rel="noopener noreferrer" className="creator-cta__link creator-cta__link--tg">
                                <Send size={18} />
                                <span>@MemoraSolutions</span>
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        className="creator-hero__photo-col"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="creator-hero__photo-frame">
                            <img src="/creator.jpg" alt={t('creator.photoAlt')} className="creator-hero__photo" />
                            <div className="creator-hero__photo-border" />
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    className="creator-hero__scroll-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                >
                    <ArrowDown size={18} className="scroll-indicator" />
                </motion.div>
            </section>

            {/* ═══════════════ INTRO ═══════════════ */}
            <div className="container creator-page__body">

                <AnimatedSection>
                    <section className="creator-section creator-intro">
                        <p className="creator-text creator-text--large">{t('creator.introLarge')}</p>
                        <p className="creator-text" dangerouslySetInnerHTML={{ __html: t('creator.introText') }} />
                    </section>
                </AnimatedSection>

                {/* ═══════════════ NUMBERS ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-numbers">
                        <div className="creator-numbers__card">
                            <Briefcase size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">{t('creator.num1Value')}</span>
                            <span className="creator-numbers__label">{t('creator.num1Label')}</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Sparkles size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">{t('creator.num2Value')}</span>
                            <span className="creator-numbers__label">{t('creator.num2Label')}</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Cpu size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">{t('creator.num3Value')}</span>
                            <span className="creator-numbers__label">{t('creator.num3Label')}</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Users size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">25</span>
                            <span className="creator-numbers__label">{t('creator.num4Label')}</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Building2 size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">24+</span>
                            <span className="creator-numbers__label">{t('creator.num5Label')}</span>
                        </div>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ STORY SECTIONS ═══════════════ */}

                {/* --- Scale --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">{t('creator.s1Label')}</div>
                        <h2 className="creator-story__title">{t('creator.s1Title')}</h2>
                        <p className="creator-text">{t('creator.s1Text')}</p>
                        <div className="creator-scene">
                            <SceneScale />
                            <div className="creator-scene__hint">{t('creator.s1Hint')}</div>
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- Logistics --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">{t('creator.s2Label')}</div>
                        <h2 className="creator-story__title">{t('creator.s2Title')}</h2>
                        <p className="creator-text">{t('creator.s2Text')}</p>
                        <div className="creator-scene">
                            <SceneLogistics />
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- Workstations --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">{t('creator.s3Label')}</div>
                        <h2 className="creator-story__title">{t('creator.s3Title')}</h2>
                        <p className="creator-text">{t('creator.s3Text')}</p>
                        <div className="creator-scene">
                            <SceneWorkstations />
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- DOMATRIX --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">{t('creator.s4Label')}</div>
                        <h2 className="creator-story__title">{t('creator.s4Title')}</h2>
                        <p className="creator-text">{t('creator.s4Text')}</p>
                        <div className="creator-scene">
                            <SceneDomatrix />
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- VR --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">{t('creator.s5Label')}</div>
                        <h2 className="creator-story__title">{t('creator.s5Title')}</h2>
                        <p className="creator-text">{t('creator.s5Text')}</p>
                        <div className="creator-scene">
                            <SceneVR />
                        </div>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ HIGHLIGHT QUOTE ═══════════════ */}
                <AnimatedSection>
                    <blockquote className="creator-quote">
                        <span className="creator-quote__mark">"</span>
                        <p dangerouslySetInnerHTML={{ __html: t('creator.quote') }} />
                    </blockquote>
                </AnimatedSection>

                {/* ═══════════════ PHILOSOPHY ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-section">
                        <p className="creator-text">{t('creator.phil1')}</p>
                        <p className="creator-text creator-text--accent">{t('creator.phil2')}</p>
                        <p className="creator-text">{t('creator.phil3')}</p>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ TEAM GRAPH ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">{t('creator.s6Label')}</div>
                        <h2 className="creator-story__title">{t('creator.s6Title')}</h2>
                        <p className="creator-text" dangerouslySetInnerHTML={{ __html: t('creator.s6Text') }} />
                        <div className="creator-scene">
                            <SceneTeam />
                        </div>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ CTA ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-cta">
                        <div className="creator-cta__inner">
                            <h2 className="creator-cta__title">{t('creator.ctaTitle')}</h2>
                            <p className="creator-cta__text">{t('creator.ctaText1')}</p>
                            <p className="creator-cta__text">{t('creator.ctaText2')}</p>
                            <div className="creator-cta__links">
                                <a href="mailto:s.maklakov@armk.pro" className="creator-cta__link">
                                    <Mail size={18} />
                                    <span>s.maklakov@armk.pro</span>
                                </a>
                                <a href="https://t.me/MemoraSolutions" target="_blank" rel="noopener noreferrer" className="creator-cta__link creator-cta__link--tg">
                                    <Send size={18} />
                                    <span>@MemoraSolutions</span>
                                </a>
                            </div>
                        </div>
                    </section>
                </AnimatedSection>

            </div>
        </div>
    );
}
