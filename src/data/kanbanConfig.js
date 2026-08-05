import { kanbanData } from './mockData.js';

export const KANBAN_LIMITS = Object.freeze({
    potential: 7,
    inProgress: 3,
});

// The board order is the priority. Active tasks contain a title and due date;
// completed tasks may also carry the manager's summary of the result.
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
