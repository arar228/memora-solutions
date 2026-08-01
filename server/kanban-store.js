import { randomUUID } from 'node:crypto';
import { getState, updateState } from './admin-store.js';
import { KANBAN_LIMITS, cloneDefaultKanbanBoard } from '../src/data/kanbanConfig.js';

export const KANBAN_BOARD_KEY = 'kanban_board_v2';
export const KANBAN_MESSAGES_KEY = 'kanban_messages_v1';
export const KANBAN_MESSAGE_MODES = new Set(['general', 'personal']);

const PRIORITIES = new Set(['high', 'medium', 'low']);
const MAX_CLOSED_TASKS = 250;
const MAX_MESSAGES = 500;

const cleanLine = (value, max) => String(value || '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim()
  .slice(0, max);

export const validClientId = value => typeof value === 'string'
  && /^[a-zA-Z0-9_-]{16,80}$/.test(value);

function cleanTask(task, closed = false) {
  if (!task || typeof task !== 'object') return null;
  const title = cleanLine(task.title, 160);
  if (!title) return null;
  return {
    id: cleanLine(task.id || randomUUID(), 80),
    title,
    titleEn: cleanLine(task.titleEn, 160),
    desc: cleanLine(task.desc, 2000),
    descEn: cleanLine(task.descEn, 2000),
    report: closed ? cleanLine(task.report, 6000) : '',
    reportEn: closed ? cleanLine(task.reportEn, 6000) : '',
    priority: PRIORITIES.has(task.priority) ? task.priority : 'medium',
  };
}

export function validateKanbanBoard(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const columns = [
    ['potential', KANBAN_LIMITS.potential, false],
    ['inProgress', KANBAN_LIMITS.inProgress, false],
    ['closed', MAX_CLOSED_TASKS, true],
  ];
  const board = {};
  const ids = new Set();
  for (const [column, limit, closed] of columns) {
    if (!Array.isArray(input[column]) || input[column].length > limit) return null;
    board[column] = [];
    for (const rawTask of input[column]) {
      const task = cleanTask(rawTask, closed);
      if (!task || ids.has(task.id)) return null;
      ids.add(task.id);
      board[column].push(task);
    }
  }
  return board;
}

export async function getKanbanBoard() {
  const fallback = cloneDefaultKanbanBoard();
  const stored = await getState(KANBAN_BOARD_KEY, fallback);
  return validateKanbanBoard(stored) || fallback;
}

function cleanStoredMessages(input) {
  if (!Array.isArray(input)) return [];
  return input.filter(message => message
    && KANBAN_MESSAGE_MODES.has(message.mode)
    && (message.mode === 'general' || validClientId(message.conversationId)))
    .slice(-MAX_MESSAGES);
}

export async function getKanbanMessages(mode, conversationId, admin = false) {
  const messages = cleanStoredMessages(await getState(KANBAN_MESSAGES_KEY, []));
  if (admin) return messages;
  if (mode === 'general') return messages.filter(message => message.mode === 'general');
  return messages.filter(message => message.mode === 'personal'
    && message.conversationId === conversationId);
}

export async function appendKanbanMessage({
  mode,
  conversationId = '',
  text,
  name = '',
  author = 'visitor',
}) {
  if (!KANBAN_MESSAGE_MODES.has(mode)) throw new Error('INVALID_MODE');
  if (mode === 'personal' && !validClientId(conversationId)) throw new Error('INVALID_CLIENT');
  const cleanText = cleanLine(text, 1200);
  const cleanName = cleanLine(name, 40);
  if (cleanText.length < 2) throw new Error('INVALID_MESSAGE');
  const message = {
    id: randomUUID(),
    mode,
    conversationId: mode === 'personal' ? conversationId : '',
    text: cleanText,
    name: author === 'visitor' ? cleanName : 'Команда Memora',
    author: author === 'manager' ? 'manager' : 'visitor',
    createdAt: new Date().toISOString(),
  };
  await updateState(KANBAN_MESSAGES_KEY, [], current => [
    ...cleanStoredMessages(current),
    message,
  ].slice(-MAX_MESSAGES));
  return message;
}

export async function deleteKanbanMessage(messageId) {
  const cleanId = cleanLine(messageId, 80);
  return updateState(KANBAN_MESSAGES_KEY, [], current => (
    cleanStoredMessages(current).filter(message => message.id !== cleanId)
  ));
}
