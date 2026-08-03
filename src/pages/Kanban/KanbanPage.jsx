import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MessageCircle, Send,
} from 'lucide-react';
import AnimatedSection from '../../shared/AnimatedSection';
import KanbanBoard from '../../shared/KanbanBoard';
import KanbanChat from '../../shared/KanbanChat';
import { cloneDefaultKanbanBoard } from '../../data/kanbanConfig';
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

    const boardLabels = {
        label: t('kanban.boardLabel'),
        title: t('kanban.boardTitle'),
        description: t('kanban.boardDesc'),
        potential: t('kanban.potential'),
        potentialDescription: t('kanban.potentialDesc'),
        inProgress: t('kanban.inProgress'),
        inProgressDescription: t('kanban.inProgressDesc'),
        closed: t('kanban.closedTitle'),
        closedDescription: t('kanban.closedDesc'),
        empty: t('kanban.emptyColumn'),
        task: lang === 'ru' ? 'Задача' : 'Task',
        result: lang === 'ru' ? 'Результат' : 'Result',
    };
    const chatLabels = {
        title: t('kanban.chatTitle'),
        general: t('kanban.generalChat'),
        personal: t('kanban.personalChat'),
        generalDescription: t('kanban.generalChatDesc'),
        personalDescription: t('kanban.personalChatDesc'),
        loading: t('kanban.loading'),
        empty: t('kanban.emptyChat'),
        manager: lang === 'ru' ? 'Команда Memora' : 'Memora team',
        visitor: lang === 'ru' ? 'Посетитель' : 'Visitor',
    };

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
                    <div className="memora-workspace question-workspace">
                        <KanbanChat
                            labels={chatLabels}
                            lang={lang}
                            mode={chatMode}
                            onModeChange={selectMode}
                            messages={messages}
                            loading={chatLoading}
                            endRef={chatEnd}
                            composer={(
                                <>
                                    <input
                                        value={name}
                                        maxLength={40}
                                        aria-label={t('kanban.nameLabel')}
                                        placeholder={t('kanban.namePlaceholder')}
                                        onChange={event => setName(event.target.value)}
                                    />
                                    <textarea
                                        value={text}
                                        maxLength={1200}
                                        aria-label={t('kanban.messageLabel')}
                                        placeholder={t('kanban.messagePlaceholder')}
                                        onChange={event => setText(event.target.value)}
                                        onKeyDown={event => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                    />
                                    <label className="memora-chat__honeypot" aria-hidden="true">
                                        Website<input tabIndex={-1} autoComplete="off" value={website}
                                            onChange={event => setWebsite(event.target.value)} />
                                    </label>
                                    <button type="button" onClick={sendMessage}
                                        disabled={sending || text.trim().length < 2}>
                                        <Send size={14} /> {sending ? t('kanban.sending') : t('kanban.send')}
                                    </button>
                                    <div className="memora-chat__status">
                                        <span>{text.length}/1200</span>
                                        {error && <strong className="is-error">{error}</strong>}
                                        {!error && notice && <strong>{notice}</strong>}
                                    </div>
                                </>
                            )}
                        />
                        <KanbanBoard
                            board={board}
                            labels={boardLabels}
                            lang={lang}
                            visibleColumns={['potential', 'inProgress']}
                            showIntro={false}
                            variant="workspace"
                        />
                    </div>
                </AnimatedSection>

                <AnimatedSection delay={0.1}>
                    <section className="question-archive" aria-labelledby="question-archive-title">
                        <div className="question-archive__header">
                            <span className="question-section-label">{t('kanban.archiveLabel')}</span>
                            <h2 id="question-archive-title">{t('kanban.closedTitle')}</h2>
                            <p>{t('kanban.closedDesc')}</p>
                        </div>
                        <KanbanBoard
                            board={board}
                            labels={boardLabels}
                            lang={lang}
                            visibleColumns={['closed']}
                            showIntro={false}
                            variant="archive"
                        />
                    </section>
                </AnimatedSection>
            </div>
        </div>
    );
}
