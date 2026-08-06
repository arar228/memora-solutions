import { useEffect, useMemo, useState } from 'react';
import {
    ArrowUpRight,
    BarChart3,
    Bell,
    CalendarDays,
    CarFront,
    Check,
    Coffee,
    Copy,
    Gift,
    History,
    House,
    List,
    Plus,
    Repeat2,
    RotateCcw,
    Send,
    Settings,
    Shapes,
    ShoppingBasket,
    Sparkles,
    Trash2,
    UserRound,
    Users,
    WalletCards,
} from 'lucide-react';
import './ProductDemo.css';

const COPY = {
    ru: {
        common: {
            demo: 'Интерактивное демо',
            browserData: 'Данные этого браузера',
            reset: 'Вернуть пример',
            telegram: 'Продолжить в Telegram',
            limited: 'Демо-режим',
        },
        wallet: {
            title: 'Memora Wallet',
            lead: 'Добавляйте расходы, меняйте бюджет и смотрите, как собирается финансовая картина.',
            tabs: { overview: 'Обзор', history: 'История', settings: 'Настройки' },
            spent: 'Потрачено за месяц', remaining: 'Осталось по плану', budget: 'Бюджет',
            quick: 'Быстрый ввод', amount: 'Сумма', add: 'Добавить расход', category: 'Категория',
            recent: 'Последние расходы', all: 'Все операции', breakdown: 'По категориям',
            empty: 'Добавьте первый расход', saved: 'Расход добавлен', invalid: 'Укажите сумму больше нуля.',
            budgetSettings: 'Финансовый месяц', budgetHint: 'Задайте сумму, которую планируете потратить за месяц.',
            saveBudget: 'Сохранить бюджет', budgetSaved: 'Бюджет обновлён', currency: 'Валюта',
            categories: { products: 'Продукты', transport: 'Транспорт', cafe: 'Кафе', subscriptions: 'Подписки', home: 'Дом', other: 'Другое' },
        },
        bday: {
            title: 'Memora BDayBot',
            lead: 'Добавляйте важные даты, готовьте поздравления и настраивайте удобный ритм напоминаний.',
            tabs: { dates: 'Даты', add: 'Добавить', greeting: 'Поздравление', settings: 'Настройки' },
            contacts: 'Именинники', upcoming: 'Ближайшие даты', days: 'дн.', today: 'Сегодня',
            name: 'Имя', relation: 'Кем приходится', birthday: 'Дата рождения', save: 'Сохранить дату',
            contactSaved: 'Дата добавлена', invalid: 'Укажите имя и дату рождения.',
            greetingTitle: 'Конструктор поздравления', choose: 'Получатель', tone: 'Тон', generate: 'Создать вариант',
            tones: { warm: 'Тёплый', business: 'Деловой', short: 'Короткий' }, copy: 'Скопировать', copied: 'Скопировано',
            reminders: 'Напоминания', sameDay: 'В день рождения', advance: 'Заранее за 3 дня', active: 'Включено',
            settingsHint: 'Демо показывает логику настроек. Telegram-бот отправляет напоминания в выбранное время.',
        },
    },
    en: {
        common: {
            demo: 'Interactive demo', browserData: 'This browser data', reset: 'Restore sample',
            telegram: 'Continue in Telegram', limited: 'Demo mode',
        },
        wallet: {
            title: 'Memora Wallet', lead: 'Add expenses, adjust the budget, and see your financial picture take shape.',
            tabs: { overview: 'Overview', history: 'History', settings: 'Settings' },
            spent: 'Spent this month', remaining: 'Remaining in plan', budget: 'Budget', quick: 'Quick entry', amount: 'Amount', add: 'Add expense', category: 'Category',
            recent: 'Recent expenses', all: 'All transactions', breakdown: 'By category', empty: 'Add your first expense', saved: 'Expense added', invalid: 'Enter an amount greater than zero.',
            budgetSettings: 'Financial month', budgetHint: 'Set the amount you plan to spend this month.', saveBudget: 'Save budget', budgetSaved: 'Budget updated', currency: 'Currency',
            categories: { products: 'Groceries', transport: 'Transport', cafe: 'Cafe', subscriptions: 'Subscriptions', home: 'Home', other: 'Other' },
        },
        bday: {
            title: 'Memora BDayBot', lead: 'Add important dates, prepare greetings, and set a comfortable reminder rhythm.',
            tabs: { dates: 'Dates', add: 'Add', greeting: 'Greeting', settings: 'Settings' },
            contacts: 'Birthdays', upcoming: 'Upcoming dates', days: 'days', today: 'Today', name: 'Name', relation: 'Relationship', birthday: 'Birthday', save: 'Save date',
            contactSaved: 'Date added', invalid: 'Add a name and birthday.', greetingTitle: 'Greeting builder', choose: 'Recipient', tone: 'Tone', generate: 'Create version',
            tones: { warm: 'Warm', business: 'Business', short: 'Short' }, copy: 'Copy', copied: 'Copied', reminders: 'Reminders', sameDay: 'On the birthday', advance: 'Three days ahead', active: 'On',
            settingsHint: 'The demo shows the settings flow. The Telegram bot sends reminders at your chosen time.',
        },
    },
};

