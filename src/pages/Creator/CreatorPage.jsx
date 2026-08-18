import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    AtSign,
    Building2,
    CakeSlice,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    Code2,
    ExternalLink,
    FileCheck2,
    FileSignature,
    FileText,
    Gauge,
    Mail,
    Maximize2,
    MessageCircle,
    MonitorSmartphone,
    Phone,
    Plane,
    Rocket,
    Search,
    Send,
    ShieldCheck,
    ShoppingCart,
    Sparkles,
    Timer,
    Trophy,
    TrendingDown,
    WalletCards,
    X,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { staticAsset } from '../../shared/staticAsset';
import './CreatorPage.css';

const TELEGRAM_URL = 'https://t.me/MemoraSolutions';
const CLIENT_KEY = 'memora-question-client';
const isExternalHref = href => /^https?:\/\//i.test(href);

const PROJECT_META = [
    { id: 'b2b', icon: ShoppingCart, assets: ['/portfolio/armk-b2b.png'], tone: 'blue' },
    { id: 'domatrix', icon: Building2, assets: ['/portfolio/domatrix-landing.png', '/portfolio/domatrix-app.png'], tone: 'green' },
    { id: 'poker', icon: Trophy, assets: ['/portfolio/poker-club.png', '/portfolio/poker-control.png'], tone: 'gold' },
    { id: 'armk', icon: MonitorSmartphone, assets: ['/portfolio/armk-site.png'], tone: 'ice' },
    { id: 'wallet', icon: WalletCards, tone: 'mint' },
    { id: 'pomodoro', icon: Timer, tone: 'orange' },
    { id: 'radar', icon: Plane, tone: 'cyan' },
    { id: 'bday', icon: CakeSlice, tone: 'violet' },
];

