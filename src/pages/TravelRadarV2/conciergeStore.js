// Client-side store for the Concierge MVP. No backend yet — requests live in
// localStorage so the whole v2.0 flow is clickable and demoable. When the real
// backend lands, only this module's internals change (the API stays the same).

const KEY = 'memora-concierge-requests-v2';

// The happy-path state machine from the TZ (§4.3). The demo "advance" walks it.
export const FLOW = [
  'new',
  'assigned',
  'clarifying',
  'quoting',
  'quote_sent',
  'quote_accepted',
  'awaiting_payment',
  'paid',
  'booking',
  'booked',
  'completed',
];

// Status → colour token (used for the badge).
export const STATUS_TONE = {
  new: 'blue',
  assigned: 'blue',
  clarifying: 'amber',
  quoting: 'amber',
  quote_sent: 'amber',
  quote_accepted: 'teal',
  awaiting_payment: 'amber',
  paid: 'teal',
  booking: 'teal',
  booked: 'green',
  completed: 'green',
  cancelled: 'grey',
};

function now() { return new Date().toISOString(); }

function uid() {
  if (globalThis.crypto?.randomUUID) return 'r-' + crypto.randomUUID();
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

export function loadRequests() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function persist(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* quota / private mode */ }
}

export function createRequest(data) {
  const req = {
    id: uid(),
    createdAt: now(),
    status: 'new',
    history: [{ status: 'new', at: now() }],
    messages: [],
    ...data,
  };
  const all = loadRequests();
  all.unshift(req);
  persist(all);
  return req;
}

export function addMessage(id, from, text) {
  const all = loadRequests();
  const req = all.find((r) => r.id === id);
  if (!req || typeof text !== 'string' || !text.trim()) return all;
  req.messages.push({ from, text: text.trim(), at: now() });
  persist(all);
  return all;
}

// Demo: simulate an operator moving the request to the next status, with an
// auto reply. Returns the updated list.
export function advanceStatus(id, autoMessages) {
  const all = loadRequests();
  const req = all.find((r) => r.id === id);
  if (!req || req.status === 'cancelled') return all;
  const i = FLOW.indexOf(req.status);
  if (i < 0 || i >= FLOW.length - 1) return all;
  const next = FLOW[i + 1];
  req.status = next;
  req.history.push({ status: next, at: now() });
  const auto = autoMessages && autoMessages[next];
  if (auto) req.messages.push({ from: 'operator', text: auto, at: now() });
  persist(all);
  return all;
}

export function cancelRequest(id) {
  const all = loadRequests();
  const req = all.find((r) => r.id === id);
  if (!req) return all;
  if (req.status !== 'completed' && req.status !== 'cancelled') {
    req.status = 'cancelled';
    req.history.push({ status: 'cancelled', at: now() });
  }
  persist(all);
  return all;
}
