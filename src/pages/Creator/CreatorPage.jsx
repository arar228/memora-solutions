import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    Bot,
    Braces,
    Check,
    CloudCog,
    Code2,
    Database,
    Gauge,
    Layers3,
    MessageCircle,
    MonitorSmartphone,
    Rocket,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import './CreatorPage.css';

const COPY = {
    ru: {
        eyebrow: 'Memora Solutions · product engineering',
        title: 'Команда разработки, которая доводит идеи до работающего продукта',
        lead: 'Проектируем интерфейсы, пишем backend и автоматизации, подключаем AI, собираем desktop-приложения и отвечаем за путь до стабильного релиза.',
        discuss: 'Обсудить задачу',
        cases: 'Смотреть кейсы',
        proof: [
            ['5+', 'собственных продуктов'],
            ['Web · Desktop · Bots', 'единый инженерный контур'],
            ['React · Python · Electron', 'проверенный основной стек'],
            ['Спринтами', 'видимый результат каждую итерацию'],
        ],
        sectionWork: 'Что мы делаем',
        sectionWorkLead: 'Подключаемся как продуктовая команда: от разбора задачи и прототипа до кода, инфраструктуры и поддержки после запуска.',
        capabilities: [
            ['Продукт и UX', 'Разбираем сценарии, убираем лишнее, проектируем понятный путь пользователя и проверяем его на реальном интерфейсе.'],
            ['Frontend', 'React, адаптивные интерфейсы, дизайн-системы, интерактивная графика, производительность и доступность.'],
            ['Backend и AI', 'Python-сервисы, Telegram-боты, API, базы данных, платёжные сценарии и управляемые AI-функции.'],
            ['Desktop', 'Electron-приложения, локальное хранение, системные интеграции, обновления и сборки под разные ОС.'],
            ['Данные и автоматизация', 'Парсеры, расписания, обработка потоков данных, уведомления и устойчивые фоновые процессы.'],
            ['Релиз и надёжность', 'CI, аудит, мониторинг, восстановление проблемных проектов и контролируемая публикация без сюрпризов.'],
        ],
        sectionCases: 'Продукты, а не презентации',
        sectionCasesLead: 'Мы показываем работу на собственных продуктах: в них есть пользователи, данные, интеграции, ограничения и ответственность за результат.',
        productCases: [
            {
                name: 'Memora BDayBot',
                type: 'Telegram · Python · PostgreSQL · AI',
                text: 'Бот, который хранит важные даты, напоминает о них и помогает написать личное поздравление. Внутри — диалоги, подписки, платежи, админ-панель и контекстная генерация.',
                href: '/bday-bot',
            },
            {
                name: 'Memora Pomodoro',
                type: 'Electron · React · local-first',
                text: 'Кроссплатформенный таймер фокуса с чистым временем, системным оверлеем, локальной статистикой и полноценной веб-версией.',
                href: '/pomodoro',
            },
            {
                name: 'Travel Radar',
                type: 'React · data pipelines · CI',
                text: 'Единая лента горящих туров и билетов из Telegram-источников с автоматическим обновлением и полезными сервисами в одном рабочем пространстве.',
                href: '/travel-radar',
            },
            {
                name: 'Product Dev OS',
                type: 'Internal tooling · delivery system',
                text: 'Внутренняя система, которая связывает исследование, требования, разработку, проверку качества и выпуск продукта.',
                href: '/internal',
            },
        ],
        processTitle: 'Как устроена работа',
        processLead: 'У проекта всегда есть понятная ближайшая цель, ограниченный объём и демонстрируемый результат.',
        process: [
            ['01', 'Разбор', 'Фиксируем задачу, пользователей, ограничения и критерии готовности.'],
            ['02', 'План спринта', 'Делим работу на проверяемый объём, оцениваем часы и согласуем результат итерации.'],
            ['03', 'Разработка', 'Проектируем, пишем код, интегрируем и показываем промежуточный прогресс.'],
            ['04', 'Демо и выпуск', 'Проверяем сценарии, устраняем замечания и публикуем согласованную версию.'],
        ],
        teamTitle: 'Небольшая опытная команда',
        teamLead: 'Под задачу собирается компактный состав без лишних уровней передачи информации. Вы общаетесь с людьми, которые принимают технические решения и делают продукт.',
        roles: ['Product lead', 'Frontend', 'Backend / AI', 'UX / UI', 'QA', 'DevOps'],
        offerEyebrow: 'Коммерческое предложение',
        offerTitle: '$30 в час за работу команды',
        offerLead: 'Платите за согласованный объём инженерной работы. До начала каждого спринта фиксируем цель, оценку в часах, состав результата и способ приёмки.',
        standardTitle: 'Стандартная модель',
        standardPrice: '$30 / час',
        standardItems: [
            'спринт оплачивается до начала разработки',
            'внутри спринта — разработка, проверка и демонстрация',
            'следующий спринт начинается только после согласования',
        ],
        flexibleTitle: 'Гибкая оплата',
        flexiblePrice: '$39 / час',
        flexibleNote: '+30% к базовой ставке',
        flexibleItems: [
            'частичная предоплата перед стартом',
            'остаток привязывается к фиксированному сроку или согласованному показателю дохода',
            'триггер, сумма и крайний срок закрепляются до начала работ',
        ],
        offerFootnote: 'Итоговая оценка зависит от объёма и неопределённости задачи. Сторонние сервисы, лицензии и инфраструктура оплачиваются отдельно только после согласования.',
        contactTitle: 'Начнём с короткого разбора задачи',
        contactText: 'Пришлите контекст, желаемый результат и текущие материалы. Вернёмся с вопросами, предложением первого спринта и предварительной оценкой.',
        contactButton: 'Написать команде',
    },
    en: {
        eyebrow: 'Memora Solutions · product engineering',
        title: 'A development team that turns ideas into working products',
        lead: 'We design interfaces, build backends and automation, integrate AI, ship desktop apps, and own the path to a stable release.',
        discuss: 'Discuss a project',
        cases: 'View case studies',
        proof: [
            ['5+', 'products built in-house'],
            ['Web · Desktop · Bots', 'one engineering system'],
            ['React · Python · Electron', 'our proven core stack'],
            ['Sprint delivery', 'visible progress every iteration'],
        ],
        sectionWork: 'What we build',
        sectionWorkLead: 'We join as a product team: from problem framing and prototypes to code, infrastructure, and post-launch support.',
        capabilities: [
            ['Product and UX', 'We clarify scenarios, remove noise, design a clear user journey, and validate it in a real interface.'],
            ['Frontend', 'React, responsive interfaces, design systems, interactive graphics, performance, and accessibility.'],
            ['Backend and AI', 'Python services, Telegram bots, APIs, databases, payments, and controlled AI features.'],
            ['Desktop', 'Electron apps, local storage, OS integrations, updates, and multi-platform builds.'],
            ['Data and automation', 'Parsers, schedules, data pipelines, notifications, and resilient background jobs.'],
            ['Release reliability', 'CI, audits, monitoring, project recovery, and controlled production delivery.'],
        ],
        sectionCases: 'Products, not slide decks',
        sectionCasesLead: 'Our own products prove the work: real users, data, integrations, constraints, and responsibility for outcomes.',
        productCases: [
            { name: 'Memora BDayBot', type: 'Telegram · Python · PostgreSQL · AI', text: 'A bot for important dates, reminders, and personal birthday messages, with subscriptions, payments, admin tooling, and contextual generation.', href: '/bday-bot' },
            { name: 'Memora Pomodoro', type: 'Electron · React · local-first', text: 'A cross-platform focus timer with pure-time tracking, system overlay, local statistics, and a full web version.', href: '/pomodoro' },
            { name: 'Travel Radar', type: 'React · data pipelines · CI', text: 'One feed for last-minute tours and tickets collected from Telegram sources, plus useful travel services in the same workspace.', href: '/travel-radar' },
            { name: 'Product Dev OS', type: 'Internal tooling · delivery system', text: 'An internal system connecting research, requirements, development, quality review, and release.', href: '/internal' },
        ],
        processTitle: 'How we work',
        processLead: 'Every project has a clear next goal, bounded scope, and demonstrable outcome.',
        process: [
            ['01', 'Discovery', 'We define the problem, users, constraints, and acceptance criteria.'],
            ['02', 'Sprint plan', 'We shape a verifiable scope, estimate hours, and agree on the iteration outcome.'],
            ['03', 'Development', 'We design, code, integrate, and show progress throughout the sprint.'],
            ['04', 'Demo and release', 'We validate scenarios, resolve feedback, and publish the agreed version.'],
        ],
        teamTitle: 'A small, experienced team',
        teamLead: 'We assemble a compact team without layers of handoffs. You work directly with the people making technical decisions and building the product.',
        roles: ['Product lead', 'Frontend', 'Backend / AI', 'UX / UI', 'QA', 'DevOps'],
        offerEyebrow: 'Commercial offer',
        offerTitle: '$30 per team hour',
        offerLead: 'You pay for an agreed amount of engineering work. Before each sprint, we define its goal, hour estimate, deliverables, and acceptance method.',
        standardTitle: 'Standard model',
        standardPrice: '$30 / hour',
        standardItems: ['the sprint is paid before development starts', 'development, QA, and demo are included', 'the next sprint starts only after approval'],
        flexibleTitle: 'Flexible payment',
        flexiblePrice: '$39 / hour',
        flexibleNote: '30% above the base rate',
        flexibleItems: ['partial prepayment before kickoff', 'the balance is tied to a fixed date or an agreed revenue milestone', 'trigger, amount, and deadline are agreed before work starts'],
        offerFootnote: 'Final estimates depend on scope and uncertainty. Third-party services, licenses, and infrastructure are billed separately only after approval.',
        contactTitle: 'Start with a short project review',
        contactText: 'Send the context, desired outcome, and existing materials. We will return with questions, a first-sprint proposal, and a preliminary estimate.',
        contactButton: 'Message the team',
    },
};