const COPY = {
    ru: {
        eyebrow: 'Портфолио продуктовой команды',
        titlePrimary: 'Цифровые продукты,',
        titleSecondary: 'которые работают в реальном мире',
        scrollHint: 'Продолжить путь',
        lead: 'Проектируем пользовательский путь, интерфейс, код, данные и инфраструктуру. Доводим продукт до стабильного релиза и понятного управления.',
        discuss: 'Оставить запрос',
        cases: 'Смотреть проекты',
        proof: [['8', 'продуктов в портфолио'], ['Web · Desktop · Bots', 'единый контур разработки'], ['$30 / час', 'ставка команды'], ['Спринтами', 'проверяемый результат']],
        casesLabel: '01 / Проекты',
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
        managerLabel: '02 / Менеджер проекта',
        managerName: 'Сергей',
        managerRole: 'Project manager · Memora Solutions',
        managerLead: 'Сергей соединяет задачу заказчика и работу команды в прозрачный рабочий процесс.',
        managerItems: ['собирает контекст и критерии приёмки', 'держит план, сроки и бюджет спринта', 'организует демонстрации и рабочую коммуникацию', 'передаёт результат, отчёт и комплект документов'],
        processLabel: '03 / Процесс',
        processTitle: 'От задачи к работающей версии',
        processLead: 'Каждый этап заканчивается конкретным результатом для проверки и приёмки.',
        process: [['01', 'Разбор', 'Задача, пользователи, ограничения и критерии готовности.', 'Понимаем задачу'], ['02', 'Спринт', 'Объём, оценка в часах, команда и дата демонстрации.', 'Фиксируем план'], ['03', 'Разработка', 'Интерфейс, код, интеграции, проверки и промежуточные показы.', 'Собираем продукт'], ['04', 'Передача', 'Релиз, отчёт, документы и согласованный следующий шаг.', 'Передаём результат']],
        offerLabel: '04 / Условия работы',
        offerTitle: 'Два формата оплаты',
        offerLead: 'В обоих форматах работает вся команда: продукт, дизайн, разработка и проверка.',
        marketBadge: 'ниже рынка',
        standardTitle: 'Основной формат',
        standardPrice: '$30',
        standardCaption: '/ час команды',
        standardItems: ['спринт оплачивается до старта', 'цель, сроки и демо фиксируются заранее'],
        offerFlow: ['Цель', 'Спринт', 'Демо'],
        flexibleTitle: 'Гибкий формат',
        flexiblePrice: '$39',
        flexibleCaption: '/ час команды',
        flexibleNote: 'частичная предоплата',
        flexibleItems: ['часть суммы до старта', 'остаток — по сроку или результату'],
        offerFootnote: 'Объём и состав результата фиксируем до старта.',
        docsLabel: '05 / Клиентский комплект',
        docsTitle: 'Документы проекта в одном месте',
        documents: [['Коммерческое предложение', 'Объём, команда, оценка, этапы и бюджет.'], ['Отчёт по спринту', 'Цели, готовые функции, проверки и следующий шаг.'], ['Договор', 'Предмет, права, оплата, сроки и ответственность.'], ['Акт приёмки', 'Переданный результат и подтверждение приёмки.']],
        managerAction: 'Обсудить проект',
        documentOpen: 'Открыть пример',
        documentExample: 'Пример структуры',
        documentNotice: 'Пример рассчитан на проекты по праву РФ. Перед подписанием юрист проверяет реквизиты сторон, налоговый статус, модель передачи прав, обработку персональных данных и подсудность конкретного проекта.',
        documentClose: 'Закрыть пример',
        contact: {
            label: '06 / Новый проект', title: 'Один запрос — удобный канал ответа', text: 'Опишите задачу и выберите телефон, почту или Telegram. Запрос сразу попадёт менеджеру.',
            name: 'Как к вам обращаться', request: 'Что нужно разработать', method: 'Куда направить ответ', phone: 'Телефон', email: 'Почта', telegram: 'Telegram',
            namePlaceholder: 'Имя', requestPlaceholder: 'Контекст, задача и желаемый результат', phonePlaceholder: '+7 999 000-00-00', emailPlaceholder: 'name@company.ru', telegramPlaceholder: '@username',
            submit: 'Отправить запрос', sending: 'Отправляем…', success: 'Запрос отправлен. Менеджер свяжется с вами выбранным способом.', error: 'Заполните задачу и контакт для ответа.', questionLink: 'Открыть раздел «Задать вопрос»',
        },
    },
    en: {
        eyebrow: 'Product team portfolio', titlePrimary: 'Digital products', titleSecondary: 'built for the real world', scrollHint: 'Continue the journey', lead: 'We design the user journey, interface, code, data, and infrastructure—then take the product to a stable release and clear operations.', discuss: 'Send a request', cases: 'View projects',
        proof: [['8', 'products in the portfolio'], ['Web · Desktop · Bots', 'one delivery system'], ['$30 / hour', 'team rate'], ['Sprint delivery', 'a verifiable outcome']],
        casesLabel: '01 / Projects', casesTitle: 'Different challenges. A distinct logic for every product.', projectAction: 'Open project', projectDetails: 'Discuss project',
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
        managerLabel: '02 / Project manager', managerName: 'Sergey', managerRole: 'Project manager · Memora Solutions', managerLead: 'Sergey connects the client objective and the team’s work in a transparent process.',
        managerItems: ['collects context and acceptance criteria', 'owns the sprint plan, timing, and budget', 'organises demos and working communication', 'delivers the result, report, and document set'],
        processLabel: '03 / Process', processTitle: 'From task to working release', processLead: 'Every stage ends with a concrete outcome ready for review and acceptance.',
        process: [['01', 'Discovery', 'Objective, users, constraints, and acceptance criteria.', 'Understand the task'], ['02', 'Sprint', 'Scope, hour estimate, team, and demo date.', 'Set the plan'], ['03', 'Development', 'Interface, code, integrations, testing, and progress demos.', 'Build the product'], ['04', 'Delivery', 'Release, report, documents, and an agreed next step.', 'Deliver the result']],
        offerLabel: '04 / Engagement', offerTitle: 'Two payment formats', offerLead: 'Both formats include the whole team: product, design, development, and QA.', marketBadge: 'below market', standardTitle: 'Core format', standardPrice: '$30', standardCaption: '/ team hour', standardItems: ['the sprint is paid before kickoff', 'scope, timing, and demo are set in advance'], offerFlow: ['Scope', 'Sprint', 'Demo'], flexibleTitle: 'Flexible format', flexiblePrice: '$39', flexibleCaption: '/ team hour', flexibleNote: 'partial prepayment', flexibleItems: ['part of the fee before kickoff', 'balance tied to timing or outcome'], offerFootnote: 'Scope and deliverables are set before kickoff.',
        docsLabel: '05 / Client kit', docsTitle: 'Project documents in one place', documents: [['Commercial proposal', 'Scope, team, estimate, stages, and budget.'], ['Sprint report', 'Goals, delivered features, checks, and next step.'], ['Agreement', 'Scope, rights, payment, timing, and responsibilities.'], ['Acceptance certificate', 'Delivered result and acceptance confirmation.']], managerAction: 'Discuss the project', documentOpen: 'Open example', documentExample: 'Structure example', documentNotice: 'This example is structured for projects governed by Russian law. Before signing, legal counsel verifies party details, tax status, the IP transfer model, personal data processing, and jurisdiction for the specific project.', documentClose: 'Close example',
        contact: { label: '06 / New project', title: 'One request. Your preferred reply channel.', text: 'Describe the project and choose phone, email, or Telegram. The request goes straight to the manager.', name: 'Your name', request: 'What should we build?', method: 'Where should we reply?', phone: 'Phone', email: 'Email', telegram: 'Telegram', namePlaceholder: 'Name', requestPlaceholder: 'Context, objective, and desired outcome', phonePlaceholder: '+7 999 000-00-00', emailPlaceholder: 'name@company.com', telegramPlaceholder: '@username', submit: 'Send request', sending: 'Sending…', success: 'Request sent. The manager will reply through your chosen channel.', error: 'Add the project request and a reply contact.', questionLink: 'Open Ask a Question' },
    },
};

