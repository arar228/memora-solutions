import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
        heroTitle: 'Показываем данные так, чтобы решение стало очевидным',
        heroText: 'Каждый экран начинается с вопроса: что человек должен заметить, сравнить и сделать дальше. Здесь — живые примеры, рабочий стек и библиотека команды.',
        heroMeta: ['Живая инфографика', 'Проверяемый стек', 'Библиотека референсов'],
        playgroundLabel: '01 / Форма следует вопросу',
        playgroundTitle: 'Один набор данных. Четыре способа прочитать историю.',
        playgroundText: 'Переключайте задачу — композиция, акцент и пояснение перестраиваются вместе.',
        modes: [
            { id: 'deviation', label: 'Отклонение', question: 'Где результат вышел за ориентир?', form: 'Diverging bars', insight: 'Общая нулевая ось мгновенно разделяет рост и снижение.' },
            { id: 'ranking', label: 'Рейтинг', question: 'Что лидирует и насколько?', form: 'Sorted bars', insight: 'Сортировка превращает поиск лидера в первое движение взгляда.' },
            { id: 'flow', label: 'Поток', question: 'Куда переходит внимание?', form: 'Flow map', insight: 'Толщина связи показывает объём, а подписи фиксируют этап решения.' },
            { id: 'whole', label: 'Состав', question: 'Из чего складывается результат?', form: 'Proportional bar', insight: 'Единая длина помогает точно сравнить доли и сохранить контекст целого.' },
        ],
        chart: {
            deviationTitle: 'Изменение конверсии после редизайна',
            rankingTitle: 'Сигналы, которые удерживают внимание',
            flowTitle: 'Путь от первого экрана к действию',
            wholeTitle: 'Состав времени на принятие решения',
            benchmark: 'ориентир',
            deviation: [['Навигация', 18], ['Карточка', 11], ['Форма', -7], ['CTA', 24]],
            ranking: [['Ясный вывод', 92], ['Контраст', 78], ['Ритм', 64], ['Детали', 41]],
            flow: ['Вход', 'Смысл', 'Доверие', 'Действие'],
            whole: [['Сканирование', 18], ['Сравнение', 32], ['Проверка', 28], ['Выбор', 22]],
        },
        anatomy: [
            ['01', 'Вопрос', 'Фиксируем решение, которое должен принять читатель.'],
            ['02', 'Кодирование', 'Отдаём положению и длине самые точные сравнения.'],
            ['03', 'Акцент', 'Один цвет ведёт к ключевому сигналу.'],
            ['04', 'Вывод', 'Подпись завершает историю конкретным наблюдением.'],
        ],
        stackLabel: '02 / Производственный стек',
        stackTitle: 'Выберите результат — получите рабочий маршрут',
        stackText: 'Карточка собирает движок, формат и контроль качества в короткий бриф для команды или агента.',
        outputs: [
            { id: 'data', title: 'Диаграмма по данным', note: 'Повторяемая схема и серия графиков', engine: 'Vega-Lite / Altair', route: 'JSON spec → schema check → vl-convert → SVG / PNG', why: 'Декларативная спецификация делает структуру прозрачной, а результат — воспроизводимым.', control: 'Проверка схемы, шкал, подписей, палитры и экспорта.', icon: BarChart3 },
            { id: 'poster', title: 'Редакционный плакат', note: 'Свободная композиция и типографика', engine: 'SVG → resvg / CairoSVG', route: 'Сетка → типографика → SVG → 1080 × 1350 PNG', why: 'Прямая работа с композицией даёт точный контроль над ритмом, иконками и подписями.', control: 'Проверка размеров, шрифтов, контраста и краёв кадра.', icon: FileImage },
            { id: 'web', title: 'Интерактив для сайта', note: 'Hover, фильтры и исследование данных', engine: 'Observable Plot', route: 'Data → marks / scales → interaction → SVG / HTML', why: 'Слои, шкалы и трансформации собираются кратко; D3 дополняет маршрут для уникальной геометрии.', control: 'Клавиатура, touch, подсказки, responsive и reduced motion.', icon: MonitorPlay },
            { id: 'pandas', title: 'Отчёт из pandas', note: 'Короткий путь от таблицы к экспорту', engine: 'matplotlib + .mplstyle', route: 'pandas → chart function → brand.mplstyle → SVG / PNG', why: 'Фирменный стиль живёт в одном файле и применяется ко всей серии отчётов.', control: 'Единицы, пропуски, диапазоны осей и читаемость подписей.', icon: Table2 },
        ],
        recipe: 'Маршрут сборки',
        quality: 'Контроль качества',
        copyRecipe: 'Скопировать бриф',
        copied: 'Бриф скопирован',
        refsLabel: '03 / Библиотека решений',
        refsTitle: 'Референсы, которые помогают выбрать форму',
        refsText: 'Добавляйте источники в подборку — выбор сохранится в этом браузере и станет стартовой точкой для следующего брифа.',
        refs: [
            { id: 'ft', title: 'FT Visual Vocabulary', tag: 'Выбор формы', text: 'Карта задач: deviation, correlation, ranking, part-to-whole, flow и другие паттерны.', href: 'https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary', tone: 'cyan' },
            { id: 'pudding', title: 'The Pudding starter', tag: 'Визуальное эссе', text: 'Структура data-driven истории, скроллителлинг и проектный каркас.', href: 'https://github.com/the-pudding/svelte-starter', tone: 'violet' },
            { id: 'data-viz', title: 'From Data to Viz', tag: 'Структура данных', text: 'Навигатор от формата датасета к подходящему семейству графиков.', href: 'https://www.data-to-viz.com/', tone: 'lime' },
            { id: 'vega', title: 'Vega-Lite Examples', tag: 'Спека + код', text: 'Официальная галерея для быстрых прототипов и few-shot примеров.', href: 'https://vega.github.io/vega-lite/examples/', tone: 'gold' },
            { id: 'python', title: 'Python Graph Gallery', tag: 'Python', text: 'Примеры с исходниками для matplotlib, seaborn и смежных инструментов.', href: 'https://python-graph-gallery.com/', tone: 'coral' },
            { id: 'd3', title: 'D3 Graph Gallery', tag: 'Уникальная геометрия', text: 'Готовые паттерны для кастомных интерактивных визуализаций.', href: 'https://d3-graph-gallery.com/', tone: 'blue' },
        ],
        save: 'Добавить в подборку',
        saved: 'В подборке',
        shelf: 'Подборка проекта',
        shelfEmpty: 'Добавьте первый референс — он появится здесь как часть будущего брифа.',
        readyLabel: '04 / Быстрый старт',
        readyTitle: 'Инструменты, которые превращают подход в повторяемый процесс',
        readyText: 'Три способа передать выбор формы, рендер и стандарты между агентами и проектами.',
        tools: [
            { title: 'AntV MCP Chart', tag: '25+ форм', text: 'MCP-сервер генерирует диаграммы, mind map, network graph, treemap и другие формы.', code: 'npx -y @antv/mcp-server-chart', href: 'https://github.com/antvis/mcp-server-chart', icon: Boxes },
            { title: 'Anthropic Skills', tag: 'Шаблон навыка', text: 'Папка с SKILL.md, инструкциями и ресурсами превращает практику в повторяемый навык.', code: '/plugin marketplace add anthropics/skills', href: 'https://github.com/anthropics/skills', icon: BookOpen },
            { title: 'OpenSkills', tag: 'Переносимость', text: 'Один пакет навыка подключается к разным coding-агентам через универсальный формат.', code: 'npx openskills install <source> --universal', href: 'https://github.com/numman-ali/openskills', icon: Layers },
        ],
        closeTitle: 'Начнём следующий проект с вопроса к данным',
        closeText: 'Выбранная форма и сохранённые референсы уже складываются в основу визуального брифа.',
        closeAction: 'Обсудить проект',
    },
    en: {
        back: 'Back to portfolio', heroLabel: 'Memora · UX / UI practice', heroTitle: 'We show data so the decision becomes obvious', heroText: 'Every screen starts with a question: what should a person notice, compare, and do next? Explore live examples, a working stack, and the team library.', heroMeta: ['Live infographics', 'Verifiable stack', 'Reference library'],
        playgroundLabel: '01 / Form follows the question', playgroundTitle: 'One dataset. Four ways to read the story.', playgroundText: 'Switch the task and watch composition, emphasis, and annotation move together.',
        modes: [
            { id: 'deviation', label: 'Deviation', question: 'Where did the result cross the benchmark?', form: 'Diverging bars', insight: 'A shared zero line separates growth and decline in one glance.' },
            { id: 'ranking', label: 'Ranking', question: 'What leads, and by how much?', form: 'Sorted bars', insight: 'Sorting makes the leader the eye’s first destination.' },
            { id: 'flow', label: 'Flow', question: 'Where does attention move?', form: 'Flow map', insight: 'Connection weight shows volume while labels anchor each decision stage.' },
            { id: 'whole', label: 'Composition', question: 'What makes up the result?', form: 'Proportional bar', insight: 'A shared length supports accurate shares while preserving the whole.' },
        ],
        chart: { deviationTitle: 'Conversion change after redesign', rankingTitle: 'Signals that hold attention', flowTitle: 'From first screen to action', wholeTitle: 'Decision-time composition', benchmark: 'benchmark', deviation: [['Navigation', 18], ['Card', 11], ['Form', -7], ['CTA', 24]], ranking: [['Clear takeaway', 92], ['Contrast', 78], ['Rhythm', 64], ['Detail', 41]], flow: ['Entry', 'Meaning', 'Trust', 'Action'], whole: [['Scan', 18], ['Compare', 32], ['Verify', 28], ['Choose', 22]] },
        anatomy: [['01', 'Question', 'Name the decision the reader needs to make.'], ['02', 'Encoding', 'Give position and length the most precise comparisons.'], ['03', 'Emphasis', 'Use one colour to guide the eye to the key signal.'], ['04', 'Takeaway', 'Close the story with a concrete observation.']],
        stackLabel: '02 / Production stack', stackTitle: 'Choose the output and get a working route', stackText: 'The card assembles engine, format, and quality control into a concise brief for a team or agent.',
        outputs: [
            { id: 'data', title: 'Data chart', note: 'Repeatable spec and chart series', engine: 'Vega-Lite / Altair', route: 'JSON spec → schema check → vl-convert → SVG / PNG', why: 'A declarative specification keeps structure transparent and output reproducible.', control: 'Validate schema, scales, labels, palette, and export.', icon: BarChart3 },
            { id: 'poster', title: 'Editorial poster', note: 'Free composition and typography', engine: 'SVG → resvg / CairoSVG', route: 'Grid → typography → SVG → 1080 × 1350 PNG', why: 'Direct composition offers precise control over rhythm, icons, and labels.', control: 'Verify dimensions, fonts, contrast, and frame edges.', icon: FileImage },
            { id: 'web', title: 'Web interaction', note: 'Hover, filters, and exploration', engine: 'Observable Plot', route: 'Data → marks / scales → interaction → SVG / HTML', why: 'Marks, scales, and transforms stay concise; D3 extends the route for unique geometry.', control: 'Keyboard, touch, tooltips, responsive layout, and reduced motion.', icon: MonitorPlay },
            { id: 'pandas', title: 'Pandas report', note: 'Short route from table to export', engine: 'matplotlib + .mplstyle', route: 'pandas → chart function → brand.mplstyle → SVG / PNG', why: 'One style file carries the brand across a complete report series.', control: 'Units, missing values, axis ranges, and label legibility.', icon: Table2 },
        ],
        recipe: 'Build route', quality: 'Quality control', copyRecipe: 'Copy brief', copied: 'Brief copied',
        refsLabel: '03 / Decision library', refsTitle: 'References that help choose the form', refsText: 'Add sources to the project shelf. The selection stays in this browser and becomes the next brief’s starting point.',
        refs: [
            { id: 'ft', title: 'FT Visual Vocabulary', tag: 'Form choice', text: 'A task map for deviation, correlation, ranking, part-to-whole, flow, and more.', href: 'https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary', tone: 'cyan' },
            { id: 'pudding', title: 'The Pudding starter', tag: 'Visual essay', text: 'A structure for data-driven stories, scrollytelling, and project setup.', href: 'https://github.com/the-pudding/svelte-starter', tone: 'violet' },
            { id: 'data-viz', title: 'From Data to Viz', tag: 'Data structure', text: 'A navigator from dataset structure to a suitable chart family.', href: 'https://www.data-to-viz.com/', tone: 'lime' },
            { id: 'vega', title: 'Vega-Lite Examples', tag: 'Spec + code', text: 'The official gallery for rapid prototypes and few-shot examples.', href: 'https://vega.github.io/vega-lite/examples/', tone: 'gold' },
            { id: 'python', title: 'Python Graph Gallery', tag: 'Python', text: 'Source-backed examples for matplotlib, seaborn, and related tools.', href: 'https://python-graph-gallery.com/', tone: 'coral' },
            { id: 'd3', title: 'D3 Graph Gallery', tag: 'Unique geometry', text: 'Starting patterns for custom interactive visualizations.', href: 'https://d3-graph-gallery.com/', tone: 'blue' },
        ],
        save: 'Add to shelf', saved: 'On the shelf', shelf: 'Project shelf', shelfEmpty: 'Add the first reference and it will appear here as part of the next brief.',
        readyLabel: '04 / Quick start', readyTitle: 'Tools that turn the approach into a repeatable process', readyText: 'Three ways to carry chart choice, rendering, and standards across agents and projects.',
        tools: [
            { title: 'AntV MCP Chart', tag: '25+ forms', text: 'An MCP server for charts, mind maps, network graphs, treemaps, and more.', code: 'npx -y @antv/mcp-server-chart', href: 'https://github.com/antvis/mcp-server-chart', icon: Boxes },
            { title: 'Anthropic Skills', tag: 'Skill template', text: 'A folder with SKILL.md, instructions, and resources turns practice into a reusable skill.', code: '/plugin marketplace add anthropics/skills', href: 'https://github.com/anthropics/skills', icon: BookOpen },
            { title: 'OpenSkills', tag: 'Portability', text: 'One skill package connects to multiple coding agents through a universal format.', code: 'npx openskills install <source> --universal', href: 'https://github.com/numman-ali/openskills', icon: Layers },
        ],
        closeTitle: 'Start the next project with a question for the data', closeText: 'The selected form and saved references already shape a visual brief.', closeAction: 'Discuss a project',
    },
};

