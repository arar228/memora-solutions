import { kanbanData } from './mockData.js';

export const KANBAN_LIMITS = Object.freeze({
    potential: 7,
    inProgress: 3,
});

// The board order is the priority. A task itself contains only its title and
// due date; the column and array index describe its workflow state and rank.
export const DEFAULT_KANBAN_BOARD = Object.freeze({
    potential: [],
    inProgress: [],
    closed: kanbanData.done
        .filter(task => task.report)
        .map(task => ({
            id: `legacy-${task.id}`,
            title: task.title,
            dueDate: '',
        })),
});

export function cloneDefaultKanbanBoard() {
    return JSON.parse(JSON.stringify(DEFAULT_KANBAN_BOARD));
}
