import { Router } from 'express';
import { db, uid, now } from '../db.js';
import { authRequired } from '../auth.js';
import { audit } from '../audit.js';
import { loadRequest, serializeRequest, serializeOffer, recordTransition, TransitionError } from '../service.js';
import { canTransition } from '../stateMachine.js';

const r = Router();
const isStaff = (role) => ['operator', 'lead', 'admin'].includes(role);

const insertOffer = db.prepare(
  `INSERT INTO offers (id, request_id, operator_id, version, description, route_details,
      supplier_cost_amount, supplier_currency, fx_rate, service_fee_value, fee_type,
      settlement_scheme, total_price_rub, expected_margin, valid_until, status, created_at)
   VALUES (@id, @request_id, @operator_id, @version, @description, @route_details,
      @supplier_cost_amount, @supplier_currency, @fx_rate, @service_fee_value, @fee_type,
      @settlement_scheme, @total_price_rub, @expected_margin, @valid_until, 'sent', @created_at)`
);
const countVersions = db.prepare('SELECT COUNT(*) c FROM offers WHERE request_id = ?');
const getOffer = db.prepare('SELECT * FROM offers WHERE id = ?');

// Separate the service commission from the (pass-through) supplier cost — TZ §6.
function computeTotals({ supplierCost = 0, fxRate = 1, serviceFee = 0, feeType = 'fixed' }) {
  const sc = Math.max(0, Number(supplierCost) || 0);
  const fx = Math.max(0, Number(fxRate) || 1);
  const fee = Math.max(0, Number(serviceFee) || 0);
  const supplierRub = sc * fx;
  const feeRub = feeType === 'percent' ? supplierRub * (fee / 100) : fee;
  return {
    supplierRub: Math.round(supplierRub * 100) / 100,
    feeRub: Math.round(feeRub * 100) / 100,
    total: Math.round((supplierRub + feeRub) * 100) / 100,
    margin: Math.round(feeRub * 100) / 100, // service fee is the gross margin
  };
}

// POST /api/requests/:id/offers — operator builds a quote.
r.post('/requests/:id/offers', authRequired, (req, res) => {
  if (!isStaff(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  const request = loadRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });

  const b = req.body || {};
  const totals = computeTotals(b);
  const id = uid('off');
  const version = (countVersions.get(request.id).c || 0) + 1;
  insertOffer.run({
    id, request_id: request.id, operator_id: req.user.id, version,
    description: b.description || null, route_details: b.routeDetails || null,
    supplier_cost_amount: Number(b.supplierCost) || 0, supplier_currency: b.supplierCurrency || 'RUB',
    fx_rate: Number(b.fxRate) || 1, service_fee_value: Number(b.serviceFee) || 0,
    fee_type: b.feeType === 'percent' ? 'percent' : 'fixed',
    settlement_scheme: b.settlementScheme === 'B' ? 'B' : (request.settlement_scheme || 'A'),
    total_price_rub: totals.total, expected_margin: totals.margin,
    valid_until: b.validUntil || null, created_at: now(),
  });
  audit({ entity: 'offer', entityId: id, actorId: req.user.id, action: 'create', after: { total: totals.total, requestId: request.id } });

  // Move the request forward to quote_sent if it isn't already past it.
  if (['assigned', 'clarifying', 'quoting'].includes(request.status)) {
    try { recordTransition(request, request.status === 'quoting' ? 'quote_sent' : 'quoting', { actorId: req.user.id, actorRole: req.user.role }); } catch { /* ignore */ }
    if (request.status === 'quoting') {
      try { recordTransition(request, 'quote_sent', { actorId: req.user.id, actorRole: req.user.role }); } catch { /* ignore */ }
    }
  }
  res.json({ offer: serializeOffer(getOffer.get(id)), request: serializeRequest(loadRequest(request.id), { detail: true, role: req.user.role }) });
});

// POST /api/offers/:id/accept — client accepts a quote.
r.post('/offers/:id/accept', authRequired, (req, res) => {
  const offer = getOffer.get(req.params.id);
  if (!offer) return res.status(404).json({ error: 'not found' });
  const request = loadRequest(offer.request_id);
  if (!request) return res.status(404).json({ error: 'request not found' });
  if (request.client_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  if (offer.status !== 'sent') return res.status(409).json({ error: 'offer is not open' });
  if (!canTransition(request.status, 'quote_accepted')) return res.status(409).json({ error: `cannot accept from ${request.status}` });

  // Atomic: accept this offer, reject siblings, and advance the request together.
  const tx = db.transaction(() => {
    db.prepare("UPDATE offers SET status='accepted' WHERE id=?").run(offer.id);
    db.prepare("UPDATE offers SET status='rejected' WHERE request_id=? AND id<>? AND status='sent'").run(request.id, offer.id);
    recordTransition(request, 'quote_accepted', { actorId: req.user.id, actorRole: 'client' });
  });
  try { tx(); } catch (e) {
    if (e instanceof TransitionError) return res.status(e.code).json({ error: e.message });
    throw e;
  }
  audit({ entity: 'offer', entityId: offer.id, actorId: req.user.id, action: 'accept' });
  res.json({ request: serializeRequest(loadRequest(request.id), { detail: true, role: req.user.role }) });
});

// POST /api/offers/:id/reject — client rejects.
r.post('/offers/:id/reject', authRequired, (req, res) => {
  const offer = getOffer.get(req.params.id);
  if (!offer) return res.status(404).json({ error: 'not found' });
  const request = loadRequest(offer.request_id);
  if (request.client_id !== req.user.id && !isStaff(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  db.prepare("UPDATE offers SET status='rejected' WHERE id=?").run(offer.id);
  audit({ entity: 'offer', entityId: offer.id, actorId: req.user.id, action: 'reject' });
  res.json({ ok: true });
});

export default r;
