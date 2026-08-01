import { useEffect, useMemo, useState } from 'react';
import {
    Check, LockKeyhole, MessageCircle, PencilLine, Plus, RefreshCw, Send, Trash2,
} from 'lucide-react';
import {
    Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
    Input, Label, Select,
} from '../../ui';
import { KANBAN_LIMITS, cloneDefaultKanbanBoard } from '../../data/kanbanConfig';
import KanbanBoard from '../../shared/KanbanBoard';
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

const formatTime = value => new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
}).format(new Date(value));

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

    const load = () => {
        setSyncState('loading');
        adminApi.getKanban()
            .then(({ board: nextBoard, messages: nextMessages }) => {
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

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <CardTitle>Задать вопрос · ручное управление</CardTitle>
                            <CardDescription>
                                Здесь менеджер ведёт публичную доску и отвечает в общем или персональном чате.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={syncState === 'error' ? 'warn' : syncState === 'saved' ? 'ok' : 'muted'}>
                                {syncState === 'loading' ? 'загрузка…' : syncState === 'saving' ? 'сохранение…' : syncState === 'error' ? 'ошибка' : 'сохранено'}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={14} /> Обновить</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <div className="grid gap-3 xl:grid-cols-[1.1fr_1.5fr_.8fr_.8fr_auto]">
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
                </CardContent>
            </Card>

            {error && <div className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-ui-sm text-danger">{error}</div>}

            <KanbanBoard
                board={board}
                labels={BOARD_LABELS}
                renderTaskControls={({ task, columnId }) => (
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
                )}
                renderTaskEditor={({ task, columnId }) => (
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
                )}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Диалоги с посетителями</CardTitle>
                    <CardDescription>Общий чат видят все посетители. Персональный разговор видят конкретный посетитель и менеджер.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        <Button variant={chatMode === 'general' ? 'default' : 'ghost'} onClick={() => setChatMode('general')}>
                            <MessageCircle size={15} /> Общий чат
                        </Button>
                        <Button variant={chatMode === 'personal' ? 'default' : 'ghost'} onClick={() => setChatMode('personal')}>
                            <LockKeyhole size={15} /> Персональные · {conversations.length}
                        </Button>
                    </div>

                    {chatMode === 'personal' && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {!conversations.length && <span className="text-ui-sm text-ink-3">Первый персональный диалог появится здесь.</span>}
                            {conversations.map((conversation, index) => (
                                <Button key={conversation.id} size="sm"
                                    variant={selectedConversation === conversation.id ? 'default' : 'ghost'}
                                    onClick={() => setSelectedConversation(conversation.id)}>
                                    Диалог {conversations.length - index} · {conversation.list.length}
                                </Button>
                            ))}
                        </div>
                    )}

                    <div className="flex max-h-[440px] flex-col gap-2 overflow-y-auto rounded-control border border-line bg-surface-2 p-3">
                        {!visibleMessages.length && <p className="m-0 py-8 text-center text-ui-sm text-ink-3">Первое сообщение появится здесь.</p>}
                        {visibleMessages.map(message => (
                            <div key={message.id} className={`max-w-[86%] rounded-control border p-3 ${message.author === 'manager' ? 'ml-auto border-brand/20 bg-brand-dim' : 'border-line bg-white'}`}>
                                <div className="flex items-center justify-between gap-3 text-[11px] text-ink-3">
                                    <span>{message.author === 'manager' ? 'Команда Memora' : message.name || 'Посетитель'} · {formatTime(message.createdAt)}</span>
                                    <button onClick={() => removeMessage(message.id)} className="border-none bg-transparent text-ink-3 hover:text-danger" aria-label="Удалить сообщение"><Trash2 size={12} /></button>
                                </div>
                                <p className="m-0 mt-1 whitespace-pre-wrap text-ui-sm text-ink">{message.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <textarea value={reply} placeholder="Ответить от имени команды…"
                            onChange={event => setReply(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    sendReply();
                                }
                            }}
                            className="min-h-20 flex-1 resize-y rounded-control border border-line bg-white px-3 py-2 text-ui outline-none focus:border-brand" />
                        <Button onClick={sendReply} disabled={replying || !reply.trim() || (chatMode === 'personal' && !selectedConversation)}>
                            <Send size={15} /> {replying ? 'Отправка…' : 'Ответить'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