export default function AttentionLabPage() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const c = COPY[lang];
    const [output, setOutput] = useState('data');
    const [copied, setCopied] = useState(false);
    const [savedRefs, setSavedRefs] = useState(() => {
        try { return JSON.parse(localStorage.getItem(SAVED_REFERENCES_KEY) || '[]'); } catch { return []; }
    });
    const selectedOutput = c.outputs.find(item => item.id === output);
    const heroCase = lang === 'ru' ? {
        label: 'Живой разбор · 240 сессий',
        title: 'Где пользователь теряет решение',
        stages: [['Увидел предложение', 100], ['Понял ценность', 72], ['Сравнил варианты', 54], ['Выбрал действие', 41]],
        insight: 'Главная потеря — первые 12 секунд: ценность считывают 72% пользователей.',
    } : {
        label: 'Live case · 240 sessions',
        title: 'Where the user loses the decision',
        stages: [['Saw the offer', 100], ['Understood value', 72], ['Compared options', 54], ['Chose an action', 41]],
        insight: 'The main drop happens in the first 12 seconds: 72% understand the value.',
    };
    const caseStory = lang === 'ru' ? {
        label: '01 / Демонстрационный кейс',
        title: 'Между «понял» и «выбрал» исчезает 31% аудитории',
        intro: 'Берём один пользовательский путь и превращаем цифры в аргумент: показываем масштаб потери, момент её появления и эффект от изменения интерфейса.',
        chartLabel: 'Путь решения · доля от входа',
        drop: '−28 п.п. за первые 12 секунд',
        reading: 'Первый экран объясняет продукт, но оставляет сравнение на пользователя. Здесь нужен один доминирующий критерий выбора.',
        facts: [['12 сек.', 'до первого осмысленного действия'], ['31 п.п.', 'теряются после понимания ценности'], ['+17 п.п.', 'даёт один критерий выбора в тестовом сценарии']],
        before: 'Исходный путь',
        after: 'Путь с фокусом',
        effect: 'Один визуальный акцент поднимает действие с 41% до 58%',
        question: 'Где пользователь теряет решение и какой визуальный сигнал возвращает его к действию?',
    } : {
        label: '01 / Demonstration case',
        title: '31% of the audience disappears between “understood” and “chose”',
        intro: 'We turn one user journey into an argument: show the scale of the loss, the moment it appears, and the effect of an interface change.',
        chartLabel: 'Decision path · share of entry',
        drop: '−28 pp in the first 12 seconds',
        reading: 'The first screen explains the product while comparison remains with the user. One dominant decision criterion creates focus.',
        facts: [['12 sec.', 'to the first meaningful action'], ['31 pp', 'lost after value is understood'], ['+17 pp', 'from one decision criterion in the test scenario']],
        before: 'Original path',
        after: 'Focused path',
        effect: 'One visual emphasis lifts action from 41% to 58%',
        question: 'Where does the user lose the decision, and which visual signal brings them back to action?',
    };
    const savedReferenceCards = useMemo(() => c.refs.filter(item => savedRefs.includes(item.id)), [c.refs, savedRefs]);

    useEffect(() => { localStorage.setItem(SAVED_REFERENCES_KEY, JSON.stringify(savedRefs)); }, [savedRefs]);

    const toggleReference = id => setSavedRefs(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    const copyBrief = async () => {
        const brief = `${caseStory.question}\n${selectedOutput.engine}\n${selectedOutput.route}\n${selectedOutput.control}`;
        try {
            await navigator.clipboard.writeText(brief);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="attention-lab" data-typography-exempt>
            <header className="attention-lab-hero">
                <div className="attention-lab-hero__grid" aria-hidden="true" />
                <div className="container attention-lab-hero__inner">
                    <Link className="attention-lab-back" to="/"><ArrowLeft size={18} /> {c.back}</Link>
                    <div className="attention-lab-hero__layout">
                        <div className="attention-lab-hero__copy">
                            <span className="attention-lab-kicker"><Sparkles size={18} /> {c.heroLabel}</span>
                            <h1>{c.heroTitle}</h1>
                            <p>{c.heroText}</p>
                            <a href="#playground" className="attention-lab-button is-primary">{c.playgroundLabel.split(' / ')[1]} <ArrowRight size={20} /></a>
                        </div>
                        <div className="attention-lab-hero__preview">
                            <header><span>{heroCase.label}</span><strong>01</strong></header>
                            <h2>{heroCase.title}</h2>
                            <div className="attention-lab-hero__funnel">
                                {heroCase.stages.map(([label, value], index) => (
                                    <div key={label} className={index === 1 ? 'is-key' : ''}>
                                        <span>{label}</span>
                                        <i><b style={{ '--value': `${value}%` }} /></i>
                                        <strong>{value}%</strong>
                                    </div>
                                ))}
                            </div>
                            <p><Sparkles size={18} /> {heroCase.insight}</p>
                        </div>
                    </div>
                    <div className="attention-lab-hero__meta">{c.heroMeta.map((item, index) => <span key={item}>0{index + 1} · {item}</span>)}</div>
                </div>
            </header>

            <main>
                <section className="attention-lab-section attention-editorial" id="playground">
                    <div className="container">
                        <div className="attention-editorial__head">
                            <span>{caseStory.label}</span>
                            <div><h2>{caseStory.title}</h2><p>{caseStory.intro}</p></div>
                        </div>
                        <article className="attention-story">
                            <header><span>{caseStory.chartLabel}</span><strong>240</strong></header>
                            <div className="attention-story__body">
                                <div className="attention-story__chart">
                                    <div className="attention-story__scale" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
                                    <div className="attention-story__bars">
                                        {heroCase.stages.map(([label, value], index) => (
                                            <div key={label} className={index === 1 ? 'is-key' : ''}>
                                                {index === 1 && <em>{caseStory.drop}</em>}
                                                <i style={{ '--value': `${value}%` }}><b>{value}%</b></i>
                                                <span>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <aside><span>READING / 01</span><p>{caseStory.reading}</p></aside>
                            </div>
                            <footer>{caseStory.facts.map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}</footer>
                        </article>
                        <article className="attention-effect">
                            <div><span>{caseStory.before}</span><strong>41%</strong><i><b style={{ '--value': '41%' }} /></i></div>
                            <div className="is-after"><span>{caseStory.after}</span><strong>58%</strong><i><b style={{ '--value': '58%' }} /></i></div>
                            <p><Sparkles size={19} />{caseStory.effect}</p>
                        </article>
                    </div>
                </section>

                <section className="attention-lab-section attention-production">
                    <div className="container">
                        <div className="attention-lab-section__head"><span>{c.stackLabel}</span><div><h2>{c.stackTitle}</h2><p>{c.stackText}</p></div></div>
                        <div className="attention-production__workspace">
                            <nav aria-label={c.stackTitle}>{c.outputs.map((item, index) => { const Icon = item.icon; return <button type="button" className={output === item.id ? 'is-active' : ''} aria-pressed={output === item.id} onClick={() => setOutput(item.id)} key={item.id}><span>0{index + 1}</span><Icon size={22} /><div><strong>{item.title}</strong><small>{item.note}</small></div><ArrowRight size={18} /></button>; })}</nav>
                            <article>
                                <span>SELECTED ENGINE</span>
                                <h3>{selectedOutput.engine}</h3>
                                <p>{selectedOutput.why}</p>
                                <div><span>{c.recipe}</span><code>{selectedOutput.route}</code></div>
                                <aside><Check size={20} /><p><strong>{c.quality}</strong>{selectedOutput.control}</p></aside>
                                <button type="button" onClick={copyBrief}>{copied ? <Check size={19} /> : <Clipboard size={19} />}{copied ? c.copied : c.copyRecipe}</button>
                            </article>
                        </div>
                    </div>
                </section>

                <section className="attention-lab-section attention-index">
                    <div className="container">
                        <div className="attention-lab-section__head"><span>{c.refsLabel}</span><div><h2>{c.refsTitle}</h2><p>{c.refsText}</p></div></div>
                        <aside className="attention-index__shelf"><BookOpen size={22} /><strong>{c.shelf}</strong><span>{savedReferenceCards.length}</span><p>{savedReferenceCards.length > 0 ? savedReferenceCards.map(item => item.title).join(' · ') : c.shelfEmpty}</p></aside>
                        <div className="attention-index__list">{c.refs.map((item, index) => { const isSaved = savedRefs.includes(item.id); return <article key={item.id}><span>0{index + 1}</span><div><small>{item.tag}</small><h3>{item.title}</h3></div><p>{item.text}</p><button type="button" className={isSaved ? 'is-saved' : ''} onClick={() => toggleReference(item.id)}>{isSaved && <Check size={17} />}{isSaved ? c.saved : c.save}</button><a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} — ${item.tag}`}><ExternalLink size={19} /></a></article>; })}</div>
                    </div>
                </section>

                <section className="attention-lab-section attention-toolkit">
                    <div className="container">
                        <div className="attention-lab-section__head"><span>{c.readyLabel}</span><div><h2>{c.readyTitle}</h2><p>{c.readyText}</p></div></div>
                        <div className="attention-toolkit__list">{c.tools.map((item, index) => { const Icon = item.icon; return <article key={item.title}><span>0{index + 1}</span><Icon size={24} /><div><small>{item.tag}</small><h3>{item.title}</h3><p>{item.text}</p></div><code>{item.code}</code><a href={item.href} target="_blank" rel="noopener noreferrer">GitHub <ExternalLink size={18} /></a></article>; })}</div>
                    </div>
                </section>

                <section className="attention-lab-close"><div className="container"><span><Code2 size={23} /> UX / UI · DATA</span><h2>{c.closeTitle}</h2><p>{c.closeText}</p><a className="attention-lab-button is-primary" href="/#contact">{c.closeAction} <ArrowRight size={20} /></a></div></section>
            </main>
        </div>
    );
}
