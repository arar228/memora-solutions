import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, Send, ArrowDown, Sparkles, Briefcase, Users, Cpu, Building2 } from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import SceneScale from '../components/scenes/SceneScale';
import SceneLogistics from '../components/scenes/SceneLogistics';
import SceneWorkstations from '../components/scenes/SceneWorkstations';
import SceneVR from '../components/scenes/SceneVR';
import SceneDomatrix from '../components/scenes/SceneDomatrix';
import SceneTeam from '../components/scenes/SceneTeam';
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
                        <span className="creator-hero__eyebrow">О создателе</span>
                        <h1 className="creator-hero__title">
                            Привет, это Сергей.<br />
                            <span className="creator-hero__title-accent">Вот почему этому проекту стоит доверять.</span>
                        </h1>
                        <p className="creator-hero__lead">
                            За Memora стоит живой человек с 6+ годами в системной интеграции,
                            860&nbsp;млн рублей реализованных проектов и привычкой делать сложное — понятным.
                        </p>
                    </motion.div>

                    <motion.div
                        className="creator-hero__photo-col"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="creator-hero__photo-frame">
                            <img src="/creator.jpg" alt="Сергей Маклаков" className="creator-hero__photo" />
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
                        <p className="creator-text creator-text--large">
                            Это не очередной «проект о саморазвитии», собранный за выходные.
                        </p>
                        <p className="creator-text">
                            За Memora Solutions стоит <strong>Сергей Маклаков</strong> — человек, который последние
                            6,5&nbsp;лет занимается тем, что берёт технически сложные задачи и доводит их до результата.
                        </p>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ NUMBERS ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-numbers">
                        <div className="creator-numbers__card">
                            <Briefcase size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">6,5 лет</span>
                            <span className="creator-numbers__label">в системной интеграции</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Sparkles size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">860+ млн ₽</span>
                            <span className="creator-numbers__label">объём проектов</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Cpu size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">1 200+</span>
                            <span className="creator-numbers__label">рабочих станций</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Users size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">25</span>
                            <span className="creator-numbers__label">специалистов в команде</span>
                        </div>
                        <div className="creator-numbers__card">
                            <Building2 size={22} className="creator-numbers__icon" />
                            <span className="creator-numbers__value">24+</span>
                            <span className="creator-numbers__label">инженерных систем</span>
                        </div>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ STORY SECTIONS ═══════════════ */}

                {/* --- Scale --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">01 / Масштаб</div>
                        <h2 className="creator-story__title">В реальном мире это выглядело так</h2>
                        <p className="creator-text">
                            Поставить оборудование в исторический корпус университета, где нельзя поцарапать лестницу.
                        </p>
                        <div className="creator-scene">
                            <SceneScale />
                            <div className="creator-scene__hint">Наведите курсор на проект, чтобы узнать подробнее</div>
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- Logistics --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">02 / Логистика</div>
                        <h2 className="creator-story__title">5 тонн металла через полстраны</h2>
                        <p className="creator-text">
                            Заказать 5-тонный подъёмный кран в Челябинске и привезти его в Петербург под конец года.
                            Декабрь. Дедлайн. Туда, куда лифт не заходит.
                        </p>
                        <div className="creator-scene">
                            <SceneLogistics />
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- Workstations --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">03 / Рабочие станции</div>
                        <h2 className="creator-story__title">1 200 компьютеров с нуля</h2>
                        <p className="creator-text">
                            Собрать с нуля больше тысячи мощных компьютеров для конструкторских бюро.
                            Каждый — под конкретную задачу заказчика.
                        </p>
                        <div className="creator-scene">
                            <SceneWorkstations />
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- DOMATRIX --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">04 / Автоматизация</div>
                        <h2 className="creator-story__title">Платформа DOMATRIX</h2>
                        <p className="creator-text">
                            Выстроить системы автоматизации для жилых комплексов.
                            Разработать платформу, которая объединяет десятки инженерных систем здания в одном интерфейсе.
                        </p>
                        <div className="creator-scene">
                            <SceneDomatrix />
                        </div>
                    </section>
                </AnimatedSection>

                {/* --- VR --- */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">05 / VR-пространство</div>
                        <h2 className="creator-story__title">Групповой VR в одном автобусе</h2>
                        <p className="creator-text">
                            Все в разных местах — но в одном пространстве.
                            Технология, которая объединяет людей.
                        </p>
                        <div className="creator-scene">
                            <SceneVR />
                        </div>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ HIGHLIGHT QUOTE ═══════════════ */}
                <AnimatedSection>
                    <blockquote className="creator-quote">
                        <span className="creator-quote__mark">"</span>
                        <p>Суммарный объём реализованных проектов — <strong>более 860&nbsp;млн рублей</strong>.</p>
                    </blockquote>
                </AnimatedSection>

                {/* ═══════════════ PHILOSOPHY ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-section">
                        <p className="creator-text">
                            Но ещё параллельно — читал, практиковал, исследовал. Медитация, философия, работа с памятью,
                            осознанность, Eckhart Tolle и буддийские практики. Не как хобби, а как второй язык,
                            на котором можно объяснять мир.
                        </p>
                        <p className="creator-text creator-text--accent">
                            Memora Solutions — это точка пересечения двух миров: технического и философского.
                        </p>
                        <p className="creator-text">
                            Здесь не будет воды и мотивационных банальностей.
                            Только то, что реально работает — проверено на себе и тех, кто рядом.
                        </p>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ TEAM GRAPH ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-story">
                        <div className="creator-story__label">06 / Команда</div>
                        <h2 className="creator-story__title">Люди, с которыми это возможно</h2>
                        <p className="creator-text">
                            Если вы хотите просто читать — добро пожаловать.<br />
                            Если хотите работать вместе — ещё лучше.
                        </p>
                        <div className="creator-scene">
                            <SceneTeam />
                        </div>
                    </section>
                </AnimatedSection>

                {/* ═══════════════ CTA ═══════════════ */}
                <AnimatedSection>
                    <section className="creator-cta">
                        <div className="creator-cta__inner">
                            <h2 className="creator-cta__title">Давайте работать вместе</h2>
                            <p className="creator-cta__text">
                                Если у вас есть идея, задача или просто вопрос — пишите.
                                Мне интересно работать с людьми, которые делают что-то осмысленное.
                            </p>
                            <p className="creator-cta__text">
                                Открыт к коллаборациям, консультациям, совместным проектам —
                                особенно там, где нужен человек, который умеет разобраться в сложном
                                и объяснить простым языком.
                            </p>
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
