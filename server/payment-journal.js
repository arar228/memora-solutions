import { randomUUID } from 'node:crypto';
import {
  PAYMENT_LEASE_MS, PAYMENT_REPLAY_MS, PAYMENT_RETRY_MS, newPaymentRequest,
  requestIsTerminal, requestSummary, reviewRequest,
} from './payment-request.js';

// Network calls always happen after the database transaction commits. `write`
// must be persistent and serialize updates to the subscription collection.
export function createPaymentJournal({ read, write, provider, processPayment, buildBody, now = Date.now }) {
  const readSubscription = async id => (await read()).find(item => item.id === id);

  async function prepare(id, { kind, method, cycleEnd = null }) {
    let result;
    let failure;
    await write(items => items.map(item => {
      if (item.id !== id) return item;
      if (item.paymentReviewRequired) { failure = 'PAYMENT_REVIEW_REQUIRED'; return item; }
      const current = item.paymentRequest;
      if (current && !requestIsTerminal(current)) {
        if (current.state === 'manual_review') failure = 'PAYMENT_REVIEW_REQUIRED';
        else if (current.kind !== kind || current.method !== method) failure = 'PAYMENT_IN_PROGRESS';
        else result = current;
        return item;
      }
      if (item.pendingPaymentId) { failure = 'PAYMENT_IN_PROGRESS'; return item; }
      if (kind === 'initial') {
        if (!item.telegramChatId) { failure = 'TELEGRAM_NOT_CONNECTED'; return item; }
        if (item.status === 'active' && Date.parse(item.currentPeriodEnd) > now()) {
          failure = 'ALREADY_ACTIVE'; return item;
        }
        // Legacy initial attempts had no pre-POST marker. We cannot infer that
        // an old missing ID means no provider-side payment was created.
        if (item.paymentJournalVersion !== 1) {
          failure = 'PAYMENT_REVIEW_REQUIRED';
          return reviewRequest(item, 'legacy_initial_attempt', now());
        }
      } else {
        if (item.status !== 'active' || !item.autoRenew || !item.paymentMethodId
          || item.currentPeriodEnd !== cycleEnd) { failure = 'PAYMENT_IN_PROGRESS'; return item; }
        if (current?.kind === 'renewal' && current.cycleEnd === cycleEnd) {
          failure = 'PAYMENT_CYCLE_ATTEMPTED'; return item;
        }
        if (item.paymentJournalVersion !== 1
          && (item.renewalStartedAt || Date.parse(cycleEnd) <= now())) {
          failure = 'PAYMENT_REVIEW_REQUIRED';
          return reviewRequest(item, 'legacy_renewal_attempt', now());
        }
      }
      result = newPaymentRequest(buildBody(item, kind, method), { kind, method, cycleEnd, now: now() });
      return {
        ...item, paymentJournalVersion: 1, paymentRequest: result,
        paymentRequestHistory: current
          ? [...(item.paymentRequestHistory || []), requestSummary(current)].slice(-120)
          : item.paymentRequestHistory || [],
        pendingPaymentMethod: kind === 'initial' ? method : null,
        status: kind === 'initial' ? 'awaiting_payment' : item.status,
        renewalStartedAt: kind === 'renewal' ? result.createdAt : item.renewalStartedAt,
        lastPaymentError: null, updatedAt: result.createdAt,
      };
    }));
    if (failure) throw new Error(failure);
    if (!result) throw new Error('SUBSCRIPTION_NOT_FOUND');
    return result;
  }

  async function submit(id, requestId) {
    let claimed;
    let failure = 'PAYMENT_IN_PROGRESS';
    await write(items => items.map(item => {
      const request = item.paymentRequest;
      if (item.id !== id || request?.id !== requestId || request.paymentId || requestIsTerminal(request)) return item;
      if (request.state === 'manual_review' || item.paymentReviewRequired) {
        failure = 'PAYMENT_REVIEW_REQUIRED'; return item;
      }
      const timestamp = now();
      const created = Date.parse(request.createdAt);
      const replayUntil = Date.parse(request.replayUntil);
      if (request.version !== 1 || !Number.isFinite(created) || !Number.isFinite(replayUntil)
        || replayUntil > created + PAYMENT_REPLAY_MS || timestamp < created
        || (request.lastSubmittedAt && timestamp < Date.parse(request.lastSubmittedAt))
        || timestamp >= replayUntil) {
        failure = request.firstSubmittedAt ? 'PAYMENT_REVIEW_REQUIRED' : 'PAYMENT_ATTEMPT_EXPIRED';
        return request.firstSubmittedAt
          ? reviewRequest(item, 'replay_deadline', timestamp)
          : { ...item, paymentRequest: { ...request, state: 'abandoned', completedAt: new Date(timestamp).toISOString() } };
      }
      const canceled = item.status === 'canceled' || item.status === 'canceling'
        || (request.kind === 'renewal' && !item.autoRenew);
      if (canceled) {
        failure = request.firstSubmittedAt ? 'PAYMENT_REVIEW_REQUIRED' : 'PAYMENT_ATTEMPT_EXPIRED';
        return request.firstSubmittedAt
          ? reviewRequest(item, 'canceled_while_unknown', timestamp)
          : { ...item, paymentRequest: { ...request, state: 'abandoned', completedAt: new Date(timestamp).toISOString() } };
      }
      if (Date.parse(request.leaseUntil) > timestamp || Date.parse(request.retryAfter) > timestamp) return item;
      claimed = {
        ...request, state: 'submitting', attempts: request.attempts + 1,
        firstSubmittedAt: request.firstSubmittedAt || new Date(timestamp).toISOString(),
        lastSubmittedAt: new Date(timestamp).toISOString(),
        leaseId: randomUUID(), leaseUntil: new Date(timestamp + PAYMENT_LEASE_MS).toISOString(),
        retryAfter: new Date(timestamp + PAYMENT_RETRY_MS * Math.min(60, 2 ** Math.min(request.attempts, 6))).toISOString(),
      };
      return { ...item, paymentRequest: claimed };
    }));
    if (!claimed) {
      const current = (await readSubscription(id))?.paymentRequest;
      if (current?.id === requestId && (current.paymentId || requestIsTerminal(current))) return current;
      throw new Error(failure);
    }
    try {
      const payment = await provider('/payments', {
        method: 'POST', bodyJson: claimed.bodyJson, idempotenceKey: claimed.idempotenceKey,
      });
      // The processor associates the authenticated nonce/amount/customer and
      // commits ID + terminal result atomically; a late response cannot regress it.
      await processPayment(payment);
      const current = (await readSubscription(id))?.paymentRequest;
      if (current?.id !== requestId || current.paymentId !== payment.id) {
        throw new Error('PAYMENT_PROVIDER_ERROR');
      }
      return current;
    } catch (error) {
      let recovered;
      await write(items => items.map(item => {
        if (item.id !== id || item.paymentRequest?.id !== requestId) return item;
        const current = item.paymentRequest;
        // An early webhook may have resolved the request even if POST timed out.
        if (current.paymentId || requestIsTerminal(current)) { recovered = current; return item; }
        if (current.leaseId !== claimed.leaseId) return item;
        if (error.providerStatus >= 400 && error.providerStatus < 500 && error.providerStatus !== 429) {
          return reviewRequest(item, `provider_${error.providerStatus}`, now());
        }
        return {
          ...item, lastPaymentError: 'Результат платежа уточняется. Проверяем запрос в ЮKassa.',
          paymentRequest: { ...current, state: 'unknown', leaseId: null, leaseUntil: null,
            lastError: error.code || 'PAYMENT_PROVIDER_ERROR' },
        };
      }));
      if (recovered) return recovered;
      throw error;
    }
  }

  async function reconcile(item) {
    const request = item.paymentRequest;
    const paymentId = item.pendingPaymentId || request?.paymentId;
    if (request?.supersededAt || requestIsTerminal(request)) return;
    if (paymentId) {
      const payment = await provider(`/payments/${encodeURIComponent(paymentId)}`);
      if (payment.id !== paymentId) throw new Error('PAYMENT_PROVIDER_ERROR');
      await processPayment(payment);
    } else if (request && request.state !== 'manual_review') {
      await submit(item.id, request.id);
    }
  }

  return { prepare, submit, reconcile };
}
