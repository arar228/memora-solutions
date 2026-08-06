import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    AtSign,
    Bot,
    Building2,
    CakeSlice,
    Check,
    CircleCheck,
    Code2,
    Database,
    ExternalLink,
    FileCheck2,
    FileSignature,
    FileText,
    Gauge,
    Layers3,
    Mail,
    MessageCircle,
    MonitorSmartphone,
    Phone,
    Plane,
    Rocket,
    Send,
    ShieldCheck,
    ShoppingCart,
    Sparkles,
    Timer,
    Trophy,
    WalletCards,
    Workflow,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { staticAsset } from '../../shared/staticAsset';
import './CreatorPage.css';

const TELEGRAM_URL = 'https://t.me/MemoraSolutions';
const CLIENT_KEY = 'memora-question-client';

const PROJECT_META = [
    { id: 'b2b', icon: ShoppingCart, assets: ['/portfolio/armk-b2b.png'], tone: 'blue' },
    { id: 'domatrix', icon: Building2, assets: ['/portfolio/domatrix-landing.png', '/portfolio/domatrix-app.png'], tone: 'green' },
    { id: 'poker', icon: Trophy, assets: ['/portfolio/poker-club.png', '/portfolio/poker-control.png'], tone: 'gold' },
    { id: 'armk', icon: MonitorSmartphone, assets: ['/portfolio/armk-site.png'], tone: 'ice', external: true },
    { id: 'wallet', icon: WalletCards, tone: 'mint' },
    { id: 'pomodoro', icon: Timer, tone: 'orange' },
    { id: 'radar', icon: Plane, tone: 'cyan' },
    { id: 'bday', icon: CakeSlice, tone: 'violet' },
];

