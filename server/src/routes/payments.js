import { Router } from 'express';
import { db, uid, now } from '../db.js';
import { authRequired, requireRole } from '../auth.js';
import { audit } from '../audit.js';
import { loadRequest, serializeRequest, recordTransition, addSystemMessage, notify } from '../service.js';
import { createPayment, getPaymentStatus, MOCK_MODE } from '../payments.js';

const r = Router();
const isStaff = (role) => ['operator', 'lead', 'admin'].includes(role);
const RETURN_URL = process.env.PAYMENT_RETURN_URL || 'http://localhost:5173/travel-radar-v2';

const acceptedOffer = db.prepare("SELECT * FROM offers WHERE request_id=? AND status='accepted' ORDER BY created_at DESC LIMIT 1");
const insertPayment = db.prepare(
  `INSERT INTO payments (id, request_id, offer_id, client_id, amount_rub, provider, status, external_id, created_at)
   VALUES (@id, @request_id, @offer_id, @client_id, @amount_rub, @provider, 'pending', @external_id, @created_at)`
);
const getPaymentByExternal = db.prepare('SELECT * FROM payments WHERE external_id = ?');
const getPaymentById = db.prepare('SELECT * FROM payments WHERE id = ?');

// Mark a payment paid + advance the request. Atomic + idempotent: only the FIRST
// settlement of a non-paid/non-refunded payment takes effect, so concurrent
// webhooks (or webhook racing the mock page) can't double-credit / double-notify.
function markPaid(paymentId) {
  const ts = now();
  const upd = db.prepare("UPDATE payments SET status='paid', paid_at=?, receipt_id=? WHERE id=? AND status NOT IN ('paid','refunded')")
    .run(ts, 'rcpt_' + paymentId, paymentId);
  if (upd.changes === 0) return; // already settled — no-op
  const payment = getPaymentById.get(paymentId);
  audit({ entity: 'payment', entityId: paymentId, action: 'paid', after: { amount: payment.amount_rub } });
  const request = loadRequest(payment.request_id);
  if (request) {
    try { recordTransition(request, 'paid', { actorRole: 'system', autoMessage: 'Оплата получена, спасибо! Переходим к бронированию.' }); } catch { /* already past */ }
  }
  notify('payment_succeeded', { requestId: payment.request_id, amount: payment.amount_rub });
}

// POST /api/requests/:id/invoice — issue an invoice for the accepted offer.
r.post('/requests/:id/invoice', authRequired, async (req, res) => {
  const request = loadRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });
  if (!isStaff(req.user.role) && request.client_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });

  // Only invoiceable from an accepted quote (blocks re-invoicing a paid/closed one).
  if (!['quote_accepted', 'awaiting_payment'].includes(request.status)) {
    return res.status(409).json({ error: 'request is not awaiting payment' });
  }
  const offer = acceptedOffer.get(request.id);
  if (!offer) return res.status(409).json({ error: 'no accepted offer to invoice' });

  // Drop any stale pending payment for this request so re-issuing a link can't
  // leave duplicate pending rows (paid rows are never touched).
  db.prepare("DELETE FROM payments WHERE request_id=? AND status='pending'").run(request.id);

  try { recordTransition(request, 'awaiting_payment', { actorId: req.user.id, actorRole: req.user.role }); } catch { /* already there */ }

  const id = uid('pay');
  let payment;
  try {
    payment = await createPayment({
      amountRub: offer.total_price_rub,
      description: `Memora Concierge — заявка ${request.id}`,
      idempotenceKey: id,
      metadata: { requestId: request.id, offerId: offer.id },
    });
  } catch (e) {
    return res.status(502).json({ error: 'payment provider error', detail: String(e.message || e) });
  }
  insertPayment.run({
    id, request_id: request.id, offer_id: offer.id, client_id: request.client_id,
    amount_rub: offer.total_price_rub, provider: MOCK_MODE ? 'mock' : 'yookassa',
    external_id: payment.externalId, created_at: now(),
  });
  audit({ entity: 'payment', entityId: id, actorId: req.user.id, action: 'invoice', after: { amount: offer.total_price_rub } });
  res.json({ paymentId: id, confirmationUrl: payment.confirmationUrl, amountRub: offer.total_price_rub, mock: MOCK_MODE });
});

// POST /api/payments/webhook — ЮKassa notification. Never trust the body: the
// status is always re-fetched from the provider. In MOCK mode the webhook is NOT
// a trusted channel (mock payments settle only via the dev mock-pay page), so it
// is ignored — preventing a spoofed body from marking a payment paid.
r.post('/payments/webhook', async (req, res) => {
  if (MOCK_MODE) return res.json({ ok: true });
  const externalId = req.body?.object?.id;
  if (!externalId) return res.status(400).json({ error: 'no payment id' });
  const payment = getPaymentByExternal.get(externalId);
  if (!payment) return res.status(200).json({ ok: true }); // unknown — ack to stop retries
  try {
    const status = await getPaymentStatus(externalId); // authoritative
    if (status === 'succeeded') markPaid(payment.id);
    else if (status === 'canceled') db.prepare("UPDATE payments SET status='failed' WHERE id=? AND status='pending'").run(payment.id);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
  res.json({ ok: true });
});

// GET /api/payments/mock/:externalId/pay — demo "hosted payment page": marks the
// mock payment succeeded and bounces back to the app. Only active in MOCK_MODE.
r.get('/payments/mock/:externalId/pay', (req, res) => {
  if (!MOCK_MODE) return res.status(404).send('not found');
  const payment = getPaymentByExternal.get(req.params.externalId);
  if (!payment) return res.status(404).send('payment not found');
  markPaid(payment.id);
  res
    .status(200)
    .send(`<!doctype html><meta charset="utf-8"><title>Оплачено (демо)</title>
      <body style="font-family:sans-serif;background:#0e1116;color:#e8eaed;display:flex;min-height:100vh;align-items:center;justify-content:center">
      <div style="text-align:center"><h2>✅ Оплата прошла (демо)</h2>
      <p>Заявка переведена в «Оплачено». Возвращаемся в приложение…</p>
      <p><a style="color:#06b6d4" href="${RETURN_URL}">Вернуться</a></p></div>
      <script>setTimeout(()=>location.href=${JSON.stringify(RETURN_URL)},1500)</script>`);
});

// POST /api/payments/:id/refund — refund a PAID payment. lead/admin only,
// state-guarded + idempotent (a conditional UPDATE prevents double-refund).
r.post('/payments/:id/refund', authRequired, requireRole('lead', 'admin'), (req, res) => {
  const payment = getPaymentById.get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'not found' });
  const upd = db.prepare("UPDATE payments SET status='refunded' WHERE id=? AND status='paid'").run(payment.id);
  if (upd.changes === 0) return res.status(409).json({ error: 'payment not in paid state' });
  audit({ entity: 'payment', entityId: payment.id, actorId: req.user.id, action: 'refund' });
  const request = loadRequest(payment.request_id);
  if (request) {
    try { recordTransition(request, 'refund_requested', { actorId: req.user.id, actorRole: req.user.role }); } catch { /* ignore */ }
    try { recordTransition(loadRequest(request.id), 'refunded', { actorId: req.user.id, actorRole: req.user.role, autoMessage: 'Возврат выполнен.' }); } catch { /* ignore */ }
  }
  res.json({ ok: true });
});

export default r;
