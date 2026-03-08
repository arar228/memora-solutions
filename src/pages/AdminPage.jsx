import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, LogIn, Plus, Trash2, Save, X } from 'lucide-react';
import './AdminPage.css';

export default function AdminPage() {
    const { t } = useTranslation();
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('kanban');

    // Simple localStorage-based auth
    useEffect(() => {
        const auth = sessionStorage.getItem('memora-admin');
        if (auth === 'true') setAuthenticated(true);
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'memora2026') {
            setAuthenticated(true);
            sessionStorage.setItem('memora-admin', 'true');
        } else {
            setError(t('admin.wrongPassword'));
        }
    };

    if (!authenticated) {
        return (
            <div className="admin-page">
                <div className="admin-login">
                    <div className="admin-login__card card">
                        <div className="admin-login__icon">
                            <Lock size={32} />
                        </div>
                        <h2>{t('admin.title')}</h2>
                        <form onSubmit={handleLogin}>
                            <input
                                type="password"
                                className="search-form__input"
                                placeholder={t('admin.password')}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                autoFocus
                            />
                            {error && <p className="admin-login__error">{error}</p>}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>
                                <LogIn size={16} /> {t('admin.login')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="container">
                <div className="admin-header">
                    <h1>{t('admin.title')}</h1>
                    <button className="btn btn-secondary" onClick={() => { sessionStorage.removeItem('memora-admin'); setAuthenticated(false); }}>
                        <X size={16} /> Logout
                    </button>
                </div>

                <div className="admin-tabs">
                    {['kanban', 'content', 'services'].map(tab => (
                        <button
                            key={tab}
                            className={`admin-tab ${activeTab === tab ? 'admin-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {t(`admin.tabs.${tab}`)}
                        </button>
                    ))}
                </div>

                <div className="admin-content card">
                    {activeTab === 'kanban' && <KanbanManager t={t} />}
                    {activeTab === 'content' && <ContentManager t={t} />}
                    {activeTab === 'services' && <ServicesManager t={t} />}
                </div>
            </div>
        </div>
    );
}

function KanbanManager({ t }) {
    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('memora-kanban');
        return saved ? JSON.parse(saved) : [];
    });
    const [newTask, setNewTask] = useState({ title: '', desc: '', column: 'inProgress' });

    useEffect(() => {
        localStorage.setItem('memora-kanban', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = () => {
        if (!newTask.title.trim()) return;
        setTasks([...tasks, { ...newTask, id: Date.now() }]);
        setNewTask({ title: '', desc: '', column: 'inProgress' });
    };

    const removeTask = (id) => setTasks(tasks.filter(t => t.id !== id));

    return (
        <div className="admin-manager">
            <h3>Управление задачами</h3>
            <div className="admin-form">
                <input className="search-form__input" placeholder="Название задачи" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                <input className="search-form__input" placeholder="Описание" value={newTask.desc} onChange={e => setNewTask({ ...newTask, desc: e.target.value })} />
                <select className="search-form__input" value={newTask.column} onChange={e => setNewTask({ ...newTask, column: e.target.value })}>
                    <option value="inProgress">В работе</option>
                    <option value="testing">Тестирование</option>
                    <option value="done">Готово</option>
                </select>
                <button className="btn btn-primary" onClick={addTask}><Plus size={16} /> Добавить</button>
            </div>
            <div className="admin-list">
                {tasks.map(task => (
                    <div key={task.id} className="admin-list__item">
                        <div>
                            <strong>{task.title}</strong>
                            <span className="admin-list__badge">{task.column}</span>
                            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>{task.desc}</p>
                        </div>
                        <button className="admin-list__delete" onClick={() => removeTask(task.id)}><Trash2 size={16} /></button>
                    </div>
                ))}
                {tasks.length === 0 && <p style={{ color: 'var(--color-text-tertiary)', padding: 16 }}>Нет пользовательских задач</p>}
            </div>
        </div>
    );
}

function ContentManager({ t }) {
    return (
        <div className="admin-manager">
            <h3>Управление контентом</h3>
            <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-lg)' }}>
                Редактирование контента продуктовых страниц. Будет доступно после подключения бэкенда.
            </p>
        </div>
    );
}

function ServicesManager({ t }) {
    return (
        <div className="admin-manager">
            <h3>Управление полезными сервисами</h3>
            <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-lg)' }}>
                Добавление и редактирование ссылок на полезные сервисы. Будет доступно после подключения бэкенда.
            </p>
        </div>
    );
}
