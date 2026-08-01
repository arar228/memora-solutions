import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2, ChevronDown, Clock3, Lightbulb, LockKeyhole,
    MessageCircle, Send,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import { KANBAN_LIMITS, cloneDefaultKanbanBoard } from '../../data/kanbanConfig';
import './KanbanPage.css';

const CLIENT_KEY = 'memora-question-client';
const NAME_KEY = 'memora-question-name';

function clientId() {
    const stored = localStorage.getItem(CLIENT_KEY);
    if (stored && /^[a-zA-Z0-9_-]{16,80}$/.test(stored)) return stored;
    const created = crypto.randomUUID?.() || `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLIENT_KEY, created);
    return created;
}

async function jsonRequest(path, options) {
    const response = await fetch(path, {
        cache: 'no-store',
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error || `Ошибка сервера (${response.status})`);
        error.retryAfterSeconds = body.retryAfterSeconds;
        throw error;
    }
    return body;
}

const localText = (task, field, lang) => {
    if (lang === 'en') return task[`${field}En`] || task[field];
    return task[field];
};

function TaskCard({ task, index, lang }) {
    return (
        <article className="question-task">
            <span className="question-task__eyebrow">
                {lang === 'ru' ? `Задача ${String(index + 1).padStart(2, '0')}` : `Task ${String(index + 1).padStart(2, '0')}`}
            </span>
            <h3>{localText(task, 'title', lang)}</h3>
            {localText(task, 'desc', lang) && <p>{localText(task, 'desc', lang)}</p>}
        </article>
    );
}

function ClosedTask({ task, lang }) {
    const [open, setOpen] = useState(false);
    const result = localText(task, 'report', lang) || localText(task, 'desc', lang);
    return (
        <div className={`closed-task ${open ? 'is-open' : ''}`}>
            <button className="closed-task__header" onClick={() => setOpen(value => !value)} aria-expanded={open}>
                <CheckCircle2 size={21} aria-hidden="true" />
                <span>{localText(task, 'title', lang)}</span>
                <ChevronDown size={18} className="closed-task__toggle" aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
                {open && result && (
                    <motion.div className="closed-task__content"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24 }}>
                        <p>{result}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ChatMessage({ message, lang }) {
    const manager = message.author === 'manager';
    const time = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(message.createdAt));
    return (
        <div className={`question-message ${manager ? 'question-message--manager' : ''}`}>
            <div className="question-message__meta">
                <strong>{manager ? (lang === 'ru' ? 'Команда Memora' : 'Memora team') : message.name || (lang === 'ru' ? 'Посетитель' : 'Visitor')}</strong>
                <time>{time}</time>
            </div>
            <p>{message.text}</p>
        </div>
    );
}

export default function KanbanPage() {
    const { t, i18n } = useTranslation();
    const lang = i18n.language === 'en' ? 'en' : 'ru';
    const [visitorId] = useState(clientId);
    const [board, setBoard] = useState(cloneDefaultKanbanBoard());
    const [chatMode, setChatMode] = useState('general');
    const [messages, setMessages] = useState([]);
    const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
    const [text, setText] = useState('');
    const [website, setWebsite] = useState('');
    const [sending, setSending] = useState(false);
    const [chatLoading, setChatLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const formStartedAt = useRef(Date.now());
    const chatEnd = useRef(null);

    useEffect(() => {
        jsonRequest('/api/kanban/board')
            .then(({ board: nextBoard }) => setBoard(nextBoard || cloneDefaultKanbanBoard()))
            .catch(() => setBoard(cloneDefaultKanbanBoard()));
    }, []);

    const loadMessages = useCallback((quiet = false) => {
        if (!quiet) setChatLoading(true);
        const query = new URLSearchParams({ mode: chatMode, clientId: visitorId });
        return jsonRequest(`/api/kanban/messages?${query}`)
            .then(({ messages: nextMessages }) => {
                setMessages(Array.isArray(nextMessages) ? nextMessages : []);
                setError('');
            })
            .catch(err => setError(err.message))
            .finally(() => setChatLoading(false));
    }, [chatMode, visitorId]);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(() => loadMessages(true), 15_000);
        return () => clearInterval(interval);
    }, [loadMessages]);

    useEffect(() => {
        chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    const selectMode = mode => {
        setChatMode(mode);
        setError('');
        setNotice('');
        formStartedAt.current = Date.now();
    };

    const sendMessage = async () => {
        if (sending || text.trim().length < 2) return;
        setSending(true);
        setError('');
        setNotice('');
        try {
            const { message, remaining } = await jsonRequest('/api/kanban/messages', {
                method: 'POST',
                body: JSON.stringify({
                    mode: chatMode,
                    clientId: visitorId,
                    text,
                    name,
                    website,
                    startedAt: formStartedAt.current,
                }),
            });
            setMessages(current => [...current, message]);
            setText('');
            localStorage.setItem(NAME_KEY, name.trim().slice(0, 40));
            formStartedAt.current = Date.now();
            setNotice(lang === 'ru'
                ? `Сообщение отправлено · доступно ещё ${remaining}`
                : `Message sent · ${remaining} remaining`);
        } catch (err) {
            const wait = err.retryAfterSeconds
                ? (lang === 'ru' ? ` Повторите через ${err.retryAfterSeconds} сек.` : ` Try again in ${err.retryAfterSeconds}s.`)
                : '';
            setError(`${err.message}${wait}`);
        } finally {
            setSending(false);
        }
    };

    const columns = [
        { id: 'potential', icon: Lightbulb, limit: KANBAN_LIMITS.potential },
        { id: 'inProgress', icon: Clock3, limit: KANBAN_LIMITS.inProgress },
    ];

    return (
        <div className="kanban-page question-page">
            <div className="container question-page__container">
                <AnimatedSection>
                    <header className="question-hero">
                        <span className="question-hero__eyebrow"><MessageCircle size={15} /> Memora Solutions</span>
                        <h1>{t('kanban.pageTitle')}</h1>
                        <p>{t('kanban.pageSubtitle')}</p>
                    </header>
                </AnimatedSection>

                <AnimatedSection delay={0.05}>
                    <section className="question-chat" aria-labelledby="question-chat-title">
                        <div className="question-chat__top">
                            <div>
                                <span className="question-section-label">{t('kanban.chatLabel')}</span>
                                <h2 id="question-chat-title">{t('kanban.chatTitle')}</h2>
                            </div>
                            <div className="question-chat__tabs" role="tablist" aria-label={t('kanban.chatTitle')}>
                                <button className={chatMode === 'general' ? 'is-active' : ''}
                                    onClick={() => selectMode('general')} role="tab" aria-selected={chatMode === 'general'}>
                                    <MessageCircle size={16} /> {t('kanban.generalChat')}
                                </button>
                                <button className={chatMode === 'personal' ? 'is-active' : ''}
                                    onClick={() => selectMode('personal')} role="tab" aria-selected={chatMode === 'personal'}>
                                    <LockKeyhole size={16} /> {t('kanban.personalChat')}
                                </button>
                            </div>
                        </div>

                        <p className="question-chat__context">
                            {chatMode === 'general' ? t('kanban.generalChatDesc') : t('kanban.personalChatDesc')}
                        </p>

                        <div className="question-chat__messages" aria-live="polite">
                            {chatLoading && <p className="question-chat__empty">{t('kanban.loading')}</p>}
                            {!chatLoading && !messages.length && <p className="question-chat__empty">{t('kanban.emptyChat')}</p>}
                            {messages.map(message => <ChatMessage key={message.id} message={message} lang={lang} />)}
                            <div ref={chatEnd} />
                        </div>

                        <div className="question-chat__composer">
                            <label>
                                <span>{t('kanban.nameLabel')}</span>
                                <input value={name} maxLength={40} placeholder={t('kanban.namePlaceholder')}
                                    onChange={event => setName(event.target.value)} />
                            </label>
                            <label className="question-chat__text">
                                <span>{t('kanban.messageLabel')}</span>
                                <textarea value={text} maxLength={1200} placeholder={t('kanban.messagePlaceholder')}
                                    onChange={event => setText(event.target.value)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            sendMessage();
                                        }
                                    }} />
                            </label>
                            <label className="question-chat__honeypot" aria-hidden="true">
                                Website<input tabIndex={-1} autoComplete="off" value={website}
                                    onChange={event => setWebsite(event.target.value)} />
                            </label>
                            <button className="btn btn-primary question-chat__send" onClick={sendMessage}
                                disabled={sending || text.trim().length < 2}>
                                <Send size={17} /> {sending ? t('kanban.sending') : t('kanban.send')}
                            </button>
                        </div>
                        <div className="question-chat__status">
                            <span>{text.length}/1200</span>
                            {error && <strong className="is-error">{error}</strong>}
                            {!error && notice && <strong>{notice}</strong>}
                        </div>
                    </section>
                </AnimatedSection>

                <AnimatedSection delay={0.1}>
                    <section className="question-board" aria-labelledby="question-board-title">
                        <div className="question-board__intro">
                            <span className="question-section-label">{t('kanban.boardLabel')}</span>
                            <h2 id="question-board-title">{t('kanban.boardTitle')}</h2>
                            <p>{t('kanban.boardDesc')}</p>
                        </div>
                        <div className="question-board__columns">
                            {columns.map(({ id, icon: Icon, limit }) => {
                                const tasks = board[id] || [];
                                const full = tasks.length >= limit;
                                return (
                                    <div key={id} className={`question-column ${full ? 'is-full' : ''}`}>
                                        <header>
                                            <span className="question-column__icon"><Icon size={18} /></span>
                                            <div>
                                                <h3>{t(`kanban.${id}`)}</h3>
                                                <p>{t(`kanban.${id}Desc`)}</p>
                                            </div>
                                            <strong>{tasks.length}/{limit}</strong>
                                        </header>
                                        <div className="question-column__tasks">
                                            {!tasks.length && <p className="question-column__empty">{t('kanban.emptyColumn')}</p>}
                                            {tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} lang={lang} />)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </AnimatedSection>

                <AnimatedSection delay={0.15}>
                    <section className="closed-section" aria-labelledby="closed-title">
                        <div className="closed-section__intro">
                            <span className="question-section-label">{t('kanban.archiveLabel')}</span>
                            <h2 id="closed-title">{t('kanban.closedTitle')}</h2>
                            <p>{t('kanban.closedDesc')}</p>
                        </div>
                        <div className="closed-section__list">
                            {(board.closed || []).map(task => <ClosedTask key={task.id} task={task} lang={lang} />)}
                        </div>
                    </section>
                </AnimatedSection>
            </div>
        </div>
    );
}
