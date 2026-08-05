import { LockKeyhole, MessageCircle } from 'lucide-react';
import './KanbanWorkspace.css';

const formatMessageTime = (value, lang) => new Intl.DateTimeFormat(
    lang === 'en' ? 'en-US' : 'ru-RU',
    { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
).format(new Date(value));

export default function KanbanChat({
    labels,
    lang = 'ru',
    mode,
    onModeChange,
    messages = [],
    loading = false,
    personalCount,
    modeExtra,
    composer,
    renderMessageControls,
    endRef,
}) {
    return (
        <section className="memora-chat" aria-labelledby="memora-chat-title">
            <header className="memora-chat__header">
                <span className="memora-chat__icon"><MessageCircle size={17} /></span>
                <div className="memora-chat__heading">
                    <h2 id="memora-chat-title">{labels.title}</h2>
                </div>
            </header>

            <div className="memora-chat__tabs" role="tablist" aria-label={labels.title}>
                <button
                    className={mode === 'general' ? 'is-active' : ''}
                    type="button"
                    role="tab"
                    aria-selected={mode === 'general'}
                    onClick={() => onModeChange('general')}
                >
                    <MessageCircle size={13} /> {labels.general}
                </button>
                <button
                    className={mode === 'personal' ? 'is-active' : ''}
                    type="button"
                    role="tab"
                    aria-selected={mode === 'personal'}
                    onClick={() => onModeChange('personal')}
                >
                    <LockKeyhole size={13} /> {labels.personal}
                    {Number.isFinite(personalCount) ? ` · ${personalCount}` : ''}
                </button>
            </div>

            {modeExtra}

            <div className="memora-chat__messages" aria-live="polite">
                {loading && <p className="memora-chat__empty">{labels.loading}</p>}
                {!loading && messages.length === 0 && (
                    <p className="memora-chat__empty">{labels.empty}</p>
                )}
                {messages.map(message => {
                    const manager = message.author === 'manager';
                    return (
                        <article
                            key={message.id}
                            className={`memora-chat__message ${manager ? 'is-manager' : ''}`}
                        >
                            <div className="memora-chat__message-meta">
                                <span>
                                    {manager ? labels.manager : message.name || labels.visitor}
                                    {' · '}
                                    {formatMessageTime(message.createdAt, lang)}
                                </span>
                                {renderMessageControls?.(message)}
                            </div>
                            <p>{message.text}</p>
                        </article>
                    );
                })}
                <div ref={endRef} />
            </div>

            <div className="memora-chat__composer">{composer}</div>
        </section>
    );
}
