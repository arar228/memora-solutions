import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import './AdminPage.css';

export default function AdminPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('kanban');

    return (
        <div className="admin-page">
            <div className="container">
                <div className="admin-header">
                    <h1>{t('admin.title')}</h1>
                    <span className="admin-header__badge">DEV</span>
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
                    {activeTab === 'kanban' && <KanbanManager />}
                    {activeTab === 'content' && <ContentManager />}
                    {activeTab === 'services' && <ServicesManager />}
                </div>
            </div>
        </div>
    );
}

function KanbanManager() {
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

function ContentManager() {
    return (
        <div className="admin-manager">
            <h3>Управление контентом</h3>
            <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-lg)' }}>
                Редактирование контента продуктовых страниц. Будет доступно после подключения бэкенда.
            </p>
        </div>
    );
}

function ServicesManager() {
    return (
        <div className="admin-manager">
            <h3>Управление полезными сервисами</h3>
            <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-lg)' }}>
                Добавление и редактирование ссылок на полезные сервисы. Будет доступно после подключения бэкенда.
            </p>
        </div>
    );
}
