import { useEffect, useMemo, useState } from 'react';
import {
    Check, PencilLine, Plus, RefreshCw, Send, Trash2,
} from 'lucide-react';
import {
    Badge, Button, Input, Label, Select,
} from '../../ui';
import { KANBAN_LIMITS, cloneDefaultKanbanBoard } from '../../data/kanbanConfig';
import KanbanBoard from '../../shared/KanbanBoard';
import KanbanChat from '../../shared/KanbanChat';
import { adminApi } from '../api';

const COLUMNS = [
    { id: 'potential', label: 'Потенциальные задачи', limit: KANBAN_LIMITS.potential },
    { id: 'inProgress', label: 'В работе', limit: KANBAN_LIMITS.inProgress },
    { id: 'closed', label: 'Закрытые задачи', limit: null },
];

const emptyDraft = { title: '', desc: '', report: '', priority: 'medium', column: 'potential' };

const BOARD_LABELS = {
    label: 'Рабочее пространство',
    title: 'Что будет дальше',
    description: 'Менеджер размещает до семи потенциальных и до трёх активных задач одновременно.',
    potential: 'Потенциальные задачи',
    potentialDescription: 'До 7 следующих задач',
    inProgress: 'В работе',
    inProgressDescription: 'До 3 задач в фокусе',
    closed: 'Закрытые задачи',
    closedDescription: 'Готовые результаты и отчёты',
    empty: 'Следующая задача появится здесь.',
    task: 'Задача',
    result: 'Результат',
};

const CHAT_LABELS = {
    title: 'Разговор с командой',
    general: 'Общий чат',
    personal: 'Персональный',
    generalDescription: 'Общие вопросы и ответы команды',
    personalDescription: 'Диалоги с конкретными посетителями',
    loading: 'Загружаем диалог…',
    empty: 'Первое сообщение появится здесь.',
    manager: 'Команда Memora',
    visitor: 'Посетитель',
};

