import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './PrivacyPage.css';

const COPY = {
    ru: {
        eyebrow: 'Memora Solutions · данные',
        title: 'Политика обработки персональных данных',
        updated: 'Редакция от 28 августа 2026 года',
        intro: 'Эта политика описывает данные, которые получает сайт memorasolutions.ru, цели обработки и способы управления своими данными.',
        operatorTitle: 'Оператор и контакт',
        operator: 'Оператор: Сергей Маклаков, проект Memora Solutions. Запросы о данных принимаются по адресу',
        dataTitle: 'Какие данные обрабатываются',
        data: [
            'Имя, телефон, email, Telegram username и текст обращения — когда вы отправляете запрос команде.',
            'Email, Telegram ID и username, настройки маршрута, идентификаторы подписки и платежа — когда вы подключаете персональный Радар путешествий.',
            'IP-адрес, user agent, путь страницы и сведения о технической ошибке — для защиты сервиса и диагностики сбоев. Параметры и фрагмент URL в диагностический журнал не записываются.',
        ],
        purposeTitle: 'Цели и основания обработки',
        purpose: [
            'Ответ на обращение и подготовка предложения — на основании вашего согласия и действий до заключения договора.',
            'Работа платной подписки, уведомления, оплата и чеки — для исполнения договора и требований законодательства.',
            'Защита сайта, ограничение злоупотреблений и устранение ошибок — в законном интересе поддерживать устойчивый сервис.',
        ],
        servicesTitle: 'Подключённые сервисы',
        services: 'Платёж выполняет ЮKassa; сообщения доставляет Telegram; данные приложения хранятся в PostgreSQL на серверной инфраструктуре проекта. Реквизиты банковской карты обрабатывает ЮKassa — сайт Memora Solutions их не получает и не хранит.',
        retentionTitle: 'Сроки хранения',
        retention: 'Обращения хранятся до 12 месяцев после последнего контакта. Данные активной подписки хранятся весь срок обслуживания; связанные с расчётами сведения сохраняются в сроки, установленные законом. Технические журналы очищаются по мере ротации. После достижения цели данные удаляются или обезличиваются.',
        rightsTitle: 'Ваши действия',
        rights: 'По email можно запросить сведения об обработке, исправление, удаление данных или отозвать согласие. В запросе укажите контакт, который использовали на сайте. Автопродление Радара отключается в интерфейсе подписки; оплаченный период продолжает действовать до даты окончания.',
        safetyTitle: 'Защита',
        safety: 'Передача данных идёт по HTTPS. Доступ к админ-интерфейсу ограничен, секреты хранятся на сервере, а персональные токены передаются в теле защищённых запросов.',
        back: 'Вернуться на главную',
    },
    en: {
        eyebrow: 'Memora Solutions · data',
        title: 'Personal data processing policy',
        updated: 'Effective August 28, 2026',
        intro: 'This policy explains which data memorasolutions.ru receives, why it is processed, and how you can manage it.',
        operatorTitle: 'Controller and contact',
        operator: 'Controller: Sergey Maklakov, Memora Solutions project. Data requests are accepted at',
        dataTitle: 'Data we process',
        data: [
            'Name, phone, email, Telegram username, and request text when you contact the team.',
            'Email, Telegram ID and username, route settings, subscription ID, and payment ID when you activate personal Travel Radar alerts.',
            'IP address, user agent, page path, and technical error details for service protection and diagnostics. Query parameters and URL fragments are excluded from diagnostic logs.',
        ],
        purposeTitle: 'Purposes and legal bases',
        purpose: [
            'Replying to a request and preparing an offer, based on your consent and pre-contract steps.',
            'Providing a paid subscription, notifications, payments, and receipts to perform the contract and meet legal duties.',
            'Protecting the site, limiting abuse, and resolving errors in the legitimate interest of operating a reliable service.',
        ],
        servicesTitle: 'Connected services',
        services: 'YooKassa processes payments; Telegram delivers messages; application data is stored in PostgreSQL on the project infrastructure. YooKassa processes bank card details; Memora Solutions does not receive or store them.',
        retentionTitle: 'Retention',
        retention: 'Requests are retained for up to 12 months after the last contact. Active subscription data is retained throughout service delivery; payment-related records follow statutory periods. Technical logs are removed through rotation. Data is deleted or anonymised after its purpose is fulfilled.',
        rightsTitle: 'Your choices',
        rights: 'You may request access, correction, deletion, or withdraw consent by email. Include the contact detail used on the site. Travel Radar auto-renewal can be disabled in the subscription interface; the paid period remains available until its end date.',
        safetyTitle: 'Protection',
        safety: 'Data is transferred over HTTPS. Admin access is restricted, secrets remain on the server, and personal tokens travel inside protected request bodies.',
        back: 'Back to home',
    },
};

export default function PrivacyPage() {
    const { i18n } = useTranslation();
    const copy = COPY[i18n.language === 'en' ? 'en' : 'ru'];

    return (
        <div className="privacy-page">
            <article className="privacy-page__document">
                <header>
                    <span>{copy.eyebrow}</span>
                    <h1>{copy.title}</h1>
                    <p>{copy.updated}</p>
                </header>
                <p className="privacy-page__lead">{copy.intro}</p>
                <section><h2>{copy.operatorTitle}</h2><p>{copy.operator} <a href="mailto:s.maklakov@armk.pro">s.maklakov@armk.pro</a>.</p></section>
                <section><h2>{copy.dataTitle}</h2><ul>{copy.data.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section><h2>{copy.purposeTitle}</h2><ul>{copy.purpose.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section><h2>{copy.servicesTitle}</h2><p>{copy.services}</p></section>
                <section><h2>{copy.retentionTitle}</h2><p>{copy.retention}</p></section>
                <section><h2>{copy.rightsTitle}</h2><p>{copy.rights}</p></section>
                <section><h2>{copy.safetyTitle}</h2><p>{copy.safety}</p></section>
                <Link className="privacy-page__back" to="/">{copy.back}</Link>
            </article>
        </div>
    );
}
