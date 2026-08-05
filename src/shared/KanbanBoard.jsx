import { useState } from 'react';
import {
    CalendarDays, CheckCircle2, Clock3, GripVertical, Lightbulb,
} from 'lucide-react';
import { KANBAN_LIMITS } from '../data/kanbanConfig';
import './KanbanBoard.css';

const COLUMN_META = [
    { id: 'potential', icon: Lightbulb, limit: KANBAN_LIMITS.potential },
    { id: 'inProgress', icon: Clock3, limit: KANBAN_LIMITS.inProgress },
    { id: 'closed', icon: CheckCircle2, limit: null },
];

const formatDueDate = (value, lang) => {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
};

const dueState = (value, columnId) => {
    if (!value || columnId === 'closed') return '';
    const today = new Date();
    const todayValue = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
    ].join('-');
    if (value < todayValue) return 'is-overdue';
    if (value === todayValue) return 'is-today';
    return '';
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
    onTaskDrop,
}) {
    const [draggingId, setDraggingId] = useState('');
    const [dropTarget, setDropTarget] = useState(null);
    const columns = Array.isArray(visibleColumns)
        ? COLUMN_META.filter(column => visibleColumns.includes(column.id))
        : COLUMN_META;

    const beginDrag = (event, columnId, taskId) => {
        const payload = JSON.stringify({ fromColumn: columnId, taskId });
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-memora-task', payload);
        event.dataTransfer.setData('text/plain', payload);
        setDraggingId(taskId);
    };

    const acceptDrop = (event, toColumn, toIndex) => {
        if (!onTaskDrop) return;
        event.preventDefault();
        event.stopPropagation();
        const raw = event.dataTransfer.getData('application/x-memora-task')
            || event.dataTransfer.getData('text/plain');
        try {
            const payload = JSON.parse(raw);
            onTaskDrop({ ...payload, toColumn, toIndex });
        } catch {
            // Ignore drags that did not originate from this board.
        }
        setDropTarget(null);
        setDraggingId('');
    };

    const markDropTarget = (event, columnId, index) => {
        if (!onTaskDrop) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget({ columnId, index });
    };

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

                            <div
                                className={`memora-board__tasks ${dropTarget?.columnId === id && dropTarget.index === tasks.length ? 'is-drop-target' : ''}`}
                                onDragOver={event => markDropTarget(event, id, tasks.length)}
                                onDragLeave={event => {
                                    if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null);
                                }}
                                onDrop={event => acceptDrop(event, id, tasks.length)}
                            >
                                {tasks.length === 0 && (
                                    <p className="memora-board__empty">{labels.empty}</p>
                                )}
                                {tasks.map((task, index) => {
                                    const formattedDueDate = formatDueDate(task.dueDate, lang);
                                    const deadlineState = dueState(task.dueDate, id);
                                    const isDropTarget = dropTarget?.columnId === id && dropTarget.index === index;
                                    return (
                                        <article
                                            key={task.id}
                                            className={`memora-board__task ${draggingId === task.id ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                                            draggable={Boolean(onTaskDrop)}
                                            onDragStart={event => beginDrag(event, id, task.id)}
                                            onDragEnd={() => {
                                                setDraggingId('');
                                                setDropTarget(null);
                                            }}
                                            onDragOver={event => markDropTarget(event, id, index)}
                                            onDrop={event => acceptDrop(event, id, index)}
                                        >
                                            <div className="memora-board__task-heading">
                                                {onTaskDrop && (
                                                    <span className="memora-board__drag-handle" aria-hidden="true">
                                                        <GripVertical size={15} />
                                                    </span>
                                                )}
                                                <span className="memora-board__task-label">
                                                    {labels.task} {String(index + 1).padStart(2, '0')}
                                                </span>
                                            </div>
                                            <h4>{task.title}</h4>
                                            {formattedDueDate && (
                                                <time className={`memora-board__due-date ${deadlineState}`} dateTime={task.dueDate}>
                                                    <CalendarDays size={13} /> {formattedDueDate}
                                                </time>
                                            )}
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