export default function KanbanPanel() {
    const [board, setBoard] = useState(cloneDefaultKanbanBoard());
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState(emptyDraft);
    const [loaded, setLoaded] = useState(false);
    const [syncState, setSyncState] = useState('loading');
    const [error, setError] = useState('');
    const [chatMode, setChatMode] = useState('general');
    const [selectedConversation, setSelectedConversation] = useState('');
    const [reply, setReply] = useState('');
    const [replying, setReplying] = useState(false);
    const [editingTask, setEditingTask] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const load = () => {
        setSyncState('loading');
        adminApi.getKanban()
            .then(payload => {
                const { board: nextBoard, messages: nextMessages } = payload || {};
                setBoard(nextBoard || cloneDefaultKanbanBoard());
                setMessages(Array.isArray(nextMessages) ? nextMessages : []);
                setLoaded(true);
                setSyncState('saved');
                setError('');
            })
            .catch(err => {
                setError(err.message);
                setSyncState('error');
            });
    };

    useEffect(load, []);

    useEffect(() => {
        if (!loaded) return undefined;
        setSyncState('saving');
        const timer = setTimeout(() => {
            adminApi.saveKanbanBoard(board)
                .then(() => {
                    setSyncState('saved');
                    setError('');
                })
                .catch(err => {
                    setError(err.message);
                    setSyncState('error');
                });
        }, 450);
        return () => clearTimeout(timer);
    }, [board, loaded]);

    const conversations = useMemo(() => {
        const grouped = new Map();
        messages.filter(message => message.mode === 'personal').forEach(message => {
            const list = grouped.get(message.conversationId) || [];
            list.push(message);
            grouped.set(message.conversationId, list);
        });
        return [...grouped.entries()]
            .map(([id, list]) => ({ id, list, last: list.at(-1) }))
            .sort((a, b) => new Date(b.last.createdAt) - new Date(a.last.createdAt));
    }, [messages]);

    useEffect(() => {
        if (chatMode === 'personal' && !selectedConversation && conversations.length) {
            setSelectedConversation(conversations[0].id);
        }
    }, [chatMode, conversations, selectedConversation]);

    const visibleMessages = chatMode === 'general'
        ? messages.filter(message => message.mode === 'general')
        : messages.filter(message => message.mode === 'personal'
            && message.conversationId === selectedConversation);

    const add = () => {
        const title = draft.title.trim();
        if (!title) return;
        const column = COLUMNS.find(item => item.id === draft.column);
        if (column?.limit && board[column.id].length >= column.limit) {
            setError(`Колонка «${column.label}» заполнена: ${column.limit}/${column.limit}.`);
            return;
        }
        const task = {
            id: crypto.randomUUID(),
            title,
            titleEn: '',
            desc: draft.desc.trim(),
            descEn: '',
            report: draft.column === 'closed' ? draft.report.trim() : '',
            reportEn: '',
            priority: draft.priority,
        };
        setBoard(current => ({ ...current, [draft.column]: [...current[draft.column], task] }));
        setDraft(emptyDraft);
        setShowCreate(false);
        setError('');
    };

    const updateTask = (column, id, patch) => setBoard(current => ({
        ...current,
        [column]: current[column].map(task => (task.id === id ? { ...task, ...patch } : task)),
    }));

    const removeTask = (column, id) => setBoard(current => ({
        ...current,
        [column]: current[column].filter(task => task.id !== id),
    }));

    const moveTask = (from, id, to) => {
        const destination = COLUMNS.find(column => column.id === to);
        if (destination?.limit && board[to].length >= destination.limit) {
            setError(`Перенос станет доступен после освобождения места в колонке «${destination.label}» (${destination.limit}/${destination.limit}).`);
            return;
        }
        setBoard(current => {
            const task = current[from].find(item => item.id === id);
            if (!task) return current;
            return {
                ...current,
                [from]: current[from].filter(item => item.id !== id),
                [to]: [...current[to], {
                    ...task,
                    report: to === 'closed' ? task.report : '',
                    reportEn: to === 'closed' ? task.reportEn : '',
                }],
            };
        });
        setError('');
    };

    const sendReply = async () => {
        if (!reply.trim() || (chatMode === 'personal' && !selectedConversation)) return;
        setReplying(true);
        try {
            const { message } = await adminApi.replyKanban({
                mode: chatMode,
                conversationId: chatMode === 'personal' ? selectedConversation : '',
                text: reply,
            });
            setMessages(current => [...current, message]);
            setReply('');
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setReplying(false);
        }
    };

    const removeMessage = async (id) => {
        try {
            await adminApi.deleteKanbanMessage(id);
            setMessages(current => current.filter(message => message.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    const renderTaskControls = ({ task, columnId }) => (
        <div className="memora-board__actions">
            <button className="memora-board__action" type="button"
                onClick={() => setEditingTask(current => current === `${columnId}:${task.id}` ? '' : `${columnId}:${task.id}`)}>
                <PencilLine size={12} /> Изменить
            </button>
            {COLUMNS.filter(item => item.id !== columnId).map(item => (
                <button key={item.id} className="memora-board__action" type="button"
                    onClick={() => moveTask(columnId, task.id, item.id)}>
                    → {item.label}
                </button>
            ))}
            <button className="memora-board__action is-danger" type="button"
                onClick={() => removeTask(columnId, task.id)}>
                <Trash2 size={12} /> Удалить
            </button>
        </div>
    );

    const renderTaskEditor = ({ task, columnId }) => (
        editingTask === `${columnId}:${task.id}` && (
            <div className="memora-board__editor">
                <input value={task.title} aria-label="Название задачи"
                    onChange={event => updateTask(columnId, task.id, { title: event.target.value })} />
                <textarea value={task.desc || ''} aria-label="Описание задачи" placeholder="Описание и ожидаемый результат"
                    onChange={event => updateTask(columnId, task.id, { desc: event.target.value })} />
                {columnId === 'closed' && (
                    <textarea value={task.report || ''} aria-label="Итог закрытой задачи" placeholder="Готовый результат"
                        onChange={event => updateTask(columnId, task.id, { report: event.target.value })} />
                )}
                <button className="memora-board__action" type="button" onClick={() => setEditingTask('')}>
                    <Check size={12} /> Готово
                </button>
            </div>
        )
    );

    return (
        <div className="kanban-admin">
            <header className="kanban-admin__toolbar">
                <div>
                    <strong>Задать вопрос</strong>
                    <span>Чат и рабочая доска</span>
                </div>
                <div className="kanban-admin__toolbar-actions">
                    <Badge variant={syncState === 'error' ? 'warn' : syncState === 'saved' ? 'ok' : 'muted'}>
                        {syncState === 'loading' ? 'загрузка…' : syncState === 'saving' ? 'сохранение…' : syncState === 'error' ? 'ошибка' : 'сохранено'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={14} /> Обновить</Button>
                    <Button size="sm" onClick={() => setShowCreate(current => !current)}>
                        <Plus size={14} /> Новая задача
                    </Button>
                </div>
            </header>

            {showCreate && (
                <section className="kanban-admin__create" aria-label="Новая задача">
                    <div className="kanban-admin__create-grid">
                        <div className="flex flex-col gap-1.5">
                            <Label>Название</Label>
                            <Input value={draft.title} placeholder="Коротко и понятно"
                                onChange={event => setDraft({ ...draft, title: event.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Описание</Label>
                            <Input value={draft.desc} placeholder="Зачем это нужно и какой результат"
                                onChange={event => setDraft({ ...draft, desc: event.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Колонка</Label>
                            <Select value={draft.column} onChange={event => setDraft({ ...draft, column: event.target.value })}>
                                {COLUMNS.map(column => <option key={column.id} value={column.id}>{column.label}</option>)}
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Приоритет</Label>
                            <Select value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value })}>
                                <option value="high">Высокий</option>
                                <option value="medium">Средний</option>
                                <option value="low">Низкий</option>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="select-none opacity-0">.</Label>
                            <Button onClick={add}><Plus size={15} /> Добавить</Button>
                        </div>
                    </div>
                </section>
            )}

            {error && <div className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-ui-sm text-danger">{error}</div>}

            <div className="memora-workspace kanban-admin__workspace">
                <KanbanChat
                    labels={CHAT_LABELS}
                    mode={chatMode}
                    onModeChange={setChatMode}
                    messages={visibleMessages}
                    loading={!loaded}
                    personalCount={conversations.length}
                    modeExtra={chatMode === 'personal' ? (
                        <div className="memora-chat__mode-extra">
                            {conversations.length === 0 && <span className="memora-chat__empty">Первый диалог появится здесь.</span>}
                            {conversations.map((conversation, index) => (
                                <button key={conversation.id} type="button"
                                    className={`memora-board__action ${selectedConversation === conversation.id ? 'is-active' : ''}`}
                                    onClick={() => setSelectedConversation(conversation.id)}>
                                    Диалог {conversations.length - index} · {conversation.list.length}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    renderMessageControls={message => (
                        <button type="button" onClick={() => removeMessage(message.id)} aria-label="Удалить сообщение">
                            <Trash2 size={11} />
                        </button>
                    )}
                    composer={(
                        <>
                            <textarea value={reply} placeholder="Ответить от имени команды…"
                                onChange={event => setReply(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault();
                                        sendReply();
                                    }
                                }} />
                            <button type="button" onClick={sendReply}
                                disabled={replying || !reply.trim() || (chatMode === 'personal' && !selectedConversation)}>
                                <Send size={14} /> {replying ? 'Отправка…' : 'Ответить'}
                            </button>
                        </>
                    )}
                />
                <KanbanBoard
                    board={board}
                    labels={BOARD_LABELS}
                    visibleColumns={['potential', 'inProgress']}
                    showIntro={false}
                    variant="workspace"
                    renderTaskControls={renderTaskControls}
                    renderTaskEditor={renderTaskEditor}
                />
            </div>

            <section className="kanban-admin__archive">
                <header>
                    <div>
                        <span>Результаты</span>
                        <h2>Закрытые задачи</h2>
                    </div>
                    <p>Готовые результаты и отчёты</p>
                </header>
                <KanbanBoard
                    board={board}
                    labels={BOARD_LABELS}
                    visibleColumns={['closed']}
                    showIntro={false}
                    variant="archive"
                    renderTaskControls={renderTaskControls}
                    renderTaskEditor={renderTaskEditor}
                />
            </section>
        </div>
    );
}
