import { KANBAN_LIMITS } from './kanbanConfig.js';

const COLUMNS = new Set(['potential', 'inProgress', 'closed']);

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

    const [task] = sourceTasks.splice(sourceIndex, 1);
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
