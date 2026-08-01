import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    Bot,
    Check,
    Code2,
    Database,
    FileCheck2,
    FileSignature,
    FileText,
    Gauge,
    Layers3,
    MessageCircle,
    MonitorSmartphone,
    Rocket,
    ShieldCheck,
    Sparkles,
    Workflow,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import './CreatorPage.css';

const COPY = {
    ru: {
        eyebrow: 'Портфолио продуктовой команды',
        title: 'Создаём цифровые продукты от идеи до стабильного релиза',
        lead: 'Проектируем интерфейсы, пишем frontend и backend, подключаем AI и автоматизацию, выпускаем web- и desktop-приложения.',
        discuss: 'Обсудить проект',
        cases: 'Смотреть работы',
        proof: [
            ['5+', 'собственных продуктов'],
            ['Web · Desktop · Bots', 'единый контур разработки'],
            ['$30 / час', 'ставка команды'],
            ['Спринтами', 'результат каждой итерации'],
        ],
        capabilitiesLabel: '01 / Возможности',
        capabilitiesTitle: 'Команда закрывает продукт целиком',
        capabilitiesLead: 'Одна связка специалистов отвечает за пользовательский путь, код, данные, инфраструктуру и выпуск.',
        capabilities: [
            ['Продукт и UX', 'Собираем сценарии, проектируем путь пользователя и превращаем требования в понятный интерфейс.'],
            ['Frontend', 'Создаём адаптивные React-интерфейсы, дизайн-системы и интерактивные продуктовые экраны.'],
            ['Backend и AI', 'Разрабатываем API, базы данных, Telegram-ботов, платежи и управляемые AI-функции.'],
            ['Desktop', 'Выпускаем Electron-приложения с локальными данными, системными интеграциями и обновлениями.'],
            ['Данные', 'Строим парсеры, расписания, потоки обработки данных и настраиваемые уведомления.'],
            ['Релиз', 'Настраиваем инфраструктуру, проверки, публикацию, наблюдаемость и поддержку продукта.'],
        ],
        casesLabel: '02 / Выпущенные продукты',
        casesTitle: 'Работа, которую можно открыть',
        casesLead: 'Каждый кейс живёт в продакшене и показывает реальный инженерный результат команды.',
        productCases: [
            {
                name: 'Memora BDayBot',
                type: 'Telegram · Python · PostgreSQL · AI',
                text: 'Личные напоминания, контекстные поздравления, подписки, платежи и административный контур.',
                href: '/bday-bot',
            },
            {
                name: 'Memora Pomodoro',
                type: 'Electron · React · local-first',
                text: 'Таймер фокуса с системным оверлеем, локальной статистикой, сценами и полноценной веб-версией.',
                href: '/pomodoro',
            },
            {
                name: 'Travel Radar',
                type: 'React · data pipelines · CI',
                text: 'Единая лента горящих туров и билетов из Telegram-источников с регулярным обновлением данных.',
                href: '/travel-radar',
            },
        ],
        managerLabel: '03 / Менеджер проекта',
        managerName: 'Сергей',
        managerRole: 'Project manager · Memora Solutions',
        managerLead: 'Сергей соединяет задачу заказчика и работу команды в один прозрачный процесс.',
        managerItems: [
            'собирает контекст и критерии приёмки',
            'держит план, сроки и бюджет спринта',
            'организует демонстрации и рабочую коммуникацию',
            'передаёт результат, отчёт и комплект документов',
        ],
        processLabel: '04 / Процесс',
        processTitle: 'От задачи к работающей версии',
        processLead: 'Каждый этап заканчивается конкретным результатом, который можно проверить и принять.',
        process: [
            ['01', 'Разбор', 'Задача, пользователи, ограничения и критерии готовности.'],
            ['02', 'Спринт', 'Объём, оценка в часах, команда и дата демонстрации.'],
            ['03', 'Разработка', 'Интерфейс, код, интеграции, проверки и промежуточные показы.'],
            ['04', 'Передача', 'Релиз, отчёт, документы и согласованный следующий шаг.'],
        ],
        offerLabel: '05 / Условия работы',
        offerTitle: '$30 в час за работу команды',
        offerLead: 'До старта спринта фиксируем цель, оценку, состав результата и порядок приёмки.',
        standardTitle: 'Полная предоплата',
        standardPrice: '$30 / час',
        standardItems: [
            'оплата согласованного спринта перед стартом',
            'разработка, проверка и демонстрация входят в спринт',
            'следующий спринт формируется после приёмки результата',
        ],
        flexibleTitle: 'Частичная предоплата',
        flexiblePrice: '$39 / час',
        flexibleNote: '+30% к базовой ставке',
        flexibleItems: [
            'частичная оплата перед стартом',
            'остаток привязывается к сроку или показателю дохода',
            'сумма, триггер и крайняя дата закрепляются в договоре',
        ],
        offerFootnote: 'Итоговая оценка отражает объём и определённость задачи. Сервисы, лицензии и инфраструктура согласуются отдельной строкой.',
        docsLabel: '06 / Клиентский комплект',
        docsTitle: 'Документы проекта в одном месте',
        docsLead: 'Для каждого проекта формируется комплект с едиными данными, этапами, ответственностью и результатами.',
        documents: [
            ['Коммерческое предложение', 'Объём, состав команды, оценка, этапы и бюджет.'],
            ['Шаблон отчёта', 'Цели спринта, готовые функции, проверки, решения и следующий шаг.'],
            ['Договор', 'Предмет, права, порядок оплаты, сроки и ответственность сторон.'],
            ['Акт приёмки-передачи', 'Переданный результат, объём и подтверждение приёмки.'],
        ],
        documentAction: 'Получить у Сергея',
        contactTitle: 'Соберём первый спринт под вашу задачу',
        contactText: 'Пришлите контекст и желаемый результат. Сергей вернётся с вопросами, составом первого спринта и предварительной оценкой.',
        contactButton: 'Написать Сергею',
    },
    en: {
        eyebrow: 'Product team portfolio',
        title: 'We build digital products from idea to stable release',
        lead: 'We design interfaces, build frontend and backend systems, integrate AI and automation, and ship web and desktop applications.',
        discuss: 'Discuss a project',
        cases: 'View our work',
        proof: [
            ['5+', 'products built in-house'],
            ['Web · Desktop · Bots', 'one delivery system'],
            ['$30 / hour', 'team rate'],
            ['Sprint delivery', 'an outcome each iteration'],
        ],
        capabilitiesLabel: '01 / Capabilities',
        capabilitiesTitle: 'One team covers the full product',
        capabilitiesLead: 'A connected group of specialists owns the user journey, code, data, infrastructure, and release.',
        capabilities: [
            ['Product and UX', 'We shape scenarios, design the user journey, and turn requirements into a clear interface.'],
            ['Frontend', 'We create responsive React interfaces, design systems, and interactive product screens.'],
            ['Backend and AI', 'We build APIs, databases, Telegram bots, payments, and controlled AI features.'],
            ['Desktop', 'We ship Electron apps with local data, system integrations, and updates.'],
            ['Data', 'We build parsers, schedules, data pipelines, and configurable notifications.'],
            ['Release', 'We set up infrastructure, testing, publishing, observability, and product support.'],
        ],
        casesLabel: '02 / Shipped products',
        casesTitle: 'Work you can open',
        casesLead: 'Every case runs in production and demonstrates a real engineering outcome.',
        productCases: [
            { name: 'Memora BDayBot', type: 'Telegram · Python · PostgreSQL · AI', text: 'Personal reminders, contextual messages, subscriptions, payments, and admin operations.', href: '/bday-bot' },
            { name: 'Memora Pomodoro', type: 'Electron · React · local-first', text: 'A focus timer with system overlay, local statistics, animated scenes, and a complete web version.', href: '/pomodoro' },
            { name: 'Travel Radar', type: 'React · data pipelines · CI', text: 'One regularly updated feed of last-minute tours and tickets collected from Telegram sources.', href: '/travel-radar' },
        ],
        managerLabel: '03 / Project manager',
        managerName: 'Sergey',
        managerRole: 'Project manager · Memora Solutions',
        managerLead: 'Sergey connects the client objective and the team’s work in one transparent process.',
        managerItems: [
            'collects context and acceptance criteria',
            'owns the sprint plan, timing, and budget',
            'organises demos and working communication',
            'delivers the result, report, and document set',
        ],
        processLabel: '04 / Process',
        processTitle: 'From task to working release',
        processLead: 'Every stage ends with a concrete outcome ready for review and acceptance.',
        process: [
            ['01', 'Discovery', 'Objective, users, constraints, and acceptance criteria.'],
            ['02', 'Sprint', 'Scope, hour estimate, team, and demo date.'],
            ['03', 'Development', 'Interface, code, integrations, testing, and progress demos.'],
            ['04', 'Delivery', 'Release, report, documents, and an agreed next step.'],
        ],
        offerLabel: '05 / Engagement',
        offerTitle: '$30 per team hour',
        offerLead: 'Before each sprint, we define the goal, estimate, deliverables, and acceptance flow.',
        standardTitle: 'Full prepayment',
        standardPrice: '$30 / hour',
        standardItems: ['payment for the agreed sprint before kickoff', 'development, QA, and demo included', 'the next sprint is formed after acceptance'],
        flexibleTitle: 'Partial prepayment',
        flexiblePrice: '$39 / hour',
        flexibleNote: '30% above the base rate',
        flexibleItems: ['partial payment before kickoff', 'the balance is tied to a date or revenue metric', 'amount, trigger, and deadline are recorded in the agreement'],
        offerFootnote: 'The estimate reflects scope and clarity. Services, licenses, and infrastructure are agreed as separate items.',
        docsLabel: '06 / Client kit',
        docsTitle: 'Project documents in one place',
        docsLead: 'Every project receives a coordinated set of terms, milestones, responsibilities, and outcomes.',
        documents: [
            ['Commercial proposal', 'Scope, team composition, estimate, stages, and budget.'],
            ['Report template', 'Sprint goals, delivered features, checks, decisions, and next step.'],
            ['Agreement', 'Scope, rights, payment flow, timing, and responsibilities.'],
            ['Acceptance certificate', 'Delivered result, scope, and acceptance confirmation.'],
        ],
        documentAction: 'Request from Sergey',
        contactTitle: 'Let’s shape the first sprint for your project',
        contactText: 'Send the context and desired outcome. Sergey will return with questions, a first-sprint outline, and a preliminary estimate.',
        contactButton: 'Message Sergey',
    },
};

