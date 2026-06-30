import { Router } from 'express';
import { db, uid, now } from '../db.js';
import { authRequired } from '../auth.js';
import { audit } from '../audit.js';
import {
  loadRequest, serializeRequest, recordTransition, addMessage, TransitionError,
} from '../service.js';

const r = Router();
const isStaff = (role) => ['operator', 'lead', 'admin'].includes(role);

const insertRequest = db.prepare(
  `INSERT INTO requests (id, client_id, source, deal_id, external_ref, type, status, payload, utm, settlement_scheme, created_at, updated_at)
   VALUES (@id, @client_id, @source, @deal_id, @external_ref, @type, 'new', @payload, @utm, @settlement_scheme, @created_at, @created_at)`
);

// POST /api/requests — a client creates a request.
r.post('/', authRequired, (req, res) => {
  const b = req.body || {};
  const type = ['air', 'tour', 'hotel', 'combo'].includes(b.type) ? b.type : 'air';
  const source = ['radar_deal', 'video_landing', 'free_form'].includes(b.source) ? b.source : 'free_form';
  const id = uid('req');
  const ts = now();
  const payload = {
    route: b.route || '', flex: b.flex || null, departure: b.departure || null,
    passengers: b.passengers || { adults: 1, kids: 0 }, budget: b.budget || null,
    urgency: b.urgency || null, contact: b.contact || null, channel: b.channel || 'web',
  };
  insertRequest.run({
    id, client_id: req.user.id, source, deal_id: b.dealId || null, external_ref: b.external || null,
    type, payload: JSON.stringify(payload), utm: b.utm || null,
    settlement_scheme: b.settlementScheme === 'B' ? 'B' : 'A', created_at: ts,
  });
  audit({ entity: 'request', entityId: id, actorId: req.user.id, action: 'create', after: { source, type } });
  res.json({ request: serializeRequest(loadRequest(id), { detail: true, role: req.user.role }) });
});

// GET /api/requests — client: own; staff: queue with filters.
const listOwn = db.prepare('SELECT * FROM requests WHERE client_id = ? ORDER BY created_at DESC');
r.get('/', authRequired, (req, res) => {
  if (isStaff(req.user.role)) {
    const { status, type, assigned } = req.query;
    let sql = 'SELECT * FROM requests WHERE 1=1';
    const args = [];
    if (status) { sql += ' AND status = ?'; args.push(status); }
    if (type) { sql += ' AND type = ?'; args.push(type); }
    if (assigned === 'me') { sql += ' AND assigned_operator_id = ?'; args.push(req.user.id); }
    sql += ' ORDER BY priority DESC, created_at ASC';
    const rows = db.prepare(sql).all(...args);
    return res.json({ requests: rows.map((row) => serializeRequest(row, { role: req.user.role })) });
  }
  const rows = listOwn.all(req.user.id);
  res.json({ requests: rows.map((row) => serializeRequest(row, { role: 'client' })) });
});

// Access guard: client may only touch own requests; staff may touch any.
function loadAccessible(req, res) {
  const row = loadRequest(req.params.id);
  if (!row) { res.status(404).json({ error: 'not found' }); return null; }
  if (!isStaff(req.user.role) && row.client_id !== req.user.id) { res.status(403).json({ error: 'forbidden' }); return null; }
  return row;
}

// GET /api/requests/:id — detail.
r.get('/:id', authRequired, (req, res) => {
  const row = loadAccessible(req, res);
  if (!row) return;
  res.json({ request: serializeRequest(row, { detail: true, role: req.user.role }) });
});

// POST /api/requests/:id/assign — operator takes the request.
r.post('/:id/assign', authRequired, (req, res) => {
  if (!isStaff(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  const row = loadRequest(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  const operatorId = (req.user.role === 'admin' || req.user.role === 'lead') && req.body?.operatorId
    ? req.body.operatorId : req.user.id;
  db.prepare('UPDATE requests SET assigned_operator_id=?, updated_at=? WHERE id=?').run(operatorId, now(), row.id);
  audit({ entity: 'request', entityId: row.id, actorId: req.user.id, action: 'assign', after: { operatorId } });
  try {
    if (row.status === 'new') recordTransition(row, 'assigned', { actorId: req.user.id, actorRole: req.user.role });
  } catch (e) { /* already past 'new' — fine */ }
  res.json({ request: serializeRequest(loadRequest(row.id), { detail: true, role: req.user.role }) });
});

// POST /api/requests/:id/transition { to } — validated state change.
r.post('/:id/transition', authRequired, (req, res) => {
  const row = loadAccessible(req, res);
  if (!row) return;
  const to = req.body?.to;
  if (!to) return res.status(400).json({ error: 'to required' });
  // 'paid' is system-only (set by the payment webhook) — block humans here.
  if (to === 'paid') return res.status(403).json({ error: 'paid is set by the payment webhook only' });
  // A client may only cancel or request a refund via the generic endpoint;
  // quote_accepted must go through POST /api/offers/:id/accept (which records the
  // accepted offer) to avoid an accepted-but-offerless inconsistent state.
  if (!isStaff(req.user.role) && !['cancelled', 'refund_requested'].includes(to)) {
    return res.status(403).json({ error: 'clients may only cancel or request a refund here' });
  }
  try {
    recordTransition(row, to, { actorId: req.user.id, actorRole: req.user.role });
    res.json({ request: serializeRequest(loadRequest(row.id), { detail: true, role: req.user.role }) });
  } catch (e) {
    if (e instanceof TransitionError) return res.status(e.code).json({ error: e.message });
    throw e;
  }
});

// POST /api/requests/:id/messages { body, isInternal } — chat.
r.post('/:id/messages', authRequired, (req, res) => {
  const row = loadAccessible(req, res);
  if (!row) return;
  const isInternal = isStaff(req.user.role) && !!req.body?.isInternal;
  const msg = addMessage({
    requestId: row.id, senderId: req.user.id, senderRole: isStaff(req.user.role) ? 'operator' : 'client',
    body: req.body?.body, channel: 'web', isInternal,
  });
  if (!msg) return res.status(400).json({ error: 'empty message' });
  res.json({ message: msg });
});

export default r;
