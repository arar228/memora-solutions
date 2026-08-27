import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    AnimatePresence,
    motion,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    BookOpen,
    Boxes,
    Check,
    Clipboard,
    Code2,
    ExternalLink,
    FileImage,
    Layers,
    MonitorPlay,
    Sparkles,
    Table2,
} from 'lucide-react';
import './AttentionLabPage.css';

const SAVED_REFERENCES_KEY = 'memora-attention-lab-references';

const COPY = {
    ru: {
        back: 'Вернуться в портфолио',
        heroLabel: 'Memora · UX / UI practice',
        heroTitle: 'Управляем вниманием пользователя с помощью грамотного дизайна',
        heroTitleLines: ['Управляем вниманием', 'пользователя с помощью', 'грамотного дизайна'],
        heroText: 'Ведём взгляд от первого сигнала к понятному действию через композицию, ритм, контраст и движение.',
        heroAction: 'Смотреть живой кейс',
        heroMeta: ['Диагностика пути', 'Визуальный фокус', 'Измеримый эффект'],
        journey: ['Фокус', 'Кейс', 'Стек', 'Референсы', 'Скиллы'],
        chart: {
            label: 'Живой разбор · 240 сессий',
            title: 'Где пользователь теряет решение',
            stages: [['Увидел предложение', 100], ['Понял ценность', 72], ['Сравнил варианты', 54], ['Выбрал действие', 41]],
            insight: 'Первые 12 секунд определяют выбор: ценность считывают 72% пользователей.',
        },
        case: {
            label: '01 / Живой кейс',
            title: 'Показываем, где пользователь теряет решение',
            chartLabel: 'Путь решения · доля от входа',
            drop: '−28 п.п. за 12 секунд',
            reading: 'Один доминирующий критерий выбора возвращает внимание к действию.',
            facts: [['12 сек.', 'до первого осмысленного действия'], ['31 п.п.', 'теряются после понимания ценности'], ['+17 п.п.', 'даёт визуальный критерий выбора']],
            before: 'Исходный путь',
            after: 'Путь с фокусом',
            effect: 'Визуальный акцент поднимает действие с 41% до 58%',
            question: 'Где пользователь теряет решение и какой визуальный сигнал возвращает его к действию?',
        },
        stackLabel: '02 / Рабочий стек',
        stackTitle: 'Выберите формат — получите стек и маршрут сборки',
        outputs: [
            { id: 'data', title: 'Диаграмма по данным', engine: 'Vega-Lite / Altair', route: 'JSON spec → schema check → vl-convert → SVG / PNG', control: 'Схема, шкалы, подписи, палитра и экспорт.', icon: BarChart3 },
            { id: 'poster', title: 'Редакционный плакат', engine: 'SVG → resvg / CairoSVG', route: 'Сетка → типографика → SVG → 1080 × 1350 PNG', control: 'Размеры, шрифты, контраст и края кадра.', icon: FileImage },
            { id: 'web', title: 'Интерактив для сайта', engine: 'Observable Plot', route: 'Data → marks / scales → interaction → SVG / HTML', control: 'Клавиатура, touch, подсказки, responsive и reduced motion.', icon: MonitorPlay },
            { id: 'pandas', title: 'Отчёт из pandas', engine: 'matplotlib + .mplstyle', route: 'pandas → chart function → brand.mplstyle → SVG / PNG', control: 'Единицы, пропуски, диапазоны осей и подписи.', icon: Table2 },
        ],
        selectedEngine: 'Выбранный движок',
        recipe: 'Маршрут сборки',
        quality: 'Контроль качества',
        copyRecipe: 'Скопировать бриф',
        copied: 'Бриф скопирован',
        refsLabel: '03 / Библиотека решений',
        refsTitle: 'Сохраните референсы для следующего проекта',
        refs: [
            { id: 'ft', title: 'FT Visual Vocabulary', tag: 'Выбор формы', text: 'Карта задач: deviation, correlation, ranking, part-to-whole и flow.', href: 'https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary' },
            { id: 'pudding', title: 'The Pudding starter', tag: 'Визуальное эссе', text: 'Каркас data-driven истории и скроллителлинга.', href: 'https://github.com/the-pudding/svelte-starter' },
            { id: 'data-viz', title: 'From Data to Viz', tag: 'Структура данных', text: 'Маршрут от датасета к подходящему семейству графиков.', href: 'https://www.data-to-viz.com/' },
            { id: 'vega', title: 'Vega-Lite Examples', tag: 'Спека + код', text: 'Официальная галерея для прототипов и few-shot примеров.', href: 'https://vega.github.io/vega-lite/examples/' },
            { id: 'python', title: 'Python Graph Gallery', tag: 'Python', text: 'Примеры с исходниками для matplotlib и seaborn.', href: 'https://python-graph-gallery.com/' },
            { id: 'd3', title: 'D3 Graph Gallery', tag: 'Уникальная геометрия', text: 'Паттерны кастомной интерактивной визуализации.', href: 'https://d3-graph-gallery.com/' },
        ],
        save: 'Сохранить',
        saved: 'Сохранено',
        shelf: 'Референсы проекта',
        shelfEmpty: 'Выберите первый референс',
        toolsLabel: '04 / Передача практики',
        toolsTitle: 'Подключите визуальный стандарт к любому агенту',
        tools: [
            { title: 'AntV MCP Chart', tag: '25+ форм', text: 'Готовые диаграммы, mind map, network graph и treemap.', code: 'npx -y @antv/mcp-server-chart', href: 'https://github.com/antvis/mcp-server-chart', icon: Boxes },
            { title: 'Anthropic Skills', tag: 'Шаблон навыка', text: 'Инструкции и ресурсы в одном повторяемом навыке.', code: '/plugin marketplace add anthropics/skills', href: 'https://github.com/anthropics/skills', icon: BookOpen },
            { title: 'OpenSkills', tag: 'Переносимость', text: 'Один пакет навыка для разных coding-агентов.', code: 'npx openskills install <source> --universal', href: 'https://github.com/numman-ali/openskills', icon: Layers },
        ],
        copyCommand: 'Скопировать команду',
        commandCopied: 'Команда скопирована',
        closeTitle: 'Соберём визуальный сценарий вашего продукта',
        closeAction: 'Обсудить проект',
    },
    en: {
        back: 'Back to portfolio',
        heroLabel: 'Memora · UX / UI practice',
        heroTitle: 'We guide user attention through thoughtful design',
        heroTitleLines: ['We guide user attention', 'through thoughtful', 'design'],
        heroText: 'We lead the eye from the first signal to a clear action through composition, rhythm, contrast, and motion.',
        heroAction: 'Explore the live case',
        heroMeta: ['Journey diagnosis', 'Visual focus', 'Measured effect'],
        journey: ['Focus', 'Case', 'Stack', 'References', 'Skills'],
        chart: { label: 'Live review · 240 sessions', title: 'Where the user loses the decision', stages: [['Saw the offer', 100], ['Understood value', 72], ['Compared options', 54], ['Chose an action', 41]], insight: 'The first 12 seconds shape the choice: 72% understand the value.' },
        case: { label: '01 / Live case', title: 'See where the user loses the decision', chartLabel: 'Decision path · share of entry', drop: '−28 pp in 12 seconds', reading: 'One dominant decision criterion brings attention back to action.', facts: [['12 sec.', 'to the first meaningful action'], ['31 pp', 'lost after value is understood'], ['+17 pp', 'from a visual decision criterion']], before: 'Original path', after: 'Focused path', effect: 'Visual emphasis lifts action from 41% to 58%', question: 'Where does the user lose the decision, and which visual signal brings them back to action?' },
        stackLabel: '02 / Working stack', stackTitle: 'Choose a format — get the stack and build route',
        outputs: [
            { id: 'data', title: 'Data chart', engine: 'Vega-Lite / Altair', route: 'JSON spec → schema check → vl-convert → SVG / PNG', control: 'Schema, scales, labels, palette, and export.', icon: BarChart3 },
            { id: 'poster', title: 'Editorial poster', engine: 'SVG → resvg / CairoSVG', route: 'Grid → typography → SVG → 1080 × 1350 PNG', control: 'Dimensions, fonts, contrast, and frame edges.', icon: FileImage },
            { id: 'web', title: 'Web interaction', engine: 'Observable Plot', route: 'Data → marks / scales → interaction → SVG / HTML', control: 'Keyboard, touch, tooltips, responsive layout, and reduced motion.', icon: MonitorPlay },
            { id: 'pandas', title: 'Pandas report', engine: 'matplotlib + .mplstyle', route: 'pandas → chart function → brand.mplstyle → SVG / PNG', control: 'Units, missing values, axis ranges, and labels.', icon: Table2 },
        ],
        selectedEngine: 'Selected engine', recipe: 'Build route', quality: 'Quality control', copyRecipe: 'Copy brief', copied: 'Brief copied',
        refsLabel: '03 / Decision library', refsTitle: 'Save references for the next project',
        refs: [
            { id: 'ft', title: 'FT Visual Vocabulary', tag: 'Form choice', text: 'A task map for deviation, correlation, ranking, part-to-whole, and flow.', href: 'https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary' },
            { id: 'pudding', title: 'The Pudding starter', tag: 'Visual essay', text: 'A framework for data-driven stories and scrollytelling.', href: 'https://github.com/the-pudding/svelte-starter' },
            { id: 'data-viz', title: 'From Data to Viz', tag: 'Data structure', text: 'A route from dataset structure to a suitable chart family.', href: 'https://www.data-to-viz.com/' },
            { id: 'vega', title: 'Vega-Lite Examples', tag: 'Spec + code', text: 'The official gallery for prototypes and few-shot examples.', href: 'https://vega.github.io/vega-lite/examples/' },
            { id: 'python', title: 'Python Graph Gallery', tag: 'Python', text: 'Source-backed examples for matplotlib and seaborn.', href: 'https://python-graph-gallery.com/' },
            { id: 'd3', title: 'D3 Graph Gallery', tag: 'Unique geometry', text: 'Patterns for custom interactive visualizations.', href: 'https://d3-graph-gallery.com/' },
        ],
        save: 'Save', saved: 'Saved', shelf: 'Project references', shelfEmpty: 'Choose the first reference',
        toolsLabel: '04 / Transfer the practice', toolsTitle: 'Connect the visual standard to any agent',
        tools: [
            { title: 'AntV MCP Chart', tag: '25+ forms', text: 'Ready charts, mind maps, network graphs, and treemaps.', code: 'npx -y @antv/mcp-server-chart', href: 'https://github.com/antvis/mcp-server-chart', icon: Boxes },
            { title: 'Anthropic Skills', tag: 'Skill template', text: 'Instructions and resources in one reusable skill.', code: '/plugin marketplace add anthropics/skills', href: 'https://github.com/anthropics/skills', icon: BookOpen },
            { title: 'OpenSkills', tag: 'Portability', text: 'One skill package for multiple coding agents.', code: 'npx openskills install <source> --universal', href: 'https://github.com/numman-ali/openskills', icon: Layers },
        ],
        copyCommand: 'Copy command', commandCopied: 'Command copied', closeTitle: 'Build the visual journey for your product', closeAction: 'Discuss a project',
    },
};