const CATEGORY_META = {
    products: { icon: ShoppingBasket, color: '#5fd091' },
    transport: { icon: CarFront, color: '#65a8f3' },
    cafe: { icon: Coffee, color: '#e3a36c' },
    subscriptions: { icon: Repeat2, color: '#9c86ef' },
    home: { icon: House, color: '#e9ba5d' },
    other: { icon: Shapes, color: '#91a0b4' },
};

function CategoryGlyph({ category, compact = false }) {
    const meta = CATEGORY_META[category] || CATEGORY_META.other;
    const Icon = meta.icon;
    return (
        <span
            className={`demo-category-glyph ${compact ? 'is-compact' : ''}`}
            style={{ '--category-color': meta.color, '--category-soft': `${meta.color}1f` }}
        >
            <Icon size={compact ? 16 : 19} strokeWidth={2.2} />
        </span>
    );
}

function localDate(daysAhead = 0, birthYear) {
    const value = new Date();
    value.setDate(value.getDate() + daysAhead);
    if (birthYear) value.setFullYear(birthYear);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const defaultWallet = () => ({
    budget: 60000,
    currency: '₽',
    expenses: [
        { id: 'sample-1', amount: 2850, category: 'products', date: localDate(0) },
        { id: 'sample-2', amount: 640, category: 'transport', date: localDate(-1) },
        { id: 'sample-3', amount: 1290, category: 'subscriptions', date: localDate(-2) },
        { id: 'sample-4', amount: 520, category: 'cafe', date: localDate(-3) },
    ],
});

const defaultBday = () => ({
    contacts: [
        { id: 'birthday-1', name: 'Анна', relation: 'Подруга', birthday: localDate(3, 1994) },
        { id: 'birthday-2', name: 'Михаил', relation: 'Коллега', birthday: localDate(11, 1989) },
        { id: 'birthday-3', name: 'Елена', relation: 'Мама', birthday: localDate(24, 1968) },
    ],
    sameDay: true,
    advance: true,
});

function useLocalDemo(key, factory) {
    const [value, setValue] = useState(() => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : factory();
        } catch {
            return factory();
        }
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, setValue];
}

function formatDate(value, lang, includeYear = false) {
    return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
        day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}),
    }).format(new Date(`${value}T12:00:00`));
}

function money(value, currency, lang) {
    return `${new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US').format(Math.round(value))} ${currency}`;
}

function daysUntil(value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const source = new Date(`${value}T12:00:00`);
    let next = new Date(today.getFullYear(), source.getMonth(), source.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, source.getMonth(), source.getDate());
    return Math.round((next - today) / 86400000);
}

