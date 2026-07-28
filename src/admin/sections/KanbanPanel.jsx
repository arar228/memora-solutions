import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
    Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
    Input, Select, Badge, Label,
} from '../../ui';
import { adminApi } from '../api';

/**
 * Задачи — переехавший сюда старый /admin с основного сайта (там он висел
 * без пароля). Теперь задачи хранятся в общей базе; старые локальные задачи
 * один раз импортируются, если общая доска ещё пустая.
 */
const LS_KEY = 'memora-kanban';
const COLUMNS = [
    { id: 'inProgress', label: 'В работе' },
    { id: 'testing', label: 'Тестирование' },
    { id: 'done', label: 'Готово' },
];

export default function KanbanPanel() {
    const [tasks, setTasks] = useState([]);
    const [draft, setDraft] = useState({ title: '', desc: '', column: 'inProgress' });
    const [loaded, setLoaded] = useState(false);
    const [syncState, setSyncState] = useState('loading');
    const [error, setError] = useState('');

    useEffect(() => {
        adminApi.getState('kanban_tasks')
            .then(async ({ value }) => {
                let shared = Array.isArray(value) ? value : [];
                if (!shared.length) {
                    try {
                        const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
                        if (Array.isArray(local) && local.length) {
                            shared = local;
                            await adminApi.setState('kanban_tasks', shared);
                        }
                    } catch { /* повреждённый localStorage просто пропускаем */ }
                }
                setTasks(shared);
                setLoaded(true);
                setSyncState('saved');
            })
            .catch(err => {
                setError(err.message);
                setSyncState('error');
            });
    }, []);

    useEffect(() => {
        if (!loaded) return undefined;
        setSyncState('saving');
        const timer = setTimeout(() => {
            adminApi.setState('kanban_tasks', tasks)
                .then(() => {
                    localStorage.setItem(LS_KEY, JSON.stringify(tasks));
                    setSyncState('saved');
                    setError('');
                })
                .catch(err => {
                    setError(err.message);
                    setSyncState('error');
                });
        }, 350);
        return () => clearTimeout(timer);
    }, [tasks, loaded]);

    const add = () => {
        if (!draft.title.trim()) return;
        setTasks(prev => [...prev, { ...draft, id: Date.now() }]);
        setDraft({ title: '', desc: '', column: 'inProgress' });
    };

    const move = (id, column) => setTasks(prev => prev.map(t => (t.id === id ? { ...t, column } : t)));
    const remove = (id) => setTasks(prev => prev.filter(t => t.id !== id));

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <CardHeader>
                    <CardTitle>Задачи</CardTitle>
                    <CardDescription>
                        Общая рабочая доска команды. Изменения сохраняются автоматически
                        и видны всем, кто вошёл в панель.
                    </CardDescription>
                    <div>
                        <Badge variant={syncState === 'error' ? 'warn' : syncState === 'saved' ? 'ok' : 'muted'}>
                            {syncState === 'loading' ? 'загрузка…' : syncState === 'saving' ? 'сохранение…' : syncState === 'error' ? 'ошибка' : 'сохранено'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1.6fr_auto_auto]">
                        <div className="flex flex-col gap-1.5">
                            <Label>Название</Label>
                            <Input value={draft.title} placeholder="Что нужно сделать"
                                onChange={e => setDraft({ ...draft, title: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && add()} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Описание</Label>
                            <Input value={draft.desc} placeholder="Детали, ссылки"
                                onChange={e => setDraft({ ...draft, desc: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && add()} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Колонка</Label>
                            <Select value={draft.column} onChange={e => setDraft({ ...draft, column: e.target.value })}>
                                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="opacity-0 select-none">.</Label>
                            <Button onClick={add}><Plus size={15} /> Добавить</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <div className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-ui-sm text-danger">
                    {error}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                {COLUMNS.map(col => {
                    const list = tasks.filter(t => t.column === col.id);
                    return (
                        <Card key={col.id}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-ui">{col.label}</CardTitle>
                                    <Badge variant="muted">{list.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                {list.length === 0 && <p className="m-0 text-ui-sm text-ink-3">Пусто</p>}
                                {list.map(t => (
                                    <div key={t.id} className="rounded-control border border-line bg-surface-2 p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <strong className="text-ui">{t.title}</strong>
                                            <button
                                                onClick={() => remove(t.id)}
                                                aria-label="Удалить"
                                                className="cursor-pointer border-none bg-transparent p-1 text-ink-3 transition-colors hover:text-danger"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        {t.desc && <p className="m-0 mt-1 text-ui-sm text-ink-3">{t.desc}</p>}
                                        <div className="mt-2 flex gap-1">
                                            {COLUMNS.filter(c => c.id !== t.column).map(c => (
                                                <Button key={c.id} variant="ghost" size="sm" onClick={() => move(t.id, c.id)}>
                                                    → {c.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