const COPY = {
    ru: {
        eyebrow: 'Портфолио продуктовой команды',
        title: 'Цифровые продукты, которые работают в реальном мире',
        lead: 'Проектируем пользовательский путь, интерфейс, код, данные и инфраструктуру. Доводим продукт до стабильного релиза и понятного управления.',
        discuss: 'Оставить запрос',
        cases: 'Смотреть проекты',
        proof: [['8', 'продуктов в портфолио'], ['Web · Desktop · Bots', 'единый контур разработки'], ['$30 / час', 'ставка команды'], ['Спринтами', 'проверяемый результат']],
        capabilitiesLabel: '01 / Возможности',
        capabilitiesTitle: 'Одна команда — весь продукт',
        capabilitiesLead: 'Связываем продуктовую логику, дизайн, frontend, backend, данные и выпуск в единый процесс.',
        capabilities: [
            ['Продукт и UX', 'Исследуем сценарии, выстраиваем путь пользователя и проектируем ясный интерфейс.'],
            ['Frontend', 'Создаём адаптивные React-интерфейсы, дизайн-системы и интерактивные экраны.'],
            ['Backend и AI', 'Разрабатываем API, базы данных, Telegram-ботов, платежи и управляемые AI-функции.'],
            ['Desktop', 'Выпускаем Electron-приложения с локальными данными и системными интеграциями.'],
            ['Данные', 'Строим парсеры, расписания, потоки обработки и персональные уведомления.'],
            ['Релиз', 'Настраиваем инфраструктуру, проверки, публикацию, мониторинг и поддержку.'],
        ],
        casesLabel: '02 / Проекты',
        casesTitle: 'Разные задачи. Своя логика у каждого продукта.',
        projectAction: 'Открыть проект',
        projectDetails: 'Обсудить проект',
        projects: [
            { name: 'ARMK B2B', type: 'B2B · Commerce · Каталог', text: 'Оптовая платформа с каталогом на тысячи позиций, ролями менеджера и заказчика, фильтрами, наличием и корзиной.', href: '#contact' },
            { name: 'DOMATRIX', type: 'АСУЗ · 23 системы · Digital twin', text: 'Единый центр управления инженерными системами здания: диспетчеризация, заявки, мониторинг и сервисы для жителей.', href: '#contact' },
            { name: 'Платформа спортивного покера', type: 'Клуб · Турниры · Live control', text: 'Публичный сайт клуба, расписание и рейтинг игроков, регистрация на турниры и единый экран управления залом, уровнями и участниками.', href: '#contact' },
            { name: 'Сайт ARMK', type: 'Корпоративный сайт · AI · CMS', text: 'Продукты, компетенции, вакансии, гарантии и AI-ассистент в одном живом корпоративном интерфейсе.', href: 'https://armk.pro/' },
            { name: 'Memora Wallet Manager', type: 'Telegram · Python · Fintech', text: 'Учёт расходов сообщением, бюджеты, отчёты, валюты, часовые пояса и ежедневные уведомления.', href: '/wallet' },
            { name: 'Memora Pomodoro', type: 'Electron · React · Local-first', text: 'Таймер фокуса с оверлеем, статистикой, анимированными сценами и web-версией.', href: '/pomodoro' },
            { name: 'Радар путешествий', type: 'React · Парсеры · Data pipeline', text: 'Единая лента туров и билетов из тревел-каналов с фильтрами, датами и первоисточниками.', href: '/travel-radar' },
            { name: 'Memora BDayBot', type: 'Telegram · Python · PostgreSQL · AI', text: 'Контакты, напоминания, контекстные поздравления, подписки и административный контур.', href: '/bday-bot' },
        ],
        managerLabel: '03 / Менеджер проекта',
        managerName: 'Сергей',
        managerRole: 'Project manager · Memora Solutions',
        managerLead: 'Сергей соединяет задачу заказчика и работу команды в прозрачный рабочий процесс.',
        managerItems: ['собирает контекст и критерии приёмки', 'держит план, сроки и бюджет спринта', 'организует демонстрации и рабочую коммуникацию', 'передаёт результат, отчёт и комплект документов'],
        processLabel: '04 / Процесс',
        processTitle: 'От задачи к работающей версии',
        processLead: 'Каждый этап заканчивается конкретным результатом для проверки и приёмки.',
        process: [['01', 'Разбор', 'Задача, пользователи, ограничения и критерии готовности.'], ['02', 'Спринт', 'Объём, оценка в часах, команда и дата демонстрации.'], ['03', 'Разработка', 'Интерфейс, код, интеграции, проверки и промежуточные показы.'], ['04', 'Передача', 'Релиз, отчёт, документы и согласованный следующий шаг.']],
        offerLabel: '05 / Условия работы',
        offerTitle: '$30 в час за работу команды',
        offerLead: 'До старта спринта фиксируем цель, оценку, состав результата и порядок приёмки.',
        standardTitle: 'Полная предоплата',
        standardPrice: '$30 / час',
        standardItems: ['оплата согласованного спринта перед стартом', 'разработка, проверка и демонстрация входят в спринт', 'следующий спринт формируется после приёмки результата'],
        flexibleTitle: 'Частичная предоплата',
        flexiblePrice: '$39 / час',
        flexibleNote: '+30% к базовой ставке',
        flexibleItems: ['частичная оплата перед стартом', 'остаток привязывается к сроку или показателю дохода', 'сумма, триггер и крайняя дата закрепляются в договоре'],
        offerFootnote: 'Итоговая оценка отражает объём и определённость задачи. Сервисы, лицензии и инфраструктура согласуются отдельной строкой.',
        docsLabel: '06 / Клиентский комплект',
        docsTitle: 'Документы проекта в одном месте',
        documents: [['Коммерческое предложение', 'Объём, команда, оценка, этапы и бюджет.'], ['Отчёт по спринту', 'Цели, готовые функции, проверки и следующий шаг.'], ['Договор', 'Предмет, права, оплата, сроки и ответственность.'], ['Акт приёмки', 'Переданный результат и подтверждение приёмки.']],
        documentAction: 'Получить у Сергея',
        contact: {
            label: '07 / Новый проект', title: 'Один запрос — удобный канал ответа', text: 'Опишите задачу и выберите телефон, почту или Telegram. Запрос сразу попадёт менеджеру.',
            name: 'Как к вам обращаться', request: 'Что нужно разработать', method: 'Куда направить ответ', phone: 'Телефон', email: 'Почта', telegram: 'Telegram',
            namePlaceholder: 'Имя', requestPlaceholder: 'Контекст, задача и желаемый результат', phonePlaceholder: '+7 999 000-00-00', emailPlaceholder: 'name@company.ru', telegramPlaceholder: '@username',
            submit: 'Отправить запрос', sending: 'Отправляем…', success: 'Запрос отправлен. Менеджер свяжется с вами выбранным способом.', error: 'Заполните задачу и контакт для ответа.', questionLink: 'Открыть раздел «Задать вопрос»',
        },
    },
    en: {
        eyebrow: 'Product team portfolio', title: 'Digital products built for the real world', lead: 'We design the user journey, interface, code, data, and infrastructure—then take the product to a stable release and clear operations.', discuss: 'Send a request', cases: 'View projects',
        proof: [['8', 'products in the portfolio'], ['Web · Desktop · Bots', 'one delivery system'], ['$30 / hour', 'team rate'], ['Sprint delivery', 'a verifiable outcome']],
        capabilitiesLabel: '01 / Capabilities', capabilitiesTitle: 'One team. The whole product.', capabilitiesLead: 'Product logic, design, frontend, backend, data, and release move through one connected process.',
        capabilities: [['Product and UX', 'We research scenarios, shape the user journey, and design a clear interface.'], ['Frontend', 'Responsive React interfaces, design systems, and interactive screens.'], ['Backend and AI', 'APIs, databases, Telegram bots, payments, and controlled AI features.'], ['Desktop', 'Electron applications with local data and system integrations.'], ['Data', 'Parsers, schedules, processing pipelines, and personal notifications.'], ['Release', 'Infrastructure, testing, publishing, monitoring, and support.']],
        casesLabel: '02 / Projects', casesTitle: 'Different challenges. A distinct logic for every product.', projectAction: 'Open project', projectDetails: 'Discuss project',
        projects: [
            { name: 'ARMK B2B', type: 'B2B · Commerce · Catalogue', text: 'A wholesale platform with thousands of items, manager and customer roles, filters, stock, and cart.', href: '#contact' },
            { name: 'DOMATRIX', type: 'BMS · 23 systems · Digital twin', text: 'One control centre for building systems, dispatching, service requests, monitoring, and resident services.', href: '#contact' },
            { name: 'Sports poker platform', type: 'Club · Tournaments · Live control', text: 'A public club website, schedule and player ratings, tournament registration, and one live control screen for the venue, levels, and participants.', href: '#contact' },
            { name: 'ARMK Website', type: 'Corporate website · AI · CMS', text: 'Products, capabilities, vacancies, guarantees, and an AI assistant in one live corporate interface.', href: 'https://armk.pro/' },
            { name: 'Memora Wallet Manager', type: 'Telegram · Python · Fintech', text: 'Expense tracking by message, budgets, reports, currencies, time zones, and daily notifications.', href: '/wallet' },
            { name: 'Memora Pomodoro', type: 'Electron · React · Local-first', text: 'A focus timer with overlay, statistics, animated scenes, and a web version.', href: '/pomodoro' },
            { name: 'Travel Radar', type: 'React · Parsers · Data pipeline', text: 'One feed of tours and tickets from travel channels with filters, dates, and source links.', href: '/travel-radar' },
            { name: 'Memora BDayBot', type: 'Telegram · Python · PostgreSQL · AI', text: 'Contacts, reminders, contextual greetings, subscriptions, and admin operations.', href: '/bday-bot' },
        ],
        managerLabel: '03 / Project manager', managerName: 'Sergey', managerRole: 'Project manager · Memora Solutions', managerLead: 'Sergey connects the client objective and the team’s work in a transparent process.',
        managerItems: ['collects context and acceptance criteria', 'owns the sprint plan, timing, and budget', 'organises demos and working communication', 'delivers the result, report, and document set'],
        processLabel: '04 / Process', processTitle: 'From task to working release', processLead: 'Every stage ends with a concrete outcome ready for review and acceptance.',
        process: [['01', 'Discovery', 'Objective, users, constraints, and acceptance criteria.'], ['02', 'Sprint', 'Scope, hour estimate, team, and demo date.'], ['03', 'Development', 'Interface, code, integrations, testing, and progress demos.'], ['04', 'Delivery', 'Release, report, documents, and an agreed next step.']],
        offerLabel: '05 / Engagement', offerTitle: '$30 per team hour', offerLead: 'Before each sprint, we define the goal, estimate, deliverables, and acceptance flow.', standardTitle: 'Full prepayment', standardPrice: '$30 / hour', standardItems: ['payment for the agreed sprint before kickoff', 'development, QA, and demo included', 'the next sprint is formed after acceptance'], flexibleTitle: 'Partial prepayment', flexiblePrice: '$39 / hour', flexibleNote: '30% above the base rate', flexibleItems: ['partial payment before kickoff', 'the balance is tied to a date or revenue metric', 'amount, trigger, and deadline are recorded in the agreement'], offerFootnote: 'The estimate reflects scope and clarity. Services, licenses, and infrastructure are agreed separately.',
        docsLabel: '06 / Client kit', docsTitle: 'Project documents in one place', documents: [['Commercial proposal', 'Scope, team, estimate, stages, and budget.'], ['Sprint report', 'Goals, delivered features, checks, and next step.'], ['Agreement', 'Scope, rights, payment, timing, and responsibilities.'], ['Acceptance certificate', 'Delivered result and acceptance confirmation.']], documentAction: 'Request from Sergey',
        contact: { label: '07 / New project', title: 'One request. Your preferred reply channel.', text: 'Describe the project and choose phone, email, or Telegram. The request goes straight to the manager.', name: 'Your name', request: 'What should we build?', method: 'Where should we reply?', phone: 'Phone', email: 'Email', telegram: 'Telegram', namePlaceholder: 'Name', requestPlaceholder: 'Context, objective, and desired outcome', phonePlaceholder: '+7 999 000-00-00', emailPlaceholder: 'name@company.com', telegramPlaceholder: '@username', submit: 'Send request', sending: 'Sending…', success: 'Request sent. The manager will reply through your chosen channel.', error: 'Add the project request and a reply contact.', questionLink: 'Open Ask a Question' },
    },
};