const capabilityIcons = [Layers3, Code2, Bot, MonitorSmartphone, Database, Workflow];
const documentIcons = [FileText, FileCheck2, FileSignature, ShieldCheck];
const TELEGRAM_URL = 'https://t.me/MemoraSolutions';

export default function CreatorPage() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const c = COPY[lang];

    return (
        <div className="portfolio-page">
            <header className="portfolio-hero">
                <div className="portfolio-hero__glow" aria-hidden="true" />
                <div className="portfolio-hero__grid" aria-hidden="true" />
                <div className="container portfolio-hero__inner">
                    <motion.div
                        className="portfolio-hero__copy"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <span className="portfolio-eyebrow"><Sparkles size={14} /> {c.eyebrow}</span>
                        <h1>{c.title}</h1>
                        <p>{c.lead}</p>
                        <div className="portfolio-hero__actions">
                            <a className="portfolio-button portfolio-button--primary" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                                <MessageCircle size={17} /> {c.discuss}
                            </a>
                            <a className="portfolio-button portfolio-button--ghost" href="#cases">
                                {c.cases} <ArrowRight size={16} />
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        className="portfolio-showcase"
                        initial={{ opacity: 0, y: 34 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="portfolio-showcase__top">
                            <span>MEMORA / LIVE PRODUCTS</span>
                            <i>3 ONLINE</i>
                        </div>
                        {c.productCases.map((item, index) => (
                            <a href={item.href} key={item.name} className="portfolio-showcase__item">
                                <span>0{index + 1}</span>
                                <div><strong>{item.name}</strong><small>{item.type}</small></div>
                                <ArrowRight size={15} />
                            </a>
                        ))}
                    </motion.div>
                </div>
            </header>

            <section className="portfolio-proof">
                <div className="container portfolio-proof__grid">
                    {c.proof.map(([value, label]) => (
                        <div key={value}><strong>{value}</strong><span>{label}</span></div>
                    ))}
                </div>
            </section>

            <main>
                <section className="portfolio-dark-section">
                    <div className="container">
                        <AnimatedSection>
                            <div className="portfolio-section-head">
                                <span className="portfolio-kicker">{c.capabilitiesLabel}</span>
                                <h2>{c.capabilitiesTitle}</h2>
                                <p>{c.capabilitiesLead}</p>
                            </div>
                            <div className="portfolio-capabilities">
                                {c.capabilities.map(([title, text], index) => {
                                    const Icon = capabilityIcons[index];
                                    return (
                                        <article key={title}>
                                            <Icon size={20} />
                                            <h3>{title}</h3>
                                            <p>{text}</p>
                                        </article>
                                    );
                                })}
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                <section className="portfolio-light-section" id="cases">
                    <div className="container">
                        <AnimatedSection>
                            <div className="portfolio-section-head portfolio-section-head--light">
                                <span className="portfolio-kicker">{c.casesLabel}</span>
                                <h2>{c.casesTitle}</h2>
                                <p>{c.casesLead}</p>
                            </div>
                            <div className="portfolio-cases">
                                {c.productCases.map((item, index) => (
                                    <a href={item.href} key={item.name} className="portfolio-case">
                                        <span className="portfolio-case__number">0{index + 1}</span>
                                        <span className="portfolio-case__type">{item.type}</span>
                                        <h3>{item.name}</h3>
                                        <p>{item.text}</p>
                                        <span className="portfolio-case__link">{c.cases} <ArrowRight size={15} /></span>
                                    </a>
                                ))}
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                <section className="portfolio-manager-section">
                    <div className="container">
                        <AnimatedSection className="portfolio-manager">
                            <figure className="portfolio-manager__photo">
                                <img src="/sergey.jpg" alt={`${c.managerName}, ${c.managerRole}`} loading="lazy" />
                                <figcaption>{c.managerRole}</figcaption>
                            </figure>
                            <div className="portfolio-manager__copy">
                                <span className="portfolio-kicker">{c.managerLabel}</span>
                                <h2>{c.managerName}</h2>
                                <p>{c.managerLead}</p>
                                <ul>
                                    {c.managerItems.map(item => <li key={item}><Check size={15} /> {item}</li>)}
                                </ul>
                                <a className="portfolio-button portfolio-button--ghost" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                                    {c.contactButton} <ArrowRight size={16} />
                                </a>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                <section className="portfolio-light-section portfolio-process-section">
                    <div className="container">
                        <AnimatedSection>
                            <div className="portfolio-section-head portfolio-section-head--light">
                                <span className="portfolio-kicker">{c.processLabel}</span>
                                <h2>{c.processTitle}</h2>
                                <p>{c.processLead}</p>
                            </div>
                            <div className="portfolio-process">
                                {c.process.map(([number, title, text]) => (
                                    <article key={number}>
                                        <span>{number}</span>
                                        <h3>{title}</h3>
                                        <p>{text}</p>
                                    </article>
                                ))}
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                <section className="portfolio-offer-section" id="offer">
                    <div className="container">
                        <AnimatedSection>
                            <div className="portfolio-section-head">
                                <span className="portfolio-kicker">{c.offerLabel}</span>
                                <h2>{c.offerTitle}</h2>
                                <p>{c.offerLead}</p>
                            </div>
                            <div className="portfolio-pricing">
                                <article className="portfolio-price-card is-primary">
                                    <Gauge size={21} />
                                    <h3>{c.standardTitle}</h3>
                                    <strong>{c.standardPrice}</strong>
                                    <ul>{c.standardItems.map(item => <li key={item}><Check size={14} /> {item}</li>)}</ul>
                                </article>
                                <article className="portfolio-price-card">
                                    <ShieldCheck size={21} />
                                    <h3>{c.flexibleTitle}</h3>
                                    <strong>{c.flexiblePrice}</strong>
                                    <span className="portfolio-price-card__note">{c.flexibleNote}</span>
                                    <ul>{c.flexibleItems.map(item => <li key={item}><Check size={14} /> {item}</li>)}</ul>
                                </article>
                            </div>
                            <p className="portfolio-offer-note">{c.offerFootnote}</p>
                        </AnimatedSection>
                    </div>
                </section>

                <section className="portfolio-documents-section" id="documents">
                    <div className="container">
                        <AnimatedSection>
                            <div className="portfolio-section-head portfolio-section-head--light">
                                <span className="portfolio-kicker">{c.docsLabel}</span>
                                <h2>{c.docsTitle}</h2>
                                <p>{c.docsLead}</p>
                            </div>
                            <div className="portfolio-documents">
                                {c.documents.map(([title, text], index) => {
                                    const Icon = documentIcons[index];
                                    return (
                                        <article key={title}>
                                            <div className="portfolio-document__top"><Icon size={20} /><span>0{index + 1}</span></div>
                                            <h3>{title}</h3>
                                            <p>{text}</p>
                                            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                                                {c.documentAction} <ArrowRight size={14} />
                                            </a>
                                        </article>
                                    );
                                })}
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                <section className="portfolio-contact-section">
                    <div className="container">
                        <AnimatedSection className="portfolio-contact">
                            <Rocket size={28} />
                            <div><h2>{c.contactTitle}</h2><p>{c.contactText}</p></div>
                            <a className="portfolio-button portfolio-button--primary" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                                {c.contactButton} <ArrowRight size={16} />
                            </a>
                        </AnimatedSection>
                    </div>
                </section>
            </main>
        </div>
    );
}
