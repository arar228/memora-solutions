import { KANBAN_LIMITS } from './kanbanConfig.js';

const COLUMNS = new Set(['potential', 'inProgress', 'closed']);
const ACTIVE_COLUMNS = new Set(['potential', 'inProgress']);

export function closeKanbanTask(board, {
    fromColumn,
    taskId,
    description = '',
}) {
    if (!ACTIVE_COLUMNS.has(fromColumn)) {
        return { board, moved: false, reason: 'column' };
    }

    const sourceTasks = [...(board[fromColumn] || [])];
    const sourceIndex = sourceTasks.findIndex(task => task.id === taskId);
    if (sourceIndex < 0) return { board, moved: false, reason: 'task' };

    const [sourceTask] = sourceTasks.splice(sourceIndex, 1);
    const task = { ...sourceTask };
    const resultDescription = String(description).trim();
    if (resultDescription) task.description = resultDescription;
    else delete task.description;

    return {
        moved: true,
        reason: '',
        board: {
            ...board,
            [fromColumn]: sourceTasks,
            closed: [task, ...(board.closed || [])],
        },
    };
}

export function moveKanbanTask(board, {
    fromColumn,
    taskId,
    toColumn,
    toIndex,
}) {
    if (!COLUMNS.has(fromColumn) || !COLUMNS.has(toColumn)) {
        return { board, moved: false, reason: 'column' };
    }

    const sourceTasks = [...(board[fromColumn] || [])];
    const sourceIndex = sourceTasks.findIndex(task => task.id === taskId);
    if (sourceIndex < 0) return { board, moved: false, reason: 'task' };

    const destinationLimit = KANBAN_LIMITS[toColumn];
    if (fromColumn !== toColumn
        && destinationLimit
        && (board[toColumn] || []).length >= destinationLimit) {
        return { board, moved: false, reason: 'limit' };
    }

    const [sourceTask] = sourceTasks.splice(sourceIndex, 1);
    const task = { ...sourceTask };
    if (toColumn !== 'closed') delete task.description;
    const destinationTasks = fromColumn === toColumn
        ? sourceTasks
        : [...(board[toColumn] || [])];
    const requestedIndex = Number.isFinite(Number(toIndex)) ? Number(toIndex) : 0;
    const adjustedIndex = fromColumn === toColumn && sourceIndex < requestedIndex
        ? requestedIndex - 1
        : requestedIndex;
    const insertAt = Math.max(0, Math.min(adjustedIndex, destinationTasks.length));
    destinationTasks.splice(insertAt, 0, task);

    return {
        moved: true,
        reason: '',
        board: {
            ...board,
            [fromColumn]: fromColumn === toColumn ? destinationTasks : sourceTasks,
            [toColumn]: destinationTasks,
        },
    };
}
