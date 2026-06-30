import { Router } from 'express';
import { db, uid, now } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { audit } from '../audit.js';
import { loadRequest, serializeRequest, recordTransition } from '../service.js';

const r = Router();
const staff = requireRole('operator', 'lead', 'admin');

// POST /api/requests/:id/booking — operator records the supplier booking + payment.
r.post('/requests/:id/booking', authRequired, staff, (req, res) => {
  const request = loadRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};

  // paid -> booking
  try { recordTransition(request, 'booking', { actorId: req.user.id, actorRole: req.user.role }); } catch { /* maybe already */ }

  // Record the outgoing supplier payment (TZ §5.2) for margin accounting.
  if (b.supplierAmount != null) {
    db.prepare(
      `INSERT INTO supplier_payments (id, request_id, supplier, amount, currency, fx_rate, method, reference, paid_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(uid('sp'), request.id, b.supplier || null, Number(b.supplierAmount) || 0,
      b.supplierCurrency || 'RUB', Number(b.fxRate) || 1, b.method || null, b.reference || null, now());
  }

  const bookingId = uid('bk');
  db.prepare(
    `INSERT INTO bookings (id, request_id, supplier, booking_reference, status, booked_at)
     VALUES (?,?,?,?,?,?)`
  ).run(bookingId, request.id, b.supplier || null, b.bookingReference || null, 'confirmed', now());
  audit({ entity: 'booking', entityId: bookingId, actorId: req.user.id, action: 'create', after: { ref: b.bookingReference } });

  // booking -> booked
  try { recordTransition(loadRequest(request.id), 'booked', { actorId: req.user.id, actorRole: req.user.role, autoMessage: 'Готово! Билеты и ваучеры — в разделе документов.' }); } catch { /* ignore */ }

  res.json({ request: serializeRequest(loadRequest(request.id), { detail: true, role: req.user.role }) });
});

// POST /api/requests/:id/documents — attach a trip document (ticket/voucher/…).
// For Phase 1 fileRef is a string/URL; real upload + at-rest encryption is next.
r.post('/requests/:id/documents', authRequired, staff, (req, res) => {
  const request = loadRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  const id = uid('doc');
  db.prepare(
    `INSERT INTO trip_documents (id, request_id, type, file_ref, visible_to_client, issued_at)
     VALUES (?,?,?,?,?,?)`
  ).run(id, request.id, b.type || 'ticket', b.fileRef || null, b.visibleToClient === false ? 0 : 1, now());
  audit({ entity: 'trip_document', entityId: id, actorId: req.user.id, action: 'issue', after: { type: b.type } });
  res.json({ ok: true, id });
});

// GET /api/requests/:id/documents — list (client sees only visible ones).
r.get('/requests/:id/documents', authRequired, (req, res) => {
  const request = loadRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });
  const isStaff = ['operator', 'lead', 'admin'].includes(req.user.role);
  if (!isStaff && request.client_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  let rows = db.prepare('SELECT * FROM trip_documents WHERE request_id=? ORDER BY issued_at').all(request.id);
  if (!isStaff) rows = rows.filter((d) => d.visible_to_client);
  res.json({ documents: rows.map((d) => ({ id: d.id, type: d.type, fileRef: d.file_ref, issuedAt: d.issued_at })) });
});

// POST /api/requests/:id/complete — close out.
r.post('/requests/:id/complete', authRequired, staff, (req, res) => {
  const request = loadRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });
  try { recordTransition(request, 'completed', { actorId: req.user.id, actorRole: req.user.role, autoMessage: 'Заявка закрыта. Хорошей поездки!' }); } catch { /* ignore */ }
  res.json({ request: serializeRequest(loadRequest(request.id), { detail: true, role: req.user.role }) });
});

// GET /api/analytics/funnel — funnel counts (TZ §12).
r.get('/analytics/funnel', authRequired, staff, (_req, res) => {
  const byStatus = db.prepare('SELECT status, COUNT(*) c FROM requests GROUP BY status').all();
  const bySource = db.prepare('SELECT source, COUNT(*) c FROM requests GROUP BY source').all();
  const paid = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(amount_rub),0) sum FROM payments WHERE status='paid'").get();
  const margin = db.prepare("SELECT COALESCE(SUM(expected_margin),0) m FROM offers WHERE status='accepted'").get();
  res.json({
    byStatus: Object.fromEntries(byStatus.map((x) => [x.status, x.c])),
    bySource: Object.fromEntries(bySource.map((x) => [x.source, x.c])),
    paidCount: paid.c, paidSumRub: paid.sum, acceptedMarginRub: margin.m,
  });
});

export default r;
