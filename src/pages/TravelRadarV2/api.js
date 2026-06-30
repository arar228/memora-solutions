// Thin API client for the Concierge backend. Base URL comes from
// VITE_CONCIERGE_API (set it in .env for the deployed build); defaults to the
// local dev server. When the backend is unreachable the client-facing pages
// fall back to the localStorage demo (conciergeStore.js).

const BASE = (import.meta.env.VITE_CONCIERGE_API || 'http://localhost:4000/api').replace(/\/$/, '');
const TKEY = 'memora-concierge-token';

export const getToken = () => localStorage.getItem(TKEY);
export const setToken = (t) => (t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY));
export const apiBase = BASE;

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const tok = getToken();
  if (auth && tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  health: () => req('/health', { auth: false }),
  register: (b) => req('/auth/register', { method: 'POST', body: b, auth: false }),
  login: (email, password) => req('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => req('/auth/me'),

  createRequest: (b) => req('/requests', { method: 'POST', body: b }),
  listRequests: (qs = '') => req('/requests' + qs),
  getRequest: (id) => req('/requests/' + id),
  assign: (id) => req(`/requests/${id}/assign`, { method: 'POST', body: {} }),
  transition: (id, to) => req(`/requests/${id}/transition`, { method: 'POST', body: { to } }),
  message: (id, body, isInternal = false) => req(`/requests/${id}/messages`, { method: 'POST', body: { body, isInternal } }),

  createOffer: (id, b) => req(`/requests/${id}/offers`, { method: 'POST', body: b }),
  acceptOffer: (id) => req(`/offers/${id}/accept`, { method: 'POST', body: {} }),
  invoice: (id) => req(`/requests/${id}/invoice`, { method: 'POST', body: {} }),
  booking: (id, b) => req(`/requests/${id}/booking`, { method: 'POST', body: b }),
  complete: (id) => req(`/requests/${id}/complete`, { method: 'POST', body: {} }),
  funnel: () => req('/analytics/funnel'),
};

// Best-effort check that a backend is reachable (used to switch the client UI
// between live-API and localStorage-demo modes).
export async function backendAvailable() {
  try {
    const ctrl = AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined;
    const res = await fetch(BASE + '/health', { signal: ctrl });
    return res.ok;
  } catch { return false; }
}