const EASE = [0.16, 1, 0.3, 1];

function SectionHeading({ label, title, id, light = false }) {
    return (
        <motion.header
            className={`attention-lab-section__head${light ? ' is-light' : ''}`}
            initial={{ opacity: 0, y: 38 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{ duration: 0.65, ease: EASE }}
        >
            <span>{label}</span>
            <h2 id={id}>{title}</h2>
        </motion.header>
    );
}

export default function AttentionLabPage() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const c = COPY[lang];
    const pageRef = useRef(null);
    const heroRef = useRef(null);
    const prefersReducedMotion = useReducedMotion();
    const [output, setOutput] = useState('data');
    const [copied, setCopied] = useState(false);
    const [copiedTool, setCopiedTool] = useState(null);
    const [savedRefs, setSavedRefs] = useState(() => {
        try { return JSON.parse(localStorage.getItem(SAVED_REFERENCES_KEY) || '[]'); } catch { return []; }
    });

    const selectedOutput = c.outputs.find(item => item.id === output);
    const savedReferenceCards = useMemo(() => c.refs.filter(item => savedRefs.includes(item.id)), [c.refs, savedRefs]);
    const { scrollYProgress } = useScroll({ target: pageRef, offset: ['start start', 'end end'] });
    const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const journeyProgress = useSpring(scrollYProgress, { stiffness: 92, damping: 25, mass: 0.24 });
    const journeyTop = useTransform(journeyProgress, [0, 1], ['0%', '100%']);
    const heroCopyY = useTransform(heroProgress, [0, 1], [0, -54]);
    const heroCardY = useTransform(heroProgress, [0, 1], [0, 92]);
    const heroCardRotate = useTransform(heroProgress, [0, 1], [-1.5, 2]);

    useEffect(() => { localStorage.setItem(SAVED_REFERENCES_KEY, JSON.stringify(savedRefs)); }, [savedRefs]);

    const toggleReference = id => setSavedRefs(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    const copyBrief = async () => {
        const brief = `${c.case.question}\n${selectedOutput.engine}\n${selectedOutput.route}\n${selectedOutput.control}`;
        try {
            await navigator.clipboard.writeText(brief);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };
    const copyToolCommand = async item => {
        try {
            await navigator.clipboard.writeText(item.code);
            setCopiedTool(item.title);
            window.setTimeout(() => setCopiedTool(null), 1800);
        } catch {
            setCopiedTool(null);
        }
    };

    return (
        <div className="attention-lab" ref={pageRef}>
            <aside className="attention-lab-journey" aria-hidden="true">
                <div className="attention-lab-journey__track">
                    <motion.i style={{ scaleY: prefersReducedMotion ? 1 : journeyProgress }} />
                    {!prefersReducedMotion && <motion.b style={{ top: journeyTop }}><Sparkles size={18} /></motion.b>}
                </div>
                {c.journey.map((item, index) => <span key={item} style={{ '--step': `${index * 25}%` }}><strong>0{index + 1}</strong>{item}</span>)}
            </aside>

            <header className="attention-lab-hero" ref={heroRef}>
                <div className="attention-lab-hero__grid" aria-hidden="true" />
                <div className="attention-lab-hero__scan" aria-hidden="true" />
                <div className="container attention-lab-hero__inner">
                    <Link className="attention-lab-back" to="/"><ArrowLeft size={18} /> {c.back}</Link>
                    <div className="attention-lab-hero__layout">
                        <motion.div className="attention-lab-hero__copy" style={{ y: prefersReducedMotion ? 0 : heroCopyY }}>
                            <motion.span className="attention-lab-kicker" initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15, ease: EASE }}><Sparkles size={18} /> {c.heroLabel}</motion.span>
                            <h1 aria-label={c.heroTitle}>{c.heroTitleLines.map((line, index) => <motion.span aria-hidden="true" key={line} initial={prefersReducedMotion ? false : { opacity: 0, y: 42, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }} transition={{ duration: 0.72, delay: 0.28 + index * 0.13, ease: EASE }}>{line}</motion.span>)}</h1>
                            <motion.p initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.82, ease: EASE }}>{c.heroText}</motion.p>
                            <motion.a href="#case" className="attention-lab-button is-primary" initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.96, ease: EASE }} whileHover={prefersReducedMotion ? undefined : { y: -4 }}>{c.heroAction} <ArrowRight size={20} /></motion.a>
                        </motion.div>

                        <motion.article
                            className="attention-lab-hero__preview"
                            style={{ y: prefersReducedMotion ? 0 : heroCardY, rotate: prefersReducedMotion ? -1.5 : heroCardRotate }}
                            initial={prefersReducedMotion ? false : { opacity: 0, x: 70, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ duration: 0.78, delay: 0.62, ease: EASE }}
                            whileHover={prefersReducedMotion ? undefined : { y: -8, rotate: 0, transition: { duration: 0.28 } }}
                        >
                            <header><span>{c.chart.label}</span><strong className="type-display">01</strong></header>
                            <h2>{c.chart.title}</h2>
                            <div className="attention-lab-hero__funnel">
                                {c.chart.stages.map(([label, value], index) => (
                                    <motion.div key={label} className={index === 1 ? 'is-key' : ''} initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.42, delay: 1.08 + index * 0.11, ease: EASE }}>
                                        <span>{label}</span>
                                        <i><motion.b style={{ '--value': `${value}%` }} initial={prefersReducedMotion ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.72, delay: 1.2 + index * 0.11, ease: EASE }} /></i>
                                        <strong>{value}%</strong>
                                    </motion.div>
                                ))}
                            </div>
                            <motion.p initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 1.72, ease: EASE }}><Sparkles size={18} /> {c.chart.insight}</motion.p>
                        </motion.article>
                    </div>
                    <div className="attention-lab-hero__meta">{c.heroMeta.map((item, index) => <motion.span key={item} initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 1.12 + index * 0.1 }}>0{index + 1} · {item}</motion.span>)}</div>
                </div>
            </header>

            <main>
                <section className="attention-lab-section attention-editorial" id="case" aria-labelledby="attention-case-title">
                    <div className="container">
                        <SectionHeading label={c.case.label} title={c.case.title} id="attention-case-title" light />
                        <motion.article className="attention-story" initial={prefersReducedMotion ? false : { opacity: 0, y: 46 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.16 }} transition={{ duration: 0.7, ease: EASE }}>
                            <header><span>{c.case.chartLabel}</span><strong className="type-display">240</strong></header>
                            <div className="attention-story__body">
                                <div className="attention-story__chart">
                                    <div className="attention-story__scale" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
                                    <div className="attention-story__bars">
                                        {c.chart.stages.map(([label, value], index) => (
                                            <div key={label} className={index === 1 ? 'is-key' : ''}>
                                                {index === 1 && <motion.em initial={prefersReducedMotion ? false : { opacity: 0, x: -16, rotate: -8 }} whileInView={{ opacity: 1, x: 0, rotate: -3 }} viewport={{ once: true }} transition={{ delay: 0.78, duration: 0.5, ease: EASE }}>{c.case.drop}</motion.em>}
                                                <motion.i style={{ '--value': `${value}%` }} initial={prefersReducedMotion ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.78, delay: index * 0.12, ease: EASE }}><b>{value}%</b></motion.i>
                                                <motion.span initial={prefersReducedMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.42 + index * 0.12 }}>{label}</motion.span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <motion.aside initial={prefersReducedMotion ? false : { clipPath: 'inset(100% 0 0 0)' }} whileInView={{ clipPath: 'inset(0% 0 0 0)' }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.75, delay: 0.25, ease: EASE }}><span>FOCUS / 01</span><h3>{c.case.reading}</h3></motion.aside>
                            </div>
                            <footer>{c.case.facts.map(([value, label], index) => <motion.div key={value} initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.12, duration: 0.5, ease: EASE }}><strong className="type-display">{value}</strong><span>{label}</span></motion.div>)}</footer>
                        </motion.article>
                        <motion.article className="attention-effect" initial={prefersReducedMotion ? false : { opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.45 }} transition={{ duration: 0.65, ease: EASE }}>
                            <div><span>{c.case.before}</span><strong className="type-display">41%</strong><i><motion.b style={{ '--value': '41%' }} initial={prefersReducedMotion ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} /></i></div>
                            <div className="is-after"><span>{c.case.after}</span><strong className="type-display">58%</strong><i><motion.b style={{ '--value': '58%' }} initial={prefersReducedMotion ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.18, ease: EASE }} /></i></div>
                            <p><Sparkles size={19} />{c.case.effect}</p>
                        </motion.article>
                    </div>
                </section>

                <section className="attention-lab-section attention-production" aria-labelledby="attention-stack-title">
                    <div className="container">
                        <SectionHeading label={c.stackLabel} title={c.stackTitle} id="attention-stack-title" />
                        <motion.div className="attention-production__workspace" initial={prefersReducedMotion ? false : { opacity: 0, y: 44 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.68, ease: EASE }}>
                            <nav aria-label={c.stackTitle}>{c.outputs.map((item, index) => { const Icon = item.icon; return <motion.button type="button" className={output === item.id ? 'is-active' : ''} aria-pressed={output === item.id} onClick={() => setOutput(item.id)} key={item.id} whileHover={prefersReducedMotion ? undefined : { x: 6 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}><span>0{index + 1}</span><Icon size={22} /><strong>{item.title}</strong><ArrowRight size={18} /></motion.button>; })}</nav>
                            <AnimatePresence mode="wait">
                                <motion.article key={selectedOutput.id} initial={prefersReducedMotion ? false : { opacity: 0, x: 34 }} animate={{ opacity: 1, x: 0 }} exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }} transition={{ duration: 0.38, ease: EASE }}>
                                    <span>{c.selectedEngine}</span>
                                    <h3 className="type-display">{selectedOutput.engine}</h3>
                                    <div className="attention-production__route"><span>{c.recipe}</span><ol>{selectedOutput.route.split('→').map((step, index) => <motion.li key={step} initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}>{step.trim()}</motion.li>)}</ol></div>
                                    <aside><Check size={20} /><p><strong>{c.quality}</strong>{selectedOutput.control}</p></aside>
                                    <motion.button type="button" onClick={copyBrief} whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}>{copied ? <Check size={19} /> : <Clipboard size={19} />}{copied ? c.copied : c.copyRecipe}</motion.button>
                                </motion.article>
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </section>

                <section className="attention-lab-section attention-index" aria-labelledby="attention-refs-title">
                    <div className="container">
                        <SectionHeading label={c.refsLabel} title={c.refsTitle} id="attention-refs-title" light />
                        <motion.aside className="attention-index__shelf" initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.55, ease: EASE }} layout>
                            <BookOpen size={22} /><strong>{c.shelf}</strong><motion.span key={savedReferenceCards.length} initial={prefersReducedMotion ? false : { scale: 0.5 }} animate={{ scale: 1 }}>{savedReferenceCards.length}</motion.span><p>{savedReferenceCards.length > 0 ? savedReferenceCards.map(item => item.title).join(' · ') : c.shelfEmpty}</p>
                        </motion.aside>
                        <div className="attention-index__list">{c.refs.map((item, index) => { const isSaved = savedRefs.includes(item.id); return <motion.article className={isSaved ? 'is-saved' : ''} key={item.id} initial={prefersReducedMotion ? false : { opacity: 0, x: index % 2 === 0 ? -28 : 28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.45 }} transition={{ duration: 0.5, delay: index * 0.045, ease: EASE }} whileHover={prefersReducedMotion ? undefined : { x: 7 }}><span>0{index + 1}</span><div><small>{item.tag}</small><h3>{item.title}</h3></div><p>{item.text}</p><motion.button type="button" className={isSaved ? 'is-saved' : ''} onClick={() => toggleReference(item.id)} whileTap={prefersReducedMotion ? undefined : { scale: 0.93 }}>{isSaved && <Check size={17} />}{isSaved ? c.saved : c.save}</motion.button><a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} — ${item.tag}`}><ExternalLink size={19} /></a></motion.article>; })}</div>
                    </div>
                </section>

                <section className="attention-lab-section attention-toolkit" aria-labelledby="attention-tools-title">
                    <div className="container">
                        <SectionHeading label={c.toolsLabel} title={c.toolsTitle} id="attention-tools-title" />
                        <div className="attention-toolkit__list">{c.tools.map((item, index) => { const Icon = item.icon; const isCopied = copiedTool === item.title; return <motion.article key={item.title} initial={prefersReducedMotion ? false : { opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.55, delay: index * 0.1, ease: EASE }} whileHover={prefersReducedMotion ? undefined : { y: -5 }}><span>0{index + 1}</span><Icon size={24} /><div><small>{item.tag}</small><h3>{item.title}</h3><p>{item.text}</p></div><button className="attention-toolkit__command" type="button" onClick={() => copyToolCommand(item)} aria-label={`${c.copyCommand}: ${item.title}`}><code>{item.code}</code>{isCopied ? <Check size={18} /> : <Clipboard size={18} />}<em>{isCopied ? c.commandCopied : c.copyCommand}</em></button><a href={item.href} target="_blank" rel="noopener noreferrer">GitHub <ExternalLink size={18} /></a></motion.article>; })}</div>
                    </div>
                </section>

                <motion.section className="attention-lab-close" initial={prefersReducedMotion ? false : { clipPath: 'inset(18% 8% 18% 8%)' }} whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, ease: EASE }}><div className="container"><span><Code2 size={23} /> UX / UI · DATA</span><h2 className="type-display">{c.closeTitle}</h2><motion.a className="attention-lab-button is-primary" href="/#contact" whileHover={prefersReducedMotion ? undefined : { y: -4 }}>{c.closeAction} <ArrowRight size={20} /></motion.a></div></motion.section>
            </main>
        </div>
    );
}