const capabilityIcons = [Layers3, Code2, Bot, MonitorSmartphone, Database, CloudCog];

export default function CreatorPage() {
    const { i18n } = useTranslation();
    const c = COPY[i18n.language === 'ru' ? 'ru' : 'en'];

    return (
        <div className="team-page">
            <section className="team-hero">
                <div className="team-hero__grid" aria-hidden="true" />
                <div className="team-hero__orb team-hero__orb--one" aria-hidden="true" />
                <div className="team-hero__orb team-hero__orb--two" aria-hidden="true" />
                <div className="container team-hero__inner">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <span className="team-eyebrow"><Braces size={15} /> {c.eyebrow}</span>
                        <h1>{c.title}</h1>
                        <p className="team-hero__lead">{c.lead}</p>
                        <div className="team-hero__actions">
                            <a className="team-button team-button--primary" href="https://t.me/MemoraSolutions" target="_blank" rel="noopener noreferrer">
                                <MessageCircle size={18} /> {c.discuss}
                            </a>
                            <a className="team-button team-button--ghost" href="#cases">
                                {c.cases} <ArrowRight size={17} />
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        className="team-console"
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                        aria-label="Product delivery pipeline"
                    >
                        <div className="team-console__bar"><i /><i /><i /><span>memora / delivery</span></div>
                        <div className="team-console__body">
                            <div><span>01</span><b>discover</b><em>problem → criteria</em></div>
                            <div><span>02</span><b>design</b><em>flow → interface</em></div>
                            <div><span>03</span><b>build</b><em>frontend + backend</em></div>
                            <div><span>04</span><b>verify</b><em>scenarios → quality</em></div>
                            <div className="is-live"><span>05</span><b>release</b><em>production ✓</em></div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <main className="container team-main">
                <AnimatedSection>
                    <section className="team-proof" aria-label="Key facts">
                        {c.proof.map(([value, label]) => (
                            <div key={value}><strong>{value}</strong><span>{label}</span></div>
                        ))}
                    </section>
                </AnimatedSection>

                <AnimatedSection>
                    <section className="team-section">
                        <div className="team-section__head">
                            <span className="team-kicker">01 / capabilities</span>
                            <h2>{c.sectionWork}</h2>
                            <p>{c.sectionWorkLead}</p>
                        </div>
                        <div className="team-capabilities">
                            {c.capabilities.map(([title, text], index) => {
                                const Icon = capabilityIcons[index];
                                return (
                                    <article key={title} className="team-capability">
                                        <Icon size={21} />
                                        <h3>{title}</h3>
                                        <p>{text}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </AnimatedSection>

                <AnimatedSection>
                    <section className="team-section" id="cases">
                        <div className="team-section__head">
                            <span className="team-kicker">02 / shipped work</span>
                            <h2>{c.sectionCases}</h2>
                            <p>{c.sectionCasesLead}</p>
                        </div>
                        <div className="team-cases">
                            {c.productCases.map((item, index) => (
                                <a href={item.href} className="team-case" key={item.name}>
                                    <span className="team-case__index">0{index + 1}</span>
                                    <div>
                                        <span className="team-case__type">{item.type}</span>
                                        <h3>{item.name}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                    <ArrowRight className="team-case__arrow" size={20} />
                                </a>
                            ))}
                        </div>
                    </section>
                </AnimatedSection>

                <AnimatedSection>
                    <section className="team-section team-process-section">
                        <div className="team-section__head">
                            <span className="team-kicker">03 / process</span>
                            <h2>{c.processTitle}</h2>
                            <p>{c.processLead}</p>
                        </div>
                        <div className="team-process">
                            {c.process.map(([number, title, text]) => (
                                <article key={number}>
                                    <span>{number}</span>
                                    <h3>{title}</h3>
                                    <p>{text}</p>
                                </article>
                            ))}
                        </div>
                    </section>
                </AnimatedSection>

                <AnimatedSection>
                    <section className="team-team">
                        <div>
                            <span className="team-kicker">04 / team</span>
                            <h2>{c.teamTitle}</h2>
                            <p>{c.teamLead}</p>
                        </div>
                        <div className="team-roles">
                            {c.roles.map((role) => <span key={role}><Users size={15} /> {role}</span>)}
                        </div>
                    </section>
                </AnimatedSection>

                <AnimatedSection>
                    <section className="team-offer" id="offer">
                        <div className="team-offer__head">
                            <span className="team-eyebrow"><Sparkles size={15} /> {c.offerEyebrow}</span>
                            <h2>{c.offerTitle}</h2>
                            <p>{c.offerLead}</p>
                        </div>
                        <div className="team-offer__models">
                            <article className="team-price-card team-price-card--primary">
                                <Gauge size={22} />
                                <h3>{c.standardTitle}</h3>
                                <strong>{c.standardPrice}</strong>
                                <ul>{c.standardItems.map(item => <li key={item}><Check size={15} /> {item}</li>)}</ul>
                            </article>
                            <article className="team-price-card">
                                <ShieldCheck size={22} />
                                <h3>{c.flexibleTitle}</h3>
                                <strong>{c.flexiblePrice}</strong>
                                <span className="team-price-card__note">{c.flexibleNote}</span>
                                <ul>{c.flexibleItems.map(item => <li key={item}><Check size={15} /> {item}</li>)}</ul>
                            </article>
                        </div>
                        <p className="team-offer__footnote">{c.offerFootnote}</p>
                    </section>
                </AnimatedSection>

                <AnimatedSection>
                    <section className="team-contact">
                        <Rocket size={28} />
                        <div>
                            <h2>{c.contactTitle}</h2>
                            <p>{c.contactText}</p>
                        </div>
                        <a className="team-button team-button--primary" href="https://t.me/MemoraSolutions" target="_blank" rel="noopener noreferrer">
                            {c.contactButton} <ArrowRight size={17} />
                        </a>
                    </section>
                </AnimatedSection>
            </main>
        </div>
    );
}
