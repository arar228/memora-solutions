import { CheckCircle2, Clock3, Lightbulb } from 'lucide-react';
import { KANBAN_LIMITS } from '../data/kanbanConfig';
import './KanbanBoard.css';

const COLUMN_META = [
    { id: 'potential', icon: Lightbulb, limit: KANBAN_LIMITS.potential },
    { id: 'inProgress', icon: Clock3, limit: KANBAN_LIMITS.inProgress },
    { id: 'closed', icon: CheckCircle2, limit: null },
];

const localText = (task, field, lang) => {
    if (lang === 'en') return task[`${field}En`] || task[field];
    return task[field];
};

export default function KanbanBoard({
    board,
    labels,
    lang = 'ru',
    renderTaskControls,
    renderTaskEditor,
    visibleColumns,
    showIntro = true,
    variant = 'default',
}) {
    const columns = Array.isArray(visibleColumns)
        ? COLUMN_META.filter(column => visibleColumns.includes(column.id))
        : COLUMN_META;

    return (
        <section
            className={`memora-board memora-board--${variant}`}
            aria-labelledby={showIntro ? 'memora-board-title' : undefined}
        >
            {showIntro && (
                <div className="memora-board__intro">
                    <span className="memora-board__label">{labels.label}</span>
                    <h2 id="memora-board-title">{labels.title}</h2>
                    <p>{labels.description}</p>
                </div>
            )}

            <div className="memora-board__grid">
                {columns.map(({ id, icon: Icon, limit }) => {
                    const tasks = board[id] || [];
                    const full = Boolean(limit && tasks.length >= limit);
                    return (
                        <section key={id} className={`memora-board__column ${full ? 'is-full' : ''}`}>
                            <header className="memora-board__column-header">
                                <span className="memora-board__column-icon"><Icon size={17} /></span>
                                <div className="memora-board__column-copy">
                                    <h3>{labels[id]}</h3>
                                    <p>{labels[`${id}Description`]}</p>
                                </div>
                                <strong className="memora-board__count">
                                    {limit ? `${tasks.length}/${limit}` : tasks.length}
                                </strong>
                            </header>

                            <div className="memora-board__tasks">
                                {tasks.length === 0 && (
                                    <p className="memora-board__empty">{labels.empty}</p>
                                )}
                                {tasks.map((task, index) => {
                                    const title = localText(task, 'title', lang);
                                    const description = localText(task, 'desc', lang);
                                    const report = id === 'closed'
                                        ? localText(task, 'report', lang) || description
                                        : '';
                                    return (
                                        <article key={task.id} className="memora-board__task">
                                            <span className="memora-board__task-label">
                                                {id === 'closed' ? labels.result : labels.task} {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <h4>{title}</h4>
                                            {description && id !== 'closed' && <p>{description}</p>}
                                            {report && <p className="memora-board__result">{report}</p>}
                                            {renderTaskControls?.({ task, columnId: id })}
                                            {renderTaskEditor?.({ task, columnId: id })}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </section>
    );
}
