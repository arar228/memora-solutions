import { db, uid, now } from './db.js';
import { audit } from './audit.js';
import { canTransition, actorMayMoveTo } from './stateMachine.js';

// --- Request loading / serialization ---
const getRequest = db.prepare('SELECT * FROM requests WHERE id = ?');
const getOffers = db.prepare('SELECT * FROM offers WHERE request_id = ? ORDER BY created_at');
const getMessages = db.prepare('SELECT * FROM messages WHERE request_id = ? ORDER BY created_at');
const getHistory = db.prepare(
  `SELECT after, created_at FROM audit_log WHERE entity='request' AND entity_id=? AND action='transition' ORDER BY created_at`
);

export function loadRequest(id) {
  const row = getRequest.get(id);
  if (!row) return null;
  return row;
}

export function serializeRequest(row, { detail = false, role = 'client' } = {}) {
  if (!row) return null;
  let payload = {};
  try { payload = row.payload ? JSON.parse(row.payload) : {}; } catch { payload = {}; }
  const base = {
    id: row.id,
    clientId: row.client_id,
    source: row.source,
    dealId: row.deal_id,
    external: row.external_ref,
    type: row.type,
    status: row.status,
    payload,
    utm: row.utm,
    assignedOperatorId: row.assigned_operator_id,
    priority: row.priority,
    slaDeadline: row.sla_deadline,
    settlementScheme: row.settlement_scheme,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (!detail) return base;

  base.offers = getOffers.all(row.id).map(serializeOffer);
  base.messages = getMessages.all(row.id)
    .filter((m) => role !== 'client' || !m.is_internal)
    .map((m) => ({ id: m.id, from: m.sender_role, body: m.body, isInternal: !!m.is_internal, at: m.created_at }));
  base.history = getHistory.all(row.id).map((h) => {
    let to = null; try { to = JSON.parse(h.after)?.status; } catch { /* ignore */ }
    return { status: to, at: h.created_at };
  });
  // seed the history with creation if no transition rows yet
  if (!base.history.length) base.history = [{ status: 'new', at: row.created_at }];
  else base.history.unshift({ status: 'new', at: row.created_at });
  return base;
}

export function serializeOffer(o) {
  return {
    id: o.id,
    requestId: o.request_id,
    version: o.version,
    description: o.description,
    routeDetails: o.route_details,
    supplierCost: o.supplier_cost_amount,
    supplierCurrency: o.supplier_currency,
    fxRate: o.fx_rate,
    serviceFee: o.service_fee_value,
    feeType: o.fee_type,
    settlementScheme: o.settlement_scheme,
    totalRub: o.total_price_rub,
    expectedMargin: o.expected_margin,
    validUntil: o.valid_until,
    status: o.status,
    createdAt: o.created_at,
  };
}

// --- Transition (the ONLY way request.status changes) ---
const updateStatus = db.prepare('UPDATE requests SET status=@status, updated_at=@updated_at WHERE id=@id');

export class TransitionError extends Error {
  constructor(message, code = 409) { super(message); this.code = code; }
}

// actorRole may be 'system' for webhook/automation-driven transitions.
export function recordTransition(request, to, { actorId = null, actorRole = 'system', autoMessage = null } = {}) {
  const from = request.status;
  if (from === to) return request;
  if (!canTransition(from, to)) throw new TransitionError(`illegal transition ${from} -> ${to}`);
  if (!actorMayMoveTo(actorRole, to)) throw new TransitionError(`role ${actorRole} may not move to ${to}`, 403);

  const ts = now();
  updateStatus.run({ id: request.id, status: to, updated_at: ts });
  audit({ entity: 'request', entityId: request.id, actorId, action: 'transition', before: { status: from }, after: { status: to } });
  if (autoMessage) addSystemMessage(request.id, autoMessage);
  notify('status_changed', { requestId: request.id, status: to, clientId: request.client_id });
  request.status = to;
  request.updated_at = ts;
  return request;
}

// --- Messages ---
const insertMessage = db.prepare(
  `INSERT INTO messages (id, request_id, sender_id, sender_role, channel, body, is_internal, created_at)
   VALUES (@id, @request_id, @sender_id, @sender_role, @channel, @body, @is_internal, @created_at)`
);

export function addMessage({ requestId, senderId, senderRole, body, channel = 'web', isInternal = false }) {
  if (typeof body !== 'string' || !body.trim()) return null;
  const id = uid('msg');
  insertMessage.run({
    id, request_id: requestId, sender_id: senderId || null, sender_role: senderRole,
    channel, body: body.trim(), is_internal: isInternal ? 1 : 0, created_at: now(),
  });
  return { id, from: senderRole, body: body.trim(), isInternal, at: now() };
}

export function addSystemMessage(requestId, body) {
  return addMessage({ requestId, senderId: null, senderRole: 'operator', body });
}

// --- Notifications (TZ §7). Pluggable: in-app + Telegram/email adapters. For
// Phase 1 they log; wire real channels by env later. Never throws. ---
export function notify(event, data) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[notify] ${event}`, JSON.stringify(data));
    // TODO: enqueue Telegram (TELEGRAM_BOT_TOKEN) / email (SMTP) deliveries.
  } catch { /* never break the request on a notification failure */ }
}
