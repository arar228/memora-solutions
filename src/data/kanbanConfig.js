import { kanbanData } from './mockData.js';

export const KANBAN_LIMITS = Object.freeze({
    potential: 7,
    inProgress: 3,
});

// A new storage key is used for this board, so the old mock/management cards
// do not leak back into the cleaned public workspace. Completed reports are
// intentionally preserved as the initial archive and become editable in admin.
export const DEFAULT_KANBAN_BOARD = Object.freeze({
    potential: [],
    inProgress: [],
    closed: kanbanData.done
        .filter(task => task.report)
        .map(task => ({
            id: `legacy-${task.id}`,
            title: task.title,
            titleEn: task.titleEn || '',
            desc: task.desc || '',
            descEn: task.descEn || '',
            report: task.report,
            reportEn: task.reportEn || '',
            priority: task.priority || 'medium',
        })),
});

export function cloneDefaultKanbanBoard() {
    return JSON.parse(JSON.stringify(DEFAULT_KANBAN_BOARD));
}
