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
  getState: (key) => request(`/api/admin/state/${encodeURIComponent(key)}`),
  setState: (key, value) => request(`/api/admin/state/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  }),
  getBdayBot: () => request('/api/admin/bdaybot'),
  getStatus: () => request('/api/admin/status'),
};