const capabilityIcons = [Layers3, Code2, Bot, MonitorSmartphone, Database, Workflow];
const documentIcons = [FileText, FileCheck2, FileSignature, ShieldCheck];

function getClientId() {
    const stored = localStorage.getItem(CLIENT_KEY);
    if (stored && /^[a-zA-Z0-9_-]{16,80}$/.test(stored)) return stored;
    const created = crypto.randomUUID?.() || `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLIENT_KEY, created);
    return created;
}

function ProjectInquiry({ copy, lang }) {
    const [name, setName] = useState('');
    const [request, setRequest] = useState('');
    const [method, setMethod] = useState('phone');
    const [contact, setContact] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const startedAt = useRef(Date.now());
    const methodLabel = copy[method];

    const isContactValid = useMemo(() => {
        const value = contact.trim();
        if (method === 'phone') return /^\+?7[\s()\-\d]{10,}$/.test(value) && value.replace(/\D/g, '').length === 11;
        if (method === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return /^@?[a-zA-Z0-9_]{5,32}$/.test(value);
    }, [contact, method]);

    const submit = async event => {
        event.preventDefault();
        if (request.trim().length < 10 || !isContactValid || status === 'sending') {
            setError(copy.error);
            return;
        }
        setStatus('sending');
        setError('');
        const message = `${request.trim()}\n\n${methodLabel}: ${contact.trim()}`;
        try {
            const response = await fetch('/api/kanban/messages', {
                method: 'POST',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'personal', clientId: getClientId(), name: name.trim(), text: message,
                    website: '', startedAt: startedAt.current,
                }),
            });
            if (!response.ok) throw new Error('request_failed');
            setStatus('success');
            setRequest('');
            startedAt.current = Date.now();
            if (method === 'telegram') {
                const telegramText = encodeURIComponent(`${request.trim()}\n\n${copy.telegram}: ${contact.trim()}`);
                window.location.assign(`${TELEGRAM_URL}?text=${telegramText}`);
            }
        } catch {
            setStatus('idle');
            setError(lang === 'ru' ? 'Сервис связи временно недоступен. Откройте раздел «Задать вопрос».' : 'The contact service is temporarily unavailable. Open Ask a Question.');
        }
    };

    const placeholders = { phone: copy.phonePlaceholder, email: copy.emailPlaceholder, telegram: copy.telegramPlaceholder };
    const icons = { phone: Phone, email: Mail, telegram: AtSign };

    return (
        <form className="portfolio-inquiry" onSubmit={submit}>
            <label><span>{copy.name}</span><input value={name} maxLength={40} placeholder={copy.namePlaceholder} onChange={event => setName(event.target.value)} /></label>
            <label className="portfolio-inquiry__request"><span>{copy.request}</span><textarea value={request} maxLength={1200} placeholder={copy.requestPlaceholder} onChange={event => setRequest(event.target.value)} /></label>
            <fieldset>
                <legend>{copy.method}</legend>
                <div className="portfolio-inquiry__methods">
                    {['phone', 'email', 'telegram'].map(item => {
                        const Icon = icons[item];
                        return <button key={item} type="button" className={method === item ? 'is-active' : ''} onClick={() => { setMethod(item); setContact(''); }}><Icon size={18} /> {copy[item]}</button>;
                    })}
                </div>
            </fieldset>
            <label className="portfolio-inquiry__contact"><span>{methodLabel}</span><input value={contact} placeholder={placeholders[method]} inputMode={method === 'phone' ? 'tel' : method === 'email' ? 'email' : 'text'} onChange={event => setContact(event.target.value)} /></label>
            <button className="portfolio-inquiry__submit" type="submit" disabled={status === 'sending'}><Send size={20} /> {status === 'sending' ? copy.sending : copy.submit}</button>
            <div className="portfolio-inquiry__feedback" aria-live="polite">
                {status === 'success' && <span><CircleCheck size={18} /> {copy.success}</span>}
                {error && <strong>{error}</strong>}
                <a href="/kanban">{copy.questionLink} <ArrowRight size={18} /></a>
            </div>
        </form>
    );
}

export default function CreatorPage() {
    const { i18n } = useTranslation();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const c = COPY[lang];

    return (
        <div className="portfolio-page">
            <header className="portfolio-hero">
                <div className="portfolio-hero__aurora" aria-hidden="true" />
                <div className="container portfolio-hero__inner">
                    <motion.div className="portfolio-hero__copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                        <span className="portfolio-eyebrow"><Sparkles size={18} /> {c.eyebrow}</span>
                        <h1>{c.title}</h1><p>{c.lead}</p>
                        <div className="portfolio-hero__actions"><a className="portfolio-button is-primary" href="#contact"><MessageCircle size={20} /> {c.discuss}</a><a className="portfolio-button" href="#cases">{c.cases} <ArrowRight size={20} /></a></div>
                    </motion.div>
                    <motion.div className="portfolio-showcase" initial={{ opacity: 0, rotate: 2, y: 34 }} animate={{ opacity: 1, rotate: -2, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}>
                        <div className="portfolio-showcase__pulse"><i /><span>8 PROJECTS · LIVE PORTFOLIO</span></div>
                        {c.projects.slice(0, 4).map((item, index) => <a href={item.href} key={item.name}><span>0{index + 1}</span><strong>{item.name}</strong><small>{item.type}</small><ArrowRight size={18} /></a>)}
                    </motion.div>
                </div>
            </header>

            <section className="portfolio-proof"><div className="container portfolio-proof__grid">{c.proof.map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}</div></section>

            <main>
                <section className="portfolio-section portfolio-section--dark"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.capabilitiesLabel}</span><h2>{c.capabilitiesTitle}</h2><p>{c.capabilitiesLead}</p></div><div className="portfolio-capabilities">{c.capabilities.map(([title, text], index) => { const Icon = capabilityIcons[index]; return <article key={title}><Icon size={24} /><h3>{title}</h3><p>{text}</p></article>; })}</div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--cases" id="cases"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.casesLabel}</span><h2>{c.casesTitle}</h2></div><div className="portfolio-case-list">{c.projects.map((project, index) => { const meta = PROJECT_META[index]; const Icon = meta.icon; return <motion.a whileHover={{ x: 6 }} href={project.href} target={meta.external ? '_blank' : undefined} rel={meta.external ? 'noopener noreferrer' : undefined} key={meta.id} className={`portfolio-case-row tone-${meta.tone} ${meta.assets ? 'has-media' : 'is-compact'}`}><span className="portfolio-case-row__number">{String(index + 1).padStart(2, '0')}</span><div className="portfolio-case-row__identity"><span className="portfolio-case-row__type"><Icon size={20} /> {project.type}</span><h3>{project.name}</h3></div><p className="portfolio-case-row__description">{project.text}</p>{meta.assets && <div className={`portfolio-case-row__media media-${meta.id}`}>{meta.assets.map((asset, assetIndex) => <img src={staticAsset(asset)} alt={`${project.name} — ${assetIndex + 1}`} loading="lazy" key={asset} />)}</div>}<span className="portfolio-case-row__action">{project.href === '#contact' ? c.projectDetails : c.projectAction} {meta.external ? <ExternalLink size={20} /> : <ArrowRight size={20} />}</span></motion.a>; })}</div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--manager"><div className="container"><AnimatedSection className="portfolio-manager"><figure><img src={staticAsset('/sergey.jpg')} alt={`${c.managerName}, ${c.managerRole}`} loading="lazy" /><figcaption>{c.managerRole}</figcaption></figure><div><span className="portfolio-kicker">{c.managerLabel}</span><h2>{c.managerName}</h2><p>{c.managerLead}</p><ul>{c.managerItems.map(item => <li key={item}><Check size={20} /> {item}</li>)}</ul><a className="portfolio-button" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">{c.documentAction} <ArrowRight size={20} /></a></div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--process"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.processLabel}</span><h2>{c.processTitle}</h2><p>{c.processLead}</p></div><div className="portfolio-process">{c.process.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--offer"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.offerLabel}</span><h2>{c.offerTitle}</h2><p>{c.offerLead}</p></div><div className="portfolio-pricing"><article><Gauge size={24} /><h3>{c.standardTitle}</h3><strong>{c.standardPrice}</strong><ul>{c.standardItems.map(item => <li key={item}><Check size={20} /> {item}</li>)}</ul></article><article><ShieldCheck size={24} /><h3>{c.flexibleTitle}</h3><strong>{c.flexiblePrice}</strong><span>{c.flexibleNote}</span><ul>{c.flexibleItems.map(item => <li key={item}><Check size={20} /> {item}</li>)}</ul></article></div><p className="portfolio-offer-note">{c.offerFootnote}</p></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--documents"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.docsLabel}</span><h2>{c.docsTitle}</h2></div><div className="portfolio-documents">{c.documents.map(([title, text], index) => { const Icon = documentIcons[index]; return <article key={title}><Icon size={24} /><h3>{title}</h3><p>{text}</p><a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">{c.documentAction} <ArrowRight size={20} /></a></article>; })}</div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--contact" id="contact"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.contact.label}</span><h2>{c.contact.title}</h2><p>{c.contact.text}</p></div><ProjectInquiry copy={c.contact} lang={lang} /></AnimatedSection></div></section>
            </main>
        </div>
    );
}