const processIcons = [Search, CalendarDays, Code2, Rocket];
const documentIcons = [FileText, FileCheck2, FileSignature, ShieldCheck];

const DOCUMENT_TEMPLATES = {
    ru: [
        {
            title: 'Коммерческое предложение',
            code: 'КП · [номер] · [дата]',
            preview: ['Результат', 'Этапы', 'Оценка', 'Условия'],
            lead: 'Короткая карта проекта: что создаём, как проверяем результат и из чего складывается оценка.',
            sections: [
                ['01 · Контекст и цель', ['Заказчик: [наименование и реквизиты].', 'Задача: [исходная ситуация и бизнес-цель].', 'Результат: [измеримое состояние продукта после проекта].']],
                ['02 · Состав результата', ['Функции и пользовательские сценарии: [перечень].', 'Интерфейсы и платформы: [web / mobile / desktop / bot].', 'Передаваемые материалы: исходный код, макеты, документация, доступы и сборки.']],
                ['03 · Этапы и приёмка', ['Этапы: [разбор] → [прототип] → [разработка] → [релиз].', 'Для каждого этапа: результат, дата демонстрации и критерии приёмки.', 'Изменение объёма оформляется отдельной оценкой до начала дополнительных работ.']],
                ['04 · Команда и оценка', ['Роли: [менеджер] · [дизайнер] · [разработчик] · [QA].', 'Оценка: [часы × ставка] или [фиксированная стоимость этапа].', 'Платежи: [график], налоги: [режим исполнителя], срок действия предложения: [дата].']],
                ['05 · Правовая рамка', ['Права на новый результат: [отчуждение / лицензия] и момент перехода.', 'Компоненты третьих лиц и open-source фиксируются отдельно.', 'Конфиденциальность, персональные данные и инфраструктурные расходы отражаются в договоре.']],
            ],
        },
        {
            title: 'Отчёт по спринту',
            code: 'СПРИНТ · [номер] · [период]',
            preview: ['Цель', 'Готово', 'Проверки', 'Следующий шаг'],
            lead: 'Единая фиксация выполненной работы, проверок, решений и следующего согласованного шага.',
            sections: [
                ['01 · Цель спринта', ['Период: [дата начала — дата завершения].', 'Цель: [проверяемый результат спринта].', 'Связанные задачи и версия: [ссылки / номер сборки].']],
                ['02 · Переданный результат', ['Готовые функции: [перечень с ссылками].', 'Макеты, код, сборка и документация: [место хранения].', 'Доступы и параметры окружения передаются защищённым каналом.']],
                ['03 · Проверка качества', ['Проверенные сценарии: [перечень].', 'Среда и устройства: [браузеры / ОС / разрешения].', 'Замечания: [статус, ответственный, срок исправления].']],
                ['04 · Учёт и решения', ['Затрачено: [часы] · стоимость: [сумма] · остаток: [значение].', 'Решения заказчика: [перечень и дата согласования].', 'Изменения объёма: [добавлено / перенесено / исключено].']],
                ['05 · Следующий шаг', ['Цель следующего спринта: [результат].', 'Зависимости со стороны заказчика: [материалы / доступы / решение].', 'Дата следующей демонстрации: [дата и время].']],
            ],
        },
        {
            title: 'Договор разработки',
            code: 'ДОГОВОР · [номер] · [город / дата]',
            preview: ['Предмет', 'Приёмка', 'Права', 'Защита данных'],
            lead: 'Смешанная конструкция для разработки и услуг: результат, порядок работы и права описаны в одном документе.',
            sections: [
                ['01 · Стороны и предмет', ['Заказчик: [наименование, ОГРН/ОГРНИП, ИНН, представитель и основание полномочий].', 'Исполнитель: [наименование, реквизиты, налоговый статус].', 'Предмет: создание и передача [продукта] и связанные услуги по спецификации.']],
                ['02 · Объём и управление изменениями', ['Спецификация определяет функции, платформы, материалы и критерии готовности.', 'Этапы, сроки и контрольные демонстрации фиксируются в приложении.', 'Новый объём начинается после письменного согласования оценки, срока и влияния на план.']],
                ['03 · Цена и расчёты', ['Модель: [фиксированная цена / часы × ставка].', 'График платежей, валюта, налоги и момент исполнения обязательства по оплате.', 'Лицензии, сервисы и инфраструктура: [включены / оплачиваются отдельно по согласованию].']],
                ['04 · Передача и приёмка', ['Исполнитель направляет результат, отчёт и акт через согласованный канал.', 'Заказчик в течение [N] рабочих дней принимает результат либо направляет единый перечень мотивированных замечаний со ссылкой на критерии.', 'Исправления подтверждённых несоответствий выполняются в согласованный срок; новые пожелания оцениваются как изменение объёма.']],
                ['05 · Интеллектуальные права', ['Новый результат и момент перехода прав: [после полной оплаты / по акту / иной момент].', 'Права на ранее созданные компоненты остаются у их правообладателей; заказчику предоставляется достаточная лицензия.', 'Сторонние и open-source компоненты перечисляются с условиями лицензий. Право на портфолио: [разрешено / после письменного согласия].']],
                ['06 · Данные и конфиденциальность', ['Состав конфиденциальной информации, разрешённые получатели, срок защиты и исключения.', 'При обработке персональных данных: роли сторон, цель, перечень данных и операций, требования защиты, уведомления об инцидентах, возврат или уничтожение.', 'Производственные доступы передаются по принципу минимально необходимых прав.']],
                ['07 · Гарантии и ответственность', ['Гарантийный период, канал обращений, время реакции и границы поддержки.', 'Ответственность, неустойка и предел возмещения формулируются с учётом обязательных норм закона.', 'Обстоятельства непреодолимой силы, порядок уведомления и подтверждающие документы.']],
                ['08 · Электронное взаимодействие и споры', ['Согласованные адреса, аккаунты и правила определения отправителя электронного документа.', 'Перечень документов, признаваемых подписанными простой электронной подписью, и обязанность сохранять ключ в тайне.', 'Срок договора, порядок прекращения, претензионный срок, применимое право и компетентный суд.']],
            ],
        },
        {
            title: 'Акт приёмки',
            code: 'АКТ · [номер] · [дата]',
            preview: ['Результат', 'Версия', 'Замечания', 'Подписи'],
            lead: 'Фиксирует конкретно переданный результат, состояние проверки и юридически значимые последствия приёмки.',
            sections: [
                ['01 · Основание', ['Договор: [номер и дата] · этап/спринт: [номер].', 'Период выполнения: [даты].', 'Стоимость принимаемого этапа и статус расчётов: [значение].']],
                ['02 · Состав передачи', ['Продукт и версия: [название / номер сборки / адрес].', 'Исходный код, макеты, документация, доступы и иные материалы: [перечень].', 'Контрольная сумма или ссылка на неизменяемую версию: [значение].']],
                ['03 · Результат проверки', ['Критерии приёмки: [ссылка на спецификацию].', 'Статус: [принято] или [принято с перечисленными замечаниями].', 'Замечания, срок и порядок устранения: [таблица].']],
                ['04 · Права и обязательства', ['Момент перехода исключительных прав определяется договором и фактом [оплаты / подписания акта].', 'Гарантия и поддержка начинают действовать с [дата].', 'Стороны подтверждают состав передачи; скрытые недостатки регулируются договором и законом.']],
                ['05 · Подписание', ['ФИО, должности, основания полномочий и реквизиты сторон.', 'Способ подписания: [бумажный документ / ЭДО / простая электронная подпись по договору].', 'Дата и время подписания каждой стороной.']],
            ],
        },
    ],
    en: [
        { title: 'Commercial proposal', code: 'PROPOSAL · [number] · [date]', preview: ['Outcome', 'Stages', 'Estimate', 'Terms'], lead: 'A concise project map covering the intended outcome, acceptance, and estimate.', sections: [['01 · Context and outcome', ['Client, current situation, business objective, and measurable result.']], ['02 · Deliverables', ['Features, platforms, files, source code, documentation, builds, and access.']], ['03 · Stages and acceptance', ['Stage result, demo date, acceptance criteria, and change control.']], ['04 · Team and estimate', ['Roles, hours or fixed stage price, taxes, payment schedule, and validity period.']], ['05 · Legal frame', ['IP model, third-party components, confidentiality, personal data, and infrastructure costs.']]] },
        { title: 'Sprint report', code: 'SPRINT · [number] · [period]', preview: ['Goal', 'Delivered', 'Checks', 'Next step'], lead: 'One record of delivered work, checks, decisions, and the agreed next step.', sections: [['01 · Sprint goal', ['Period, verifiable goal, linked tasks, and build version.']], ['02 · Delivered result', ['Features, designs, code, build, documentation, and access.']], ['03 · Quality checks', ['Scenarios, environments, devices, findings, owners, and dates.']], ['04 · Time and decisions', ['Hours, cost, balance, client decisions, and scope changes.']], ['05 · Next step', ['Next sprint outcome, client dependencies, and demo date.']]] },
        { title: 'Development agreement', code: 'AGREEMENT · [number] · [place / date]', preview: ['Scope', 'Acceptance', 'IP', 'Data'], lead: 'A mixed development and services structure with a defined result, workflow, and rights.', sections: [['01 · Parties and scope', ['Legal details, authority, product definition, and specification.']], ['02 · Scope and changes', ['Deliverables, stages, dates, demos, and written change control.']], ['03 · Price and payments', ['Pricing model, schedule, taxes, licenses, services, and infrastructure.']], ['04 · Delivery and acceptance', ['Delivery channel, review period, reasoned findings, fixes, and new scope.']], ['05 · Intellectual property', ['New IP, transfer moment, pre-existing assets, third-party licenses, and portfolio rights.']], ['06 · Data and confidentiality', ['Protected information, personal-data roles, security, incidents, return, and deletion.']], ['07 · Warranty and liability', ['Warranty, support boundaries, mandatory legal rules, and force majeure.']], ['08 · Electronic records and disputes', ['Approved identities and channels, e-signature rules, termination, claims, governing law, and court.']]] },
        { title: 'Acceptance certificate', code: 'CERTIFICATE · [number] · [date]', preview: ['Result', 'Version', 'Findings', 'Signatures'], lead: 'A precise record of what was delivered, how it was checked, and the legal effect of acceptance.', sections: [['01 · Basis', ['Agreement, stage, delivery period, fee, and payment status.']], ['02 · Delivered items', ['Product version, source, designs, documentation, access, and immutable reference.']], ['03 · Review result', ['Acceptance criteria, status, findings, owners, and correction dates.']], ['04 · Rights and obligations', ['IP transfer trigger, warranty start, support, and hidden defects.']], ['05 · Signatures', ['Names, authority, signing method, date, and time.']]] },
    ],
};

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
    const prefersReducedMotion = useReducedMotion();
    const lang = i18n.language === 'ru' ? 'ru' : 'en';
    const c = COPY[lang];
    const [gallery, setGallery] = useState(null);
    const [documentViewer, setDocumentViewer] = useState(null);

    useEffect(() => {
        if (!gallery && documentViewer === null) return undefined;
        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = event => {
            if (event.key === 'Escape') {
                setGallery(null);
                setDocumentViewer(null);
            }
            if (gallery && event.key === 'ArrowLeft') {
                setGallery(current => current && ({ ...current, index: (current.index - 1 + current.assets.length) % current.assets.length }));
            }
            if (gallery && event.key === 'ArrowRight') {
                setGallery(current => current && ({ ...current, index: (current.index + 1) % current.assets.length }));
            }
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [gallery, documentViewer]);

    const moveGallery = direction => {
        setGallery(current => current && ({
            ...current,
            index: (current.index + direction + current.assets.length) % current.assets.length,
        }));
    };

    return (
        <div className="portfolio-page">
            <header className="portfolio-hero">
                <div className="portfolio-hero__aurora" aria-hidden="true" />
                <div className="container portfolio-hero__inner">
                    <div className="portfolio-hero__copy">
                        <motion.span className="portfolio-eyebrow" initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.225, delay: prefersReducedMotion ? 0 : 0.36 }}><Sparkles size={18} /> {c.eyebrow}</motion.span>
                        <h1 className="portfolio-hero__title">
                            <motion.span className="portfolio-hero__title-primary" initial={prefersReducedMotion ? false : { opacity: 0, y: 26, filter: 'blur(10px)', clipPath: 'inset(0 100% 0 0)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)', clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: prefersReducedMotion ? 0 : 0.45, delay: prefersReducedMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}>{c.titlePrimary}</motion.span>
                            <motion.span className="portfolio-hero__title-secondary" initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.35, delay: prefersReducedMotion ? 0 : 0.81, ease: [0.16, 1, 0.3, 1] }}>{c.titleSecondary}</motion.span>
                        </h1>
                        <motion.div className="portfolio-hero__meta" initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.325, delay: prefersReducedMotion ? 0 : 0.975 }}>
                            <p>{c.lead}</p>
                            <div className="portfolio-hero__actions"><a className="portfolio-button is-primary" href="#contact"><MessageCircle size={20} /> {c.discuss}</a><a className="portfolio-button" href="#cases">{c.cases} <ArrowRight size={20} /></a></div>
                        </motion.div>
                    </div>
                    <motion.div className="portfolio-showcase-stage" initial={prefersReducedMotion ? false : { opacity: 0, y: 52, scale: 0.92, filter: 'blur(9px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} transition={{ duration: prefersReducedMotion ? 0 : 0.575, delay: prefersReducedMotion ? 0 : 1.14, ease: [0.16, 1, 0.3, 1] }}>
                        <motion.div className="portfolio-showcase-tilt" initial={prefersReducedMotion ? false : { rotateZ: 0 }} animate={{ rotateZ: -2 }} transition={{ duration: prefersReducedMotion ? 0 : 0.42, delay: prefersReducedMotion ? 0 : 2.05, ease: [0.16, 1, 0.3, 1] }}>
                            <div className="portfolio-showcase">
                                <div className="portfolio-showcase__scan" aria-hidden="true" />
                                <div className="portfolio-showcase__pulse"><i /><span>8 PROJECTS · LIVE PORTFOLIO</span></div>
                                {c.projects.slice(0, 4).map((item, index) => { const external = isExternalHref(item.href); return <a href={item.href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} key={item.name}><span>0{index + 1}</span><strong>{item.name}</strong><small>{item.type}</small>{external ? <ExternalLink size={18} /> : <ArrowRight size={18} />}</a>; })}
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
                <motion.a className="portfolio-scroll-path" href="#project-b2b" aria-label={c.scrollHint} initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.275, delay: prefersReducedMotion ? 0 : 2.53 }}>
                    <span><b>01</b>{c.scrollHint}</span>
                    <svg viewBox="0 0 560 136" aria-hidden="true">
                        <defs>
                            <linearGradient id="portfolio-scroll-gradient" x1="20" y1="0" x2="534" y2="0" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#38c8dc" stopOpacity=".26" />
                                <stop offset=".5" stopColor="#75dfeb" stopOpacity=".72" />
                                <stop offset="1" stopColor="#9b7cff" stopOpacity=".5" />
                            </linearGradient>
                        </defs>
                        <motion.path className="portfolio-scroll-path__base" d="M20 63 C82 18 134 18 187 61 C240 104 290 100 337 58 C379 20 434 25 473 60 C500 84 511 102 520 112" initial={prefersReducedMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: prefersReducedMotion ? 0 : 0.85, delay: prefersReducedMotion ? 0 : 2.57, ease: [0.16, 1, 0.3, 1] }} />
                        <path className="portfolio-scroll-path__signal" d="M20 63 C82 18 134 18 187 61 C240 104 290 100 337 58 C379 20 434 25 473 60 C500 84 511 102 520 112" />
                        <circle className="portfolio-scroll-path__node is-start" cx="20" cy="63" r="5" />
                        <circle className="portfolio-scroll-path__node is-first" cx="187" cy="61" r="5" />
                        <circle className="portfolio-scroll-path__node is-second" cx="337" cy="58" r="5" />
                        <circle className="portfolio-scroll-path__node is-third" cx="473" cy="60" r="5" />
                        <circle className="portfolio-scroll-path__target" cx="520" cy="112" r="12" />
                        <path className="portfolio-scroll-path__arrow" d="M506 105 L520 119 L534 105" />
                    </svg>
                </motion.a>
            </header>

            <section className="portfolio-proof"><div className="container portfolio-proof__grid">{c.proof.map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}</div></section>

            <main>
                <section className="portfolio-section portfolio-section--cases" id="cases"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.casesLabel}</span><h2>{c.casesTitle}</h2></div><div className="portfolio-case-list">{c.projects.map((project, index) => { const meta = PROJECT_META[index]; const Icon = meta.icon; const external = isExternalHref(project.href); return <motion.article id={`project-${meta.id}`} whileHover={{ x: 6 }} key={meta.id} className={`portfolio-case-row tone-${meta.tone} ${meta.assets ? 'has-media' : 'is-compact'}`}><span className="portfolio-case-row__number">{String(index + 1).padStart(2, '0')}</span><div className="portfolio-case-row__identity"><span className="portfolio-case-row__type"><Icon size={20} /><span>{project.type}</span></span><h3>{project.name}</h3></div><p className="portfolio-case-row__description">{project.text}</p>{meta.assets && <div className={`portfolio-case-row__media media-${meta.id}`}>{meta.assets.map((asset, assetIndex) => <button type="button" onClick={() => setGallery({ project, assets: meta.assets, index: assetIndex })} aria-label={lang === 'ru' ? `Открыть скриншот проекта ${project.name}` : `Open ${project.name} screenshot`} key={asset}><img src={staticAsset(asset)} alt={`${project.name} — ${assetIndex + 1}`} loading="lazy" /><span><Maximize2 size={20} aria-hidden="true" /></span></button>)}</div>}<a className="portfolio-case-row__action" href={project.href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{project.href === '#contact' ? c.projectDetails : c.projectAction} {external ? <ExternalLink size={20} /> : <ArrowRight size={20} />}</a></motion.article>; })}</div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--manager"><div className="container"><AnimatedSection className="portfolio-manager"><figure><img src={staticAsset('/sergey.jpg')} alt={`${c.managerName}, ${c.managerRole}`} loading="lazy" /><figcaption>{c.managerRole}</figcaption></figure><div><span className="portfolio-kicker">{c.managerLabel}</span><h2>{c.managerName}</h2><p>{c.managerLead}</p><ul>{c.managerItems.map((item, index) => <li key={item} style={{ '--manager-index': index }}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ul><a className="portfolio-button" href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">{c.managerAction} <ArrowRight size={20} /></a></div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--process" id="process"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.processLabel}</span><h2>{c.processTitle}</h2><p>{c.processLead}</p></div><div className="portfolio-process"><div className="portfolio-process__track" aria-hidden="true"><i /><b><span /></b></div>{c.process.map(([number, title, text, outcome], index) => { const Icon = processIcons[index]; return <article key={number} style={{ '--stage-index': index }}><div className="portfolio-process__visual"><span className="portfolio-process__icon"><Icon size={25} aria-hidden="true" /></span><span className="portfolio-process__number">{number}</span></div><h3>{title}</h3><strong className="portfolio-process__outcome">{outcome}</strong><p>{text}</p></article>; })}</div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--offer"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.offerLabel}</span><h2>{c.offerTitle}</h2><p>{c.offerLead}</p></div><div className="portfolio-pricing"><article className="is-primary"><header><div><Gauge size={24} /><h3>{c.standardTitle}</h3></div><em><TrendingDown size={20} /> {c.marketBadge}</em></header><div className="portfolio-pricing__price"><strong className="type-display">{c.standardPrice}</strong><span>{c.standardCaption}</span></div><div className="portfolio-pricing__flow">{c.offerFlow.map((item, index) => <span key={item}>{item}{index < c.offerFlow.length - 1 && <ArrowRight size={18} />}</span>)}</div><ul>{c.standardItems.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ul></article><article><header><div><ShieldCheck size={24} /><h3>{c.flexibleTitle}</h3></div><em>{c.flexibleNote}</em></header><div className="portfolio-pricing__price"><strong className="type-display">{c.flexiblePrice}</strong><span>{c.flexibleCaption}</span></div><ul>{c.flexibleItems.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ul></article></div><p className="portfolio-offer-note">{c.offerFootnote}</p></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--documents" id="documents"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.docsLabel}</span><h2>{c.docsTitle}</h2></div><div className="portfolio-documents">{c.documents.map(([title, text], index) => { const Icon = documentIcons[index]; const template = DOCUMENT_TEMPLATES[lang][index]; return <button className="portfolio-document-card" type="button" onClick={() => setDocumentViewer(index)} aria-label={`${c.documentOpen}: ${title}`} key={title}><span className="portfolio-document-card__meta"><Icon size={24} /><span>{String(index + 1).padStart(2, '0')}</span></span><span className="portfolio-document-card__paper" aria-hidden="true"><i>{template.code}</i><b>{title}</b>{template.preview.map((item, itemIndex) => <em key={item}><span>{String(itemIndex + 1).padStart(2, '0')}</span>{item}</em>)}<small>MEMORA SOLUTIONS · {String(index + 1).padStart(2, '0')}</small></span><span className="portfolio-document-card__copy"><strong>{title}</strong><span>{text}</span></span><span className="portfolio-document-card__action">{c.documentOpen} <ArrowRight size={20} /></span></button>; })}</div></AnimatedSection></div></section>

                <section className="portfolio-section portfolio-section--contact" id="contact"><div className="container"><AnimatedSection><div className="portfolio-section-head"><span>{c.contact.label}</span><h2>{c.contact.title}</h2><p>{c.contact.text}</p></div><ProjectInquiry copy={c.contact} lang={lang} /></AnimatedSection></div></section>
            </main>
            {documentViewer !== null && (() => { const template = DOCUMENT_TEMPLATES[lang][documentViewer]; return <div className="portfolio-document-viewer" role="dialog" aria-modal="true" aria-labelledby="document-viewer-title"><button className="portfolio-document-viewer__backdrop" type="button" onClick={() => setDocumentViewer(null)} aria-label={c.documentClose} /><div className="portfolio-document-viewer__panel"><header><div><span>{c.documentExample}</span><strong id="document-viewer-title">{template.title}</strong></div><button type="button" onClick={() => setDocumentViewer(null)} aria-label={c.documentClose}><X size={26} /></button></header><div className="portfolio-document-viewer__layout"><nav aria-label={lang === 'ru' ? 'Примеры документов' : 'Document examples'}>{DOCUMENT_TEMPLATES[lang].map((item, index) => { const Icon = documentIcons[index]; return <button type="button" className={index === documentViewer ? 'is-active' : ''} onClick={() => setDocumentViewer(index)} key={item.title}><Icon size={22} /><span>{item.title}</span></button>; })}</nav><article className="portfolio-document-sheet"><div className="portfolio-document-sheet__head"><span>{template.code}</span><h2>{template.title}</h2><p>{template.lead}</p></div><div className="portfolio-document-sheet__sections">{template.sections.map(([title, points]) => <section key={title}><h3>{title}</h3><ul>{points.map(point => <li key={point}>{point}</li>)}</ul></section>)}</div><aside><ShieldCheck size={24} /><p>{c.documentNotice}</p></aside></article></div></div></div>; })()}
            {gallery && <div className="portfolio-lightbox" role="dialog" aria-modal="true" aria-label={lang === 'ru' ? `Скриншоты проекта ${gallery.project.name}` : `${gallery.project.name} screenshots`}><button className="portfolio-lightbox__backdrop" type="button" onClick={() => setGallery(null)} aria-label={lang === 'ru' ? 'Закрыть просмотр' : 'Close viewer'} /><div className="portfolio-lightbox__panel"><div className="portfolio-lightbox__header"><strong>{gallery.project.name}</strong><span>{gallery.index + 1} / {gallery.assets.length}</span><a href={staticAsset(gallery.assets[gallery.index])} target="_blank" rel="noopener noreferrer" aria-label={lang === 'ru' ? 'Открыть оригинал' : 'Open original'}><Maximize2 size={22} /></a><button type="button" onClick={() => setGallery(null)} aria-label={lang === 'ru' ? 'Закрыть' : 'Close'}><X size={24} /></button></div><div className={`portfolio-lightbox__stage ${gallery.assets.length === 1 ? 'is-single' : ''}`}>{gallery.assets.length > 1 && <button type="button" onClick={() => moveGallery(-1)} aria-label={lang === 'ru' ? 'Предыдущий скриншот' : 'Previous screenshot'}><ChevronLeft size={30} /></button>}<img src={staticAsset(gallery.assets[gallery.index])} alt={`${gallery.project.name} — ${gallery.index + 1}`} />{gallery.assets.length > 1 && <button type="button" onClick={() => moveGallery(1)} aria-label={lang === 'ru' ? 'Следующий скриншот' : 'Next screenshot'}><ChevronRight size={30} /></button>}</div></div></div>}
        </div>
    );
}
