import { randomUUID } from 'node:crypto';

// YooKassa guarantees idempotence for 24 hours. Keep an hour of safety margin;
// ambiguous requests past this deadline require a provider/operator lookup.
export const PAYMENT_REPLAY_MS = 23 * 60 * 60 * 1000;
export const PAYMENT_LEASE_MS = 90_000;
export const PAYMENT_RETRY_MS = 60_000;
export const PAYMENT_REVIEW_MESSAGE = 'Платёж требует сверки с ЮKassa. Автоматическое повторное списание приостановлено; обратитесь в поддержку.';
export const requestIsTerminal = request => ['succeeded', 'canceled', 'abandoned'].includes(request?.state);

export function newPaymentRequest(body, { kind, method, cycleEnd = null, now = Date.now() }) {
  const id = randomUUID();
  return {
    version: 1, id, idempotenceKey: id, kind, method, cycleEnd,
    // Persist the exact bytes, including receipt/email/amount/metadata. Retries
    // use this snapshot even if settings or the application version change.
    bodyJson: JSON.stringify({ ...body, metadata: { ...body.metadata, payment_request_id: id } }),
    createdAt: new Date(now).toISOString(), replayUntil: new Date(now + PAYMENT_REPLAY_MS).toISOString(),
    state: 'prepared', attempts: 0, firstSubmittedAt: null, lastSubmittedAt: null,
    leaseId: null, leaseUntil: null, retryAfter: null, paymentId: null,
  };
}

export function requestSummary(request) {
  if (!request) return null;
  const { id, kind, method, cycleEnd, state, createdAt, firstSubmittedAt, paymentId, attempts, completedAt, reviewReason } = request;
  return { id, kind, method, cycleEnd, state, createdAt, firstSubmittedAt, paymentId, attempts, completedAt, reviewReason };
}

export function reviewRequest(item, reason, now = Date.now()) {
  return {
    ...item, paymentReviewRequired: true, lastPaymentError: PAYMENT_REVIEW_MESSAGE,
    paymentRequest: item.paymentRequest ? {
      ...item.paymentRequest, state: 'manual_review', reviewReason: reason, leaseId: null, leaseUntil: null,
    } : null,
    updatedAt: new Date(now).toISOString(),
  };
}

export function requestAfterAdminOverride(item, now) {
  const request = item.paymentRequest;
  if (!request && item.pendingPaymentId) {
    return { legacyPaymentOverride: { paymentId: item.pendingPaymentId, supersededAt: now },
      pendingPaymentId: item.pendingPaymentId, paymentReviewRequired: true, lastPaymentError: PAYMENT_REVIEW_MESSAGE };
  }
  if (!request || requestIsTerminal(request)) return {};
  if (!request.firstSubmittedAt && !request.paymentId) {
    return { paymentRequest: { ...request, state: 'abandoned', completedAt: now, leaseId: null, leaseUntil: null } };
  }
  return {
    paymentRequest: { ...request, state: 'manual_review', supersededAt: now, reviewReason: 'admin_override', leaseId: null, leaseUntil: null },
    paymentReviewRequired: true, lastPaymentError: PAYMENT_REVIEW_MESSAGE,
  };
}

export function knownPayment(item, id) {
  return (item.appliedPaymentIds || []).includes(id) || (item.resolvedPaymentIds || []).includes(id)
    || (item.legacyPaymentOverride?.paymentId === id && ['succeeded', 'canceled'].includes(item.legacyPaymentOverride.observedStatus))
    || (item.paymentRequestHistory || []).some(request => request.paymentId === id && requestIsTerminal(request));
}

export function paymentBelongsToSubscription(payment, item, legacyPrice = 300) {
  if (!payment?.id || !item?.id) return false;
  if (String(payment.metadata?.subscription_id || '') !== item.id
    || String(payment.merchant_customer_id || '') !== item.id
    || !['initial', 'renewal'].includes(payment.metadata?.payment_kind)) return false;
  if (item.pendingPaymentId && item.pendingPaymentId !== payment.id) return false;
  const request = item.paymentRequest;
  if (request) {
    if (request.version !== 1 || request.id !== payment.metadata?.payment_request_id
      || request.kind !== payment.metadata?.payment_kind
      || (request.paymentId && request.paymentId !== payment.id)
      || request.state === 'abandoned') return false;
    let body;
    try { body = JSON.parse(request.bodyJson); } catch { return false; }
    return payment.amount?.currency === body.amount?.currency
      && Number(payment.amount?.value) === Number(body.amount?.value)
      && Number(payment.amount?.value) > 0
      && (!body.metadata?.payment_mode || body.metadata.payment_mode === payment.metadata?.payment_mode);
  }
  // Existing payments created before the journal was introduced keep the exact
  // pending-ID rule. Provider metadata alone cannot attach a legacy payment.
  return item.pendingPaymentId === payment.id && payment.amount?.currency === 'RUB'
    && Number(payment.amount?.value) === legacyPrice;
}
