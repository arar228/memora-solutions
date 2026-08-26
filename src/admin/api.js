async function request(path, options = {}) {
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.method && options.method !== 'GET' ? { 'X-Memora-Admin': '1' } : {}),
      ...options.headers,
    },
  });

  let body = null;
  try { body = await response.json(); } catch { /* response without JSON */ }
  if (!response.ok) {
    throw new Error(body?.error || `Ошибка сервера (${response.status})`);
  }
  return body;
}

export const adminApi = {
  getOverview: () => request('/api/admin/overview'),
  getKanban: () => request('/api/admin/kanban'),
  saveKanbanBoard: (board) => request('/api/admin/kanban/board', {
    method: 'PUT',
    body: JSON.stringify({ board }),
  }),
  replyKanban: (payload) => request('/api/admin/kanban/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteKanbanMessage: (messageId) => request(
    `/api/admin/kanban/messages/${encodeURIComponent(messageId)}`,
    { method: 'DELETE' },
  ),
  getState: (key) => request(`/api/admin/state/${encodeURIComponent(key)}`),
  setState: (key, value) => request(`/api/admin/state/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  }),
  getBdayBot: () => request('/api/admin/bdaybot'),
  getBdayRecipientCount: (filter) => request(`/api/admin/bdaybot/recipient-count?filter=${encodeURIComponent(filter)}`),
  sendBdayMessage: (payload) => request('/api/admin/bdaybot/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  previewBdayBroadcast: (payload) => request('/api/admin/bdaybot/broadcast-preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  sendBdayBroadcast: (payload) => request('/api/admin/bdaybot/broadcasts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  setBdayUserBlocked: (telegramId, blocked) => request(
    `/api/admin/bdaybot/users/${encodeURIComponent(telegramId)}/${blocked ? 'block' : 'unblock'}`,
    { method: 'POST', body: '{}' },
  ),
  updateBdaySubscription: (telegramId, payload) => request(
    `/api/admin/bdaybot/users/${encodeURIComponent(telegramId)}/subscription`,
    { method: 'PUT', body: JSON.stringify(payload) },
  ),
  disableBdaySubscription: (telegramId) => request(
    `/api/admin/bdaybot/users/${encodeURIComponent(telegramId)}/disable-subscription`,
    { method: 'POST', body: '{}' },
  ),
  deleteBdayUser: (telegramId) => request(
    `/api/admin/bdaybot/users/${encodeURIComponent(telegramId)}`,
    { method: 'DELETE' },
  ),
  getTravel: () => request('/api/admin/travel'),
  grantTravelAccess: (payload) => request('/api/admin/travel/grants', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  grantTravelSubscription: (id, payload) => request(
    `/api/admin/travel/subscriptions/${encodeURIComponent(id)}/grant`,
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  disableTravelSubscription: (id) => request(
    `/api/admin/travel/subscriptions/${encodeURIComponent(id)}/disable`,
    { method: 'POST', body: '{}' },
  ),
  sendTravelMessage: (id, message) => request(
    `/api/admin/travel/subscriptions/${encodeURIComponent(id)}/message`,
    { method: 'POST', body: JSON.stringify({ message }) },
  ),
  deleteTravelSubscription: (id) => request(
    `/api/admin/travel/subscriptions/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  ),
  getStatus: () => request('/api/admin/status'),
};