function DemoShell({ variant, lang, iconImg, iconAlt, botUrl, children, onReset }) {
    const copy = COPY[lang];
    const product = copy[variant];
    return (
        <section className={`product-demo product-demo--${variant}`} id="web-demo" data-typography-exempt aria-label={`${product.title} — ${copy.common.demo}`}>
            <header className="product-demo__header">
                <div className="product-demo__brand">
                    <img src={iconImg} alt={iconAlt} />
                    <div><span>{copy.common.demo}</span><strong>{product.title}</strong></div>
                </div>
                <div className="product-demo__header-actions">
                    <span className="product-demo__local"><Check size={18} /> {copy.common.browserData}</span>
                    <button className="product-demo__reset" type="button" onClick={onReset} title={copy.common.reset}><RotateCcw size={19} /><span>{copy.common.reset}</span></button>
                    <a className="product-demo__telegram" href={botUrl} target="_blank" rel="noopener noreferrer"><Send size={19} /><span>{copy.common.telegram}</span><ArrowUpRight size={17} /></a>
                </div>
            </header>
            <div className="product-demo__intro">
                <span>{copy.common.limited}</span>
                <p>{product.lead}</p>
            </div>
            {children}
        </section>
    );
}

function WalletDemo({ lang, iconImg, iconAlt, botUrl }) {
    const c = COPY[lang].wallet;
    const [data, setData] = useLocalDemo('memora-wallet-web-demo', defaultWallet);
    const [tab, setTab] = useState('overview');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('products');
    const [feedback, setFeedback] = useState('');
    const [draftBudget, setDraftBudget] = useState(String(data.budget));

    const total = useMemo(() => data.expenses.reduce((sum, item) => sum + Number(item.amount), 0), [data.expenses]);
    const grouped = useMemo(() => Object.keys(CATEGORY_META).map(key => ({
        key,
        value: data.expenses.filter(item => item.category === key).reduce((sum, item) => sum + Number(item.amount), 0),
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value), [data.expenses]);
    const maxCategory = Math.max(...grouped.map(item => item.value), 1);
    const progress = Math.min(100, (total / Math.max(data.budget, 1)) * 100);

    const addExpense = event => {
        event.preventDefault();
        const parsed = Number(String(amount).replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setFeedback(c.invalid);
            return;
        }
        setData(current => ({ ...current, expenses: [{ id: `expense-${Date.now()}`, amount: parsed, category, date: localDate(0) }, ...current.expenses] }));
        setAmount('');
        setFeedback(c.saved);
    };

    const saveBudget = event => {
        event.preventDefault();
        const parsed = Number(draftBudget);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setFeedback(c.invalid);
            return;
        }
        setData(current => ({ ...current, budget: parsed }));
        setFeedback(c.budgetSaved);
    };

    const removeExpense = id => setData(current => ({ ...current, expenses: current.expenses.filter(item => item.id !== id) }));
    const reset = () => { const next = defaultWallet(); setData(next); setDraftBudget(String(next.budget)); setTab('overview'); setFeedback(''); };

    return (
        <DemoShell variant="wallet" lang={lang} iconImg={iconImg} iconAlt={iconAlt} botUrl={botUrl} onReset={reset}>
            <nav className="product-demo__tabs" aria-label={c.title}>
                {[['overview', BarChart3], ['history', History], ['settings', Settings]].map(([key, Icon]) => <button type="button" className={tab === key ? 'is-active' : ''} onClick={() => { setTab(key); setFeedback(''); }} key={key}><Icon size={20} /><span>{c.tabs[key]}</span></button>)}
            </nav>

            {tab === 'overview' && <div className="wallet-demo__overview">
                <section className="demo-panel wallet-demo__summary">
                    <div className="wallet-demo__summary-head"><span>{c.spent}</span><WalletCards size={24} /></div>
                    <strong>{money(total, data.currency, lang)}</strong>
                    <div className="wallet-demo__progress"><i style={{ width: `${progress}%` }} /></div>
                    <div className="wallet-demo__summary-foot"><span>{c.remaining}<b>{money(Math.max(data.budget - total, 0), data.currency, lang)}</b></span><span>{c.budget}<b>{money(data.budget, data.currency, lang)}</b></span></div>
                </section>

                <form className="demo-panel wallet-demo__quick" onSubmit={addExpense}>
                    <div className="demo-panel__title"><Plus size={22} /><h3>{c.quick}</h3></div>
                    <label>{c.amount}<div className="wallet-demo__amount"><input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="1 500" /><span>{data.currency}</span></div></label>
                    <fieldset>
                        <legend>{c.category}</legend>
                        <div className="wallet-demo__categories">
                            {Object.keys(CATEGORY_META).map(key => (
                                <button type="button" className={category === key ? 'is-active' : ''} onClick={() => setCategory(key)} key={key}>
                                    <CategoryGlyph category={key} compact />
                                    <span>{c.categories[key]}</span>
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <button className="demo-primary-action" type="submit"><Plus size={20} />{c.add}</button>
                    {feedback && <p className="demo-feedback" role="status">{feedback}</p>}
                </form>

                <section className="demo-panel wallet-demo__breakdown">
                    <div className="demo-panel__title"><BarChart3 size={22} /><h3>{c.breakdown}</h3></div>
                    <div className="wallet-demo__bars">{grouped.map(item => {
                        const meta = CATEGORY_META[item.key];
                        return <div key={item.key}>
                            <span><CategoryGlyph category={item.key} compact /><span>{c.categories[item.key]}</span></span>
                            <b>{money(item.value, data.currency, lang)}</b>
                            <i><span style={{ width: `${(item.value / maxCategory) * 100}%`, background: meta.color }} /></i>
                        </div>;
                    })}</div>
                </section>

                <ExpenseList title={c.recent} expenses={data.expenses.slice(0, 4)} lang={lang} currency={data.currency} categories={c.categories} onRemove={removeExpense} empty={c.empty} />
            </div>}

            {tab === 'history' && <div className="wallet-demo__single"><ExpenseList title={c.all} expenses={data.expenses} lang={lang} currency={data.currency} categories={c.categories} onRemove={removeExpense} empty={c.empty} /></div>}

            {tab === 'settings' && <form className="demo-panel wallet-demo__settings" onSubmit={saveBudget}>
                <div className="demo-panel__title"><Settings size={22} /><h3>{c.budgetSettings}</h3></div>
                <p>{c.budgetHint}</p>
                <div className="wallet-demo__settings-fields"><label>{c.budget}<input inputMode="numeric" value={draftBudget} onChange={event => setDraftBudget(event.target.value)} /></label><label>{c.currency}<select value={data.currency} onChange={event => setData(current => ({ ...current, currency: event.target.value }))}><option>₽</option><option>$</option><option>€</option></select></label></div>
                <button className="demo-primary-action" type="submit"><Check size={20} />{c.saveBudget}</button>
                {feedback && <p className="demo-feedback" role="status">{feedback}</p>}
            </form>}
        </DemoShell>
    );
}

function ExpenseList({ title, expenses, lang, currency, categories, onRemove, empty }) {
    return <section className="demo-panel wallet-demo__transactions">
        <div className="demo-panel__title"><List size={22} /><h3>{title}</h3><span>{expenses.length}</span></div>
        {expenses.length ? <div className="wallet-demo__transaction-list">{expenses.map(item => (
            <article key={item.id}>
                <CategoryGlyph category={item.category} />
                <div><strong>{categories[item.category] || categories.other}</strong><span>{formatDate(item.date, lang)}</span></div>
                <b>{money(item.amount, currency, lang)}</b>
                <button type="button" onClick={() => onRemove(item.id)} aria-label={lang === 'ru' ? `Удалить расход ${categories[item.category]}` : `Delete ${categories[item.category]} expense`}><Trash2 size={18} /></button>
            </article>
        ))}</div> : <p className="demo-empty">{empty}</p>}
    </section>;
}

function greetingFor(contact, tone, lang) {
    if (!contact) return '';
    if (lang === 'en') {
        if (tone === 'business') return `${contact.name}, happy birthday! Wishing you strong results, inspiring projects, and a year full of meaningful achievements.`;
        if (tone === 'short') return `${contact.name}, happy birthday! Wishing you joy, energy, and wonderful moments.`;
        return `${contact.name}, happy birthday! May the year ahead bring warm meetings, bold ideas, and plenty of reasons to smile. Wishing you happiness and inspiration!`;
    }
    if (tone === 'business') return `${contact.name}, поздравляю с днём рождения! Желаю сильных результатов, интересных проектов и года, наполненного значимыми достижениями.`;
    if (tone === 'short') return `${contact.name}, с днём рождения! Радости, энергии и прекрасных событий!`;
    return `${contact.name}, с днём рождения! Пусть впереди будет больше тёплых встреч, смелых идей и поводов улыбаться. Желаю счастья, вдохновения и исполнения желаний!`;
}

function BdayDemo({ lang, iconImg, iconAlt, botUrl }) {
    const c = COPY[lang].bday;
    const [data, setData] = useLocalDemo('memora-bday-web-demo', defaultBday);
    const [tab, setTab] = useState('dates');
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [birthday, setBirthday] = useState('');
    const [selectedId, setSelectedId] = useState(data.contacts[0]?.id || '');
    const [tone, setTone] = useState('warm');
    const [greeting, setGreeting] = useState('');
    const [feedback, setFeedback] = useState('');
    const [copied, setCopied] = useState(false);

    const contacts = useMemo(() => [...data.contacts].sort((a, b) => daysUntil(a.birthday) - daysUntil(b.birthday)), [data.contacts]);
    const selected = data.contacts.find(contact => contact.id === selectedId) || data.contacts[0];

    const addContact = event => {
        event.preventDefault();
        if (!name.trim() || !birthday) {
            setFeedback(c.invalid);
            return;
        }
        const contact = { id: `contact-${Date.now()}`, name: name.trim(), relation: relation.trim(), birthday };
        setData(current => ({ ...current, contacts: [...current.contacts, contact] }));
        setSelectedId(contact.id);
        setName(''); setRelation(''); setBirthday(''); setFeedback(c.contactSaved); setTab('dates');
    };

    const makeGreeting = () => { setGreeting(greetingFor(selected, tone, lang)); setCopied(false); };
    const copyGreeting = async () => {
        if (!greeting) return;
        try { await navigator.clipboard.writeText(greeting); } catch { /* Clipboard access depends on browser permissions. */ }
        setCopied(true);
    };
    const removeContact = id => {
        setData(current => ({ ...current, contacts: current.contacts.filter(contact => contact.id !== id) }));
        if (selectedId === id) setSelectedId('');
    };
    const reset = () => { const next = defaultBday(); setData(next); setSelectedId(next.contacts[0].id); setTab('dates'); setGreeting(''); setFeedback(''); };

    return (
        <DemoShell variant="bday" lang={lang} iconImg={iconImg} iconAlt={iconAlt} botUrl={botUrl} onReset={reset}>
            <nav className="product-demo__tabs" aria-label={c.title}>
                {[['dates', CalendarDays], ['add', Plus], ['greeting', Sparkles], ['settings', Settings]].map(([key, Icon]) => <button type="button" className={tab === key ? 'is-active' : ''} onClick={() => { setTab(key); setFeedback(''); }} key={key}><Icon size={20} /><span>{c.tabs[key]}</span></button>)}
            </nav>

            {tab === 'dates' && <div className="bday-demo__dates">
                <section className="demo-panel bday-demo__metric"><div><span>{c.contacts}</span><strong>{data.contacts.length}</strong></div><Users size={32} /></section>
                <section className="demo-panel bday-demo__metric"><div><span>{c.upcoming}</span><strong>{contacts[0] ? (daysUntil(contacts[0].birthday) === 0 ? c.today : `${daysUntil(contacts[0].birthday)} ${c.days}`) : '—'}</strong></div><Gift size={32} /></section>
                <section className="demo-panel bday-demo__list"><div className="demo-panel__title"><CalendarDays size={22} /><h3>{c.upcoming}</h3><span>{contacts.length}</span></div><div>{contacts.map(contact => { const left = daysUntil(contact.birthday); return <article key={contact.id}><span className="bday-demo__avatar">{contact.name.slice(0, 1).toUpperCase()}</span><div><strong>{contact.name}</strong><span>{contact.relation || formatDate(contact.birthday, lang, true)}</span></div><time>{formatDate(contact.birthday, lang)}<b>{left === 0 ? c.today : `${left} ${c.days}`}</b></time><button type="button" onClick={() => removeContact(contact.id)} aria-label={lang === 'ru' ? `Удалить ${contact.name}` : `Delete ${contact.name}`}><Trash2 size={18} /></button></article>; })}</div></section>
            </div>}

            {tab === 'add' && <form className="demo-panel bday-demo__form" onSubmit={addContact}>
                <div className="demo-panel__title"><UserRound size={22} /><h3>{c.tabs.add}</h3></div>
                <div className="bday-demo__fields"><label>{c.name}<input value={name} onChange={event => setName(event.target.value)} placeholder={lang === 'ru' ? 'Например, Мария' : 'For example, Maria'} /></label><label>{c.relation}<input value={relation} onChange={event => setRelation(event.target.value)} placeholder={lang === 'ru' ? 'Подруга, коллега, мама' : 'Friend, colleague, mother'} /></label><label>{c.birthday}<input type="date" value={birthday} onChange={event => setBirthday(event.target.value)} onInput={event => setBirthday(event.currentTarget.value)} /></label></div>
                <button className="demo-primary-action" type="submit"><Check size={20} />{c.save}</button>
                {feedback && <p className="demo-feedback" role="status">{feedback}</p>}
            </form>}

            {tab === 'greeting' && <section className="demo-panel bday-demo__greeting">
                <div className="demo-panel__title"><Sparkles size={22} /><h3>{c.greetingTitle}</h3></div>
                <div className="bday-demo__greeting-controls"><label>{c.choose}<select value={selected?.id || ''} onChange={event => { setSelectedId(event.target.value); setGreeting(''); }}>{data.contacts.map(contact => <option value={contact.id} key={contact.id}>{contact.name}</option>)}</select></label><fieldset><legend>{c.tone}</legend><div>{Object.keys(c.tones).map(key => <button type="button" className={tone === key ? 'is-active' : ''} onClick={() => { setTone(key); setGreeting(''); }} key={key}>{c.tones[key]}</button>)}</div></fieldset></div>
                <button className="demo-primary-action" type="button" onClick={makeGreeting} disabled={!selected}><Sparkles size={20} />{c.generate}</button>
                {greeting && <div className="bday-demo__greeting-result"><p>{greeting}</p><button type="button" onClick={copyGreeting}>{copied ? <Check size={19} /> : <Copy size={19} />}{copied ? c.copied : c.copy}</button></div>}
            </section>}

            {tab === 'settings' && <section className="demo-panel bday-demo__settings">
                <div className="demo-panel__title"><Bell size={22} /><h3>{c.reminders}</h3></div>
                <p>{c.settingsHint}</p>
                <button type="button" onClick={() => setData(current => ({ ...current, sameDay: !current.sameDay }))}><span><CalendarDays size={22} /><b>{c.sameDay}</b></span><i className={data.sameDay ? 'is-on' : ''}><span /></i><em>{data.sameDay ? c.active : ''}</em></button>
                <button type="button" onClick={() => setData(current => ({ ...current, advance: !current.advance }))}><span><Bell size={22} /><b>{c.advance}</b></span><i className={data.advance ? 'is-on' : ''}><span /></i><em>{data.advance ? c.active : ''}</em></button>
            </section>}
        </DemoShell>
    );
}

export default function ProductDemo({ variant, lang, iconImg, iconAlt, botUrl }) {
    if (variant === 'wallet') return <WalletDemo lang={lang} iconImg={iconImg} iconAlt={iconAlt} botUrl={botUrl} />;
    if (variant === 'bday') return <BdayDemo lang={lang} iconImg={iconImg} iconAlt={iconAlt} botUrl={botUrl} />;
    return null;
}
