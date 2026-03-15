import { useMemo, useState, lazy, Suspense } from 'react';
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

const ProductDevOS = lazy(() => import('../../shared/ProductDevOS'));

const FULL_QUOTE = `Создали систему, которая превращает хаос проектной работы в управляемый конвейер. Суть простая: каждый проект стартует не с чистого листа, а с готовой структуры — набора «кармашков», куда команда складывает ключевые документы: от позиционирования до принципов разработки. Пустой кармашек — это задача. Заполненный — накопленный опыт, который автоматически работает на следующий проект. Чем больше проектов проходит через систему, тем быстрее, надёжнее и шире масштабируется каждый следующий. Мультипликатор, который растёт вместе с командой.`;

const FULL_QUOTE_EN = `We built a system that turns the chaos of project work into a managed pipeline. The idea is simple: every project starts not from scratch, but from a ready-made structure — a set of "pockets" where the team stores key documents: from positioning to development principles. An empty pocket is a task. A filled one is accumulated experience that automatically works for the next project. The more projects go through the system, the faster, more reliably, and more broadly each next one scales. A multiplier that grows with the team.`;

function DevShowcase({ t }) {
    const [demoOpen, setDemoOpen] = useState(false);
    const [quoteOpen, setQuoteOpen] = useState(false);
    const isRu = t('creator.s7Label') === '07 / Внутренние разработки';

    return (
        <div className="creator-dev-card">
            <div className="creator-dev-card__badge">PRODUCT DEV OS v4</div>
            <h3 className="creator-dev-card__title">
                {isRu ? 'Операционная система для проектов' : 'Operating System for Projects'}
            </h3>
            <p className="creator-dev-card__text">
                {isRu
                    ? <>Каждый проект, который вы видели выше, прошёл через одну систему. Мы назвали её <strong>Product Dev OS</strong> — операционная система для проектной работы. Проект никогда не стартует с чистого листа. В нём уже есть набор <strong>«кармашков»</strong> — позиционирование, принципы разработки, конкурентный анализ, архитектура. Пустой кармашек — это задача. Заполненный — опыт, который работает на каждый следующий проект.</>
                    : <>Every project you've seen above went through a single system. We call it <strong>Product Dev OS</strong> — an operating system for project work. A project never starts from scratch. It already has a set of <strong>"pockets"</strong> — positioning, development principles, competitive analysis, architecture. An empty pocket is a task. A filled one is experience that works for every next project.</>}
            </p>

            <button
                className="creator-dev-card__expand-btn"
                onClick={() => setQuoteOpen(!quoteOpen)}
            >
                {quoteOpen
                    ? (isRu ? 'Свернуть ↑' : 'Collapse ↑')
                    : (isRu ? 'Полная цитата от основателя →' : 'Full quote from founder →')}
            </button>

            {quoteOpen && (
                <div className="creator-dev-card__quote">
                    {isRu ? FULL_QUOTE : FULL_QUOTE_EN}
                    <div style={{ marginTop: 8, fontStyle: 'normal', fontSize: '0.75rem', opacity: 0.6 }}>
                        — @MemoraSolutions
                    </div>
                </div>
            )}

            {/* Desktop: interactive demo */}
            <div className="creator-dev-demo">
                <div className="creator-dev-window__bar">
                    <div className="creator-dev-window__dots">
                        <span className="creator-dev-window__dot creator-dev-window__dot--red" />
                        <span className="creator-dev-window__dot creator-dev-window__dot--yellow" />
                        <span className="creator-dev-window__dot creator-dev-window__dot--green" />
                    </div>
                    <span className="creator-dev-window__title">PRODUCT DEV OS v4</span>
                    {demoOpen && (
                        <button
                            className="creator-dev-window__toggle"
                            onClick={() => setDemoOpen(false)}
                        >
                            {isRu ? 'Свернуть' : 'Collapse'}
                        </button>
                    )}
                </div>
                <div className="creator-dev-window__content">
                    {!demoOpen && (
                        <div
                            className="creator-dev-window__blur-overlay"
                            onClick={() => setDemoOpen(true)}
                        >
                            <button className="creator-dev-window__open-btn">
                                {isRu ? 'Открыть систему →' : 'Open the system →'}
                            </button>
                            <span className="creator-dev-window__hint">
                                {isRu
                                    ? 'Это живая система. Раскройте проект, перетащите документ на «кармашек», нажмите на промпт.'
                                    : 'This is a live system. Expand a project, drag a document onto a "pocket", click on a prompt.'}
                            </span>
                        </div>
                    )}
                    {demoOpen && (
                        <Suspense fallback={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5c6484', fontFamily: 'monospace', fontSize: 12 }}>
                                {isRu ? 'Загрузка системы...' : 'Loading system...'}
                            </div>
                        }>
                            <ProductDevOS />
                        </Suspense>
                    )}
                </div>
            </div>

            {/* Mobile: fallback */}
            <div className="creator-dev-mobile-fallback">
                <p className="creator-dev-mobile-fallback__text">
                    {isRu
                        ? '💻 Интерактивная демо-версия Product Dev OS доступна на десктопе'
                        : '💻 Interactive Product Dev OS demo is available on desktop'}
                </p>
            </div>
        </div>
    );
}

export default function CreatorPage() {
    const { t, i18n } = useTranslation();

    const experienceYears = useMemo(() => {
        const start = new Date(2019, 9); // October 2019
        const now = new Date();
        const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
        const rounded = Math.round(years * 10) / 10;
        const formatted = i18n.language === 'ru'
            ? `${rounded.toFixed(1).replace('.', ',')} лет`
            : `${rounded.toFixed(1)} years`;
        return formatted;
    }, [i18n.language]);

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
                            <span className="creator-numbers__value">{experienceYears}</span>
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

                {/* ═══════════════ OTHER DEVELOPMENTS ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-story" id="other-developments">
                        <div className="creator-story__label">{t('creator.s7Label')}</div>
                        <h2 className="creator-story__title">{t('creator.s7Title')}</h2>
                        <p className="creator-text">{t('creator.s7Intro')}</p>

                        <DevShowcase t={t} />
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
