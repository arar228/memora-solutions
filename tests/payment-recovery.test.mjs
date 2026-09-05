import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isolatedModule } from './helpers/isolated.mjs';
import * as paymentRequestModule from '../server/payment-request.js';
import * as paymentJournalModule from '../server/payment-journal.js';

const key = 'travel_radar_subscriptions_v1';
const token = 'fixture-checkout-token';
const subscription = (extra = {}) => ({
  id: 'fixture-subscription', tokenHash: createHash('sha256').update(token).digest('hex'),
  email: 'fixture@example.invalid', telegramChatId: 123, status: 'awaiting_payment',
  autoRenew: true, paymentAttempt: 1, pendingPaymentId: null, pendingPaymentMethod: null,
  appliedPaymentIds: [], currentPeriodEnd: null, renewalStartedAt: null,
  paymentJournalVersion: 1, ...extra,
});
const payment = (extra = {}) => ({
  id: 'fixture-payment', status: 'succeeded', amount: { value: '300.00', currency: 'RUB' },
  merchant_customer_id: 'fixture-subscription',
  metadata: { subscription_id: 'fixture-subscription', payment_kind: 'initial', payment_mode: 'one_time' },
  ...extra,
});
const event = (kind = 'succeeded', id = 'fixture-payment') => ({ event: `payment.${kind}`, object: { id } });
const response = value => ({ ok: true, status: 200, json: async () => structuredClone(value) });

async function fixture(initial = [subscription()], globals = {}) {
  let state = structuredClone(initial);
  let network = async () => { throw new Error('Unexpected provider call'); };
  let updateHook;
  let persistent = true;
  let timestamp = Date.now();
  class FixtureDate extends Date {
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
    static now() { return timestamp; }
  }
  const calls = [];
  const loadApi = () => isolatedModule('server/travel-radar-service.js', {
    './payment-request.js': paymentRequestModule,
    './payment-journal.js': paymentJournalModule,
    './admin-store.js': {
      getStoreStatus: async () => ({ persistent }),
      getState: async (name, fallback) => structuredClone(name === key ? state : fallback),
      setState: async () => { throw new Error('Unexpected setState'); },
      updateState: async (name, _fallback, updater) => {
        assert.equal(name, key);
        if (updateHook) await updateHook();
        state = structuredClone(updater(structuredClone(state)));
        return { value: structuredClone(state), persistent };
      },
    },
    '../scripts/fetch-tours.js': { fetchAllChannels() { throw new Error('Unexpected feed request'); } },
    '../scripts/parse-deals.js': { buildDeals: () => [], loadRefPrices: () => [] },
    '../scripts/travel-affiliate-links.js': { monetizeDeals: value => value },
    'node:fs/promises': { readFile: async () => '{"deals": []}' },
  }, {
    env: { YOOKASSA_SHOP_ID: '1442213', YOOKASSA_SECRET_KEY: 'test-only-placeholder' },
    globals: {
      Date: FixtureDate,
      console: { log() {}, error() {} },
      fetch: async (url, options) => {
        calls.push({ url, method: options.method, body: options.body && JSON.parse(options.body),
          bodyJson: options.body, idempotenceKey: options.headers?.['Idempotence-Key'] });
        // Telegram notifications are stubbed; no messages leave the process.
        if (url.startsWith('https://api.telegram.org/')) return response({ ok: true, result: {} });
        assert.ok(url.startsWith('https://api.yookassa.ru/v3/'));
        return network(url, options);
      },
      ...globals,
    },
  });
  let api = await loadApi();
  return {
    get api() { return api; }, calls, read: () => structuredClone(state),
    restart: async () => { api = await loadApi(); },
    anotherInstance: loadApi,
    advance: ms => { timestamp += ms; },
    setPersistent: value => { persistent = value; },
    change: fn => { state = fn(structuredClone(state)); },
    network: fn => { network = fn; },
    beforeUpdate: fn => { updateHook = fn; },
  };
}

test('durable request accepts an early success before POST returns and activates exactly once', async () => {
  const f = await fixture();
  let metadata;
  f.network(async (_url, options) => {
    if (options.method === 'POST') {
      metadata = JSON.parse(options.body).metadata;
      assert.equal(f.read()[0].paymentRequest.state, 'submitting');
      assert.equal(f.read()[0].pendingPaymentId, null);
      assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
      assert.equal(f.read()[0].status, 'active');
      return response(payment({ metadata, status: 'pending', confirmation: { confirmation_url: 'https://checkout.example.invalid/' } }));
    }
    return response(payment({ metadata }));
  });
  await f.api.createTravelCheckout(token, 'sbp');
  assert.equal(f.read()[0].pendingPaymentId, null);
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  const activated = f.read()[0];
  assert.equal(activated.status, 'active');
  assert.equal(activated.pendingPaymentId, null);
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  assert.deepEqual(f.read()[0], activated);
});

test('early cancellation requests redelivery and increments the attempt only once', async () => {
  const f = await fixture();
  f.network(async () => response(payment({ status: 'canceled' })));
  assert.equal((await f.api.handleYookassaWebhook(event('canceled'))).accepted, false);
  f.change(items => items.map(item => ({ ...item, pendingPaymentId: 'fixture-payment' })));
  assert.equal((await f.api.handleYookassaWebhook(event('canceled'))).accepted, true);
  assert.equal(f.read()[0].paymentAttempt, 2);
  assert.equal((await f.api.handleYookassaWebhook(event('canceled'))).accepted, true);
  assert.equal(f.read()[0].paymentAttempt, 2);
});

test('reconciliation recovers a missing webhook using GET without a new charge', async () => {
  const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment' })]);
  f.network(async () => response(payment()));
  await f.api.reconcileTravelPayments();
  assert.equal(f.read()[0].status, 'active');
  const providerCalls = f.calls.filter(call => call.url.includes('api.yookassa.ru'));
  assert.equal(providerCalls.length, 1);
  assert.ok(providerCalls.every(call => call.method === 'GET'));
});

test('reconciliation still requires matching ID, customer, currency and amount', async () => {
  for (const invalid of [
    payment({ id: 'different-id' }), payment({ merchant_customer_id: 'another-customer' }),
    payment({ amount: { value: '1.00', currency: 'RUB' } }),
    payment({ amount: { value: '300.00', currency: 'USD' } }),
  ]) {
    const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment' })]);
    f.network(async () => response(invalid));
    await f.api.reconcileTravelPayments();
    assert.equal(f.read()[0].status, 'awaiting_payment');
    assert.deepEqual(f.read()[0].appliedPaymentIds, []);
  }
});

test('webhook fields never override the authenticated provider response', async () => {
  const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment' })]);
  f.network(async () => response(payment({ status: 'pending' })));
  const input = { ...event(), object: payment() };
  assert.equal((await f.api.handleYookassaWebhook(input)).accepted, false);
  assert.equal(f.read()[0].status, 'awaiting_payment');
});

test('database failure prevents acknowledgement and leaves payment recoverable', async () => {
  const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment' })]);
  f.network(async () => response(payment()));
  f.beforeUpdate(() => { throw new Error('fixture database unavailable'); });
  await assert.rejects(f.api.handleYookassaWebhook(event()), /database unavailable/);
  assert.equal(f.read()[0].pendingPaymentId, 'fixture-payment');
  f.beforeUpdate(null);
  await f.api.reconcileTravelPayments();
  assert.equal(f.read()[0].status, 'active');
});

test('a provider failure does not block other payments or the next reconciliation', async () => {
  const f = await fixture([
    subscription({ pendingPaymentId: 'failed-payment' }),
    subscription({ id: 'second-subscription', pendingPaymentId: 'second-payment' }),
  ]);
  f.network(async url => {
    if (url.endsWith('/failed-payment')) throw new Error('fixture outage');
    return response(payment({ id: 'second-payment', merchant_customer_id: 'second-subscription',
      metadata: { subscription_id: 'second-subscription', payment_kind: 'initial' } }));
  });
  await f.api.reconcileTravelPayments();
  assert.equal(f.read()[1].status, 'active');
  f.network(async () => response(payment({ id: 'failed-payment' })));
  await f.api.reconcileTravelPayments();
  assert.equal(f.read()[0].status, 'active');
});

test('reconciliation batches rotate beyond the first twelve pending payments', async () => {
  const f = await fixture(Array.from({ length: 14 }, (_, i) => subscription({ pendingPaymentId: `p-${i}` })));
  f.network(async url => response(payment({ id: url.split('/').pop(), status: 'pending' })));
  await f.api.reconcileTravelPayments();
  assert.equal(f.calls.length, 12);
  await f.api.reconcileTravelPayments();
  assert.equal(new Set(f.calls.map(call => call.url)).size, 14);
  assert.equal(f.calls.length, 24);
});

test('pending-payment preparation preserves concurrent user settings and cancellation processing', async () => {
  const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment', pendingPaymentMethod: 'recurring' })]);
  let firstGet = true;
  f.network(async (_url, options) => {
    if (options.method === 'GET' && firstGet) {
      firstGet = false;
      f.change(items => items.map(item => ({ ...item, autoRenew: false, filters: { origin: 'updated' } })));
      await f.api.handleYookassaWebhook(event('canceled'));
      return response(payment({ status: 'canceled' }));
    }
    if (options.method === 'POST') return response(payment({ id: 'new-payment', status: 'pending', metadata: JSON.parse(options.body).metadata,
      confirmation: { confirmation_url: 'https://checkout.example.invalid/' } }));
    return response(payment({ status: 'canceled' }));
  });
  await f.api.createTravelCheckout(token, 'sbp');
  const current = f.read()[0];
  assert.equal(current.autoRenew, false);
  assert.equal(current.filters.origin, 'updated');
  assert.equal(current.paymentAttempt, 2);
  assert.equal(current.pendingPaymentId, 'new-payment');
});

test('waiting_for_capture is preserved instead of creating another payment', async () => {
  const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment' })]);
  f.network(async () => response(payment({ status: 'waiting_for_capture' })));
  await assert.rejects(f.api.createTravelCheckout(token), /PAYMENT_IN_PROGRESS/);
  assert.equal(f.calls.length, 1);
  assert.equal(f.read()[0].pendingPaymentId, 'fixture-payment');
});

test('late renewal response cannot restore a pending ID after webhook activation', async () => {
  const periodEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const f = await fixture([subscription({ status: 'active', currentPeriodEnd: periodEnd, paymentMethodId: 'saved-fixture' })]);
  let metadata;
  f.network(async (_url, options) => {
    if (options.method === 'POST') {
      metadata = JSON.parse(options.body).metadata;
      // Another response/reconciler has already attached the same idempotent payment.
      f.change(items => items.map(item => ({ ...item, pendingPaymentId: 'fixture-payment' })));
      await f.api.handleYookassaWebhook(event());
      return response(payment({ status: 'pending', metadata }));
    }
    return response(payment({ metadata }));
  });
  await f.api.renewSubscriptions();
  assert.equal(f.read()[0].pendingPaymentId, null);
  assert.ok(Date.parse(f.read()[0].currentPeriodEnd) > Date.parse(periodEnd));
  assert.deepEqual(f.read()[0].appliedPaymentIds, ['fixture-payment']);
});

test('provider deadline includes a JSON body that stalls after response headers', async () => {
  const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment' })], {
    setTimeout: (fn, ms) => setTimeout(fn, ms === 12_000 ? 30 : ms),
  });
  f.network(async (_url, options) => ({
    ok: true, status: 200,
    json: () => new Promise((_resolve, reject) => options.signal.addEventListener('abort',
      () => reject(Object.assign(new Error('fixture abort'), { name: 'AbortError' })), { once: true })),
  }));
  await assert.rejects(f.api.handleYookassaWebhook(event()), { code: 'PAYMENT_PROVIDER_ERROR' });
  assert.equal(f.read()[0].status, 'awaiting_payment');
});

test('failed durable preparation never sends a payment creation request', async () => {
  const f = await fixture();
  f.beforeUpdate(() => { throw new Error('fixture commit failure'); });
  await assert.rejects(f.api.createTravelCheckout(token), /commit failure/);
  assert.equal(f.calls.length, 0);
  assert.equal(f.read()[0].paymentRequest, undefined);
});

test('nonpersistent storage never creates payments', async () => {
  const f = await fixture();
  f.setPersistent(false);
  await assert.rejects(f.api.createTravelCheckout(token), /STORAGE_UNAVAILABLE/);
  assert.equal(f.calls.length, 0);
});

test('restart after preparation but before submit resumes the committed request', async () => {
  const f = await fixture();
  let writes = 0;
  f.beforeUpdate(() => { if (++writes === 2) throw new Error('fixture crash before send'); });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'), /crash before send/);
  assert.equal(f.calls.length, 0);
  const request = f.read()[0].paymentRequest;
  assert.equal(request.state, 'prepared');
  f.beforeUpdate(null);
  f.network(async (_url, options) => response(payment({ metadata: JSON.parse(options.body).metadata })));
  await f.restart();
  await f.api.reconcileTravelPayments();
  assert.equal(f.read()[0].status, 'active');
  assert.equal(f.calls[0].idempotenceKey, request.idempotenceKey);
  assert.equal(f.calls[0].bodyJson, request.bodyJson);
});

test('restart after provider creation but before ID commit recovers one charge with the same bytes and key', async () => {
  const f = await fixture();
  const providerPayments = new Map();
  let writesFail = false;
  f.beforeUpdate(() => { if (writesFail) throw new Error('fixture database outage'); });
  f.network(async (_url, options) => {
    const key = options.headers['Idempotence-Key'];
    if (!providerPayments.has(key)) {
      providerPayments.set(key, payment({ metadata: JSON.parse(options.body).metadata }));
      writesFail = true;
    }
    return response(providerPayments.get(key));
  });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'), /database outage/);
  assert.equal(f.read()[0].pendingPaymentId, null);
  assert.equal(f.read()[0].paymentRequest.state, 'submitting');
  writesFail = false;
  await f.restart();
  f.advance(paymentRequestModule.PAYMENT_LEASE_MS + 1);
  await f.api.reconcileTravelPayments();
  assert.equal(providerPayments.size, 1);
  assert.equal(f.read()[0].status, 'active');
  const posts = f.calls.filter(call => call.method === 'POST' && call.url.includes('yookassa'));
  assert.equal(posts.length, 2);
  assert.equal(posts[1].bodyJson, posts[0].bodyJson);
  assert.equal(posts[1].idempotenceKey, posts[0].idempotenceKey);
});

test('unknown request keeps its original receipt after a settings change', async () => {
  const f = await fixture();
  f.network(async () => { throw new Error('fixture lost response'); });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'), /lost response/);
  const first = f.calls[0];
  f.change(items => items.map(item => ({ ...item, email: 'changed@example.invalid', filters: { value: 'updated' } })));
  f.advance(paymentRequestModule.PAYMENT_RETRY_MS + 1);
  f.network(async (_url, options) => response(payment({ metadata: JSON.parse(options.body).metadata })));
  await f.api.reconcileTravelPayments();
  assert.equal(f.calls[1].bodyJson, first.bodyJson);
  assert.equal(f.calls[1].idempotenceKey, first.idempotenceKey);
  assert.equal(f.read()[0].email, 'changed@example.invalid');
  assert.equal(f.read()[0].filters.value, 'updated');
});

test('two server instances share a lease; another tab cannot change a live request method', async () => {
  const f = await fixture();
  const second = await f.anotherInstance();
  let enter;
  const entered = new Promise(resolve => { enter = resolve; });
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  f.network(async (_url, options) => {
    enter();
    await blocked;
    return response(payment({ metadata: JSON.parse(options.body).metadata }));
  });
  const first = f.api.createTravelCheckout(token, 'sbp');
  await entered;
  await assert.rejects(second.createTravelCheckout(token, 'sbp'), /PAYMENT_IN_PROGRESS/);
  await assert.rejects(second.createTravelCheckout(token, 'recurring'), /PAYMENT_IN_PROGRESS/);
  assert.equal(f.calls.length, 1);
  release();
  await first;
  assert.equal(f.read()[0].paymentRequest.attempts, 1);
});

test('expired unknown request blocks POST and new checkout, but a late verified webhook resolves it', async () => {
  const f = await fixture();
  f.network(async () => { throw new Error('fixture lost response'); });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'));
  const original = f.calls[0];
  f.advance(paymentRequestModule.PAYMENT_REPLAY_MS);
  await f.restart();
  await f.api.reconcileTravelPayments();
  assert.equal(f.calls.length, 1);
  assert.equal(f.read()[0].paymentRequest.state, 'manual_review');
  assert.equal(f.read()[0].paymentReviewRequired, true);
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'), /PAYMENT_REVIEW_REQUIRED/);
  f.network(async () => response(payment({ metadata: original.body.metadata })));
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  assert.equal(f.read()[0].status, 'active');
  assert.equal(f.read()[0].paymentReviewRequired, false);
  assert.equal(f.calls.filter(call => call.method === 'POST' && call.url.includes('yookassa')).length, 1);
});

test('expired unsent request is abandoned and remains safe to replace on explicit checkout', async () => {
  const f = await fixture();
  let writes = 0;
  f.beforeUpdate(() => { if (++writes === 2) throw new Error('fixture crash'); });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'));
  const previous = f.read()[0].paymentRequest;
  f.beforeUpdate(null);
  f.advance(paymentRequestModule.PAYMENT_REPLAY_MS + 1);
  await f.api.reconcileTravelPayments();
  assert.equal(f.calls.length, 0);
  assert.equal(f.read()[0].paymentRequest.state, 'abandoned');
  f.network(async (_url, options) => response(payment({ metadata: JSON.parse(options.body).metadata })));
  await f.api.createTravelCheckout(token, 'sbp');
  assert.notEqual(f.read()[0].paymentRequest.id, previous.id);
  assert.equal(f.read()[0].paymentRequestHistory[0].state, 'abandoned');
});

test('late cancellation resolves the durable nonce before POST returns and stays canceled', async () => {
  const f = await fixture();
  let metadata;
  f.network(async (_url, options) => {
    if (options.method === 'POST') {
      metadata = JSON.parse(options.body).metadata;
      assert.equal((await f.api.handleYookassaWebhook(event('canceled'))).accepted, true);
      return response(payment({ metadata, status: 'pending' }));
    }
    return response(payment({ metadata, status: 'canceled' }));
  });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'), /PAYMENT_ATTEMPT_EXPIRED/);
  assert.equal(f.read()[0].paymentRequest.state, 'canceled');
  assert.equal(f.read()[0].pendingPaymentId, null);
  assert.equal(f.read()[0].paymentAttempt, 2);
});

test('canceled renewal cannot create another charge for the same billing period after 24 hours', async () => {
  const f = await fixture([subscription({ status: 'active', autoRenew: true, paymentMethodId: 'saved-fixture',
    currentPeriodEnd: new Date(Date.now() + 3600_000).toISOString() })]);
  f.network(async (_url, options) => response(payment({ metadata: JSON.parse(options.body).metadata, status: 'canceled' })));
  await f.api.renewSubscriptions();
  assert.equal(f.read()[0].paymentRequest.state, 'canceled');
  f.advance(25 * 3600_000);
  await f.restart();
  await f.api.reconcileTravelPayments();
  await f.api.renewSubscriptions();
  assert.equal(f.calls.length, 1);
  assert.equal(f.read()[0].status, 'past_due');
});

test('canceling an unknown renewal stops automatic POST retries and keeps auto-renew off after a late success', async () => {
  const f = await fixture([subscription({ status: 'active', autoRenew: true, paymentMethodId: 'saved-fixture',
    currentPeriodEnd: new Date(Date.now() + 3600_000).toISOString() })]);
  f.network(async () => { throw new Error('fixture lost response'); });
  await f.api.renewSubscriptions();
  const original = f.calls[0];
  await f.api.cancelTravelSubscription(token);
  f.advance(paymentRequestModule.PAYMENT_RETRY_MS + 1);
  await f.api.reconcileTravelPayments();
  assert.equal(f.calls.length, 1);
  assert.equal(f.read()[0].paymentReviewRequired, true);
  f.network(async () => response(payment({ metadata: original.body.metadata,
    payment_method: { id: 'saved-fixture', saved: true } })));
  await f.api.handleYookassaWebhook(event());
  assert.equal(f.read()[0].autoRenew, false);
  assert.equal(f.read()[0].status, 'active');
});

test('admin revocation retains the journal and a late payment cannot reactivate access', async () => {
  const f = await fixture();
  f.network(async () => { throw new Error('fixture lost response'); });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'));
  const original = f.calls[0];
  await f.api.disableTravelAdminSubscription('fixture-subscription');
  assert.equal(f.read()[0].paymentRequest.state, 'manual_review');
  f.network(async () => response(payment({ metadata: original.body.metadata })));
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  assert.equal(f.read()[0].status, 'canceled');
  assert.equal(f.read()[0].paymentRequest.observedStatus, 'succeeded');
  assert.equal(f.read()[0].paymentReviewRequired, true);
  await assert.rejects(f.api.deleteTravelAdminSubscription('fixture-subscription'), /PAYMENT_IN_PROGRESS/);
});

test('a forged request nonce cannot attach an unknown payment', async () => {
  const f = await fixture();
  f.network(async () => { throw new Error('fixture lost response'); });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'));
  f.network(async () => response(payment({ metadata: { ...f.calls[0].body.metadata, payment_request_id: 'wrong-nonce' } })));
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, false);
  assert.equal(f.read()[0].pendingPaymentId, null);
  assert.equal(f.read()[0].status, 'awaiting_payment');
});

test('legacy admin revocation keeps its pending ID for a late terminal event and blocks checkout', async () => {
  const f = await fixture([subscription({ paymentJournalVersion: undefined, pendingPaymentId: 'fixture-payment' })]);
  await f.api.disableTravelAdminSubscription('fixture-subscription');
  assert.equal(f.read()[0].pendingPaymentId, 'fixture-payment');
  await assert.rejects(f.api.createTravelCheckout(token), /PAYMENT_REVIEW_REQUIRED/);
  assert.equal(f.calls.length, 0);
  f.network(async () => response(payment()));
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  assert.equal(f.read()[0].status, 'canceled');
  assert.equal(f.read()[0].pendingPaymentId, null);
  assert.equal(f.read()[0].legacyPaymentOverride.observedStatus, 'succeeded');
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  await assert.rejects(f.api.deleteTravelAdminSubscription('fixture-subscription'), /PAYMENT_IN_PROGRESS/);
});

test('definite provider rejection requires review and never gets automatic POST retries', async () => {
  const f = await fixture();
  f.network(async () => ({ ok: false, status: 403, json: async () => ({ code: 'forbidden' }) }));
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'));
  assert.equal(f.read()[0].paymentRequest.state, 'manual_review');
  assert.equal(f.read()[0].paymentRequest.reviewReason, 'provider_403');
  f.advance(3600_000);
  await f.restart();
  await f.api.reconcileTravelPayments();
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'), /PAYMENT_REVIEW_REQUIRED/);
  assert.equal(f.calls.length, 1);
});

test('legacy unknown initial and renewal attempts require review instead of guessing a new key', async () => {
  const initial = await fixture([subscription({ paymentJournalVersion: undefined })]);
  await assert.rejects(initial.api.createTravelCheckout(token), /PAYMENT_REVIEW_REQUIRED/);
  assert.equal(initial.calls.length, 0);
  const renewal = await fixture([subscription({ paymentJournalVersion: undefined, status: 'active',
    autoRenew: true, paymentMethodId: 'saved-fixture', renewalStartedAt: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 3600_000).toISOString() })]);
  await renewal.api.renewSubscriptions();
  assert.equal(renewal.calls.length, 0);
  assert.equal(renewal.read()[0].paymentReviewRequired, true);
});

test('provider may omit the optional merchant customer field; durable nonce still binds the result', async () => {
  const f = await fixture();
  f.network(async (_url, options) => response(payment({ merchant_customer_id: undefined,
    metadata: JSON.parse(options.body).metadata, status: 'pending',
    confirmation: { confirmation_url: 'https://checkout.example.invalid/' } })));
  const checkout = await f.api.createTravelCheckout(token, 'sbp');
  assert.equal(checkout.confirmationUrl, 'https://checkout.example.invalid/');
  f.network(async () => response(payment({ merchant_customer_id: undefined, metadata: f.calls[0].body.metadata })));
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  assert.equal(f.read()[0].status, 'active');
  assert.equal(f.read()[0].autoRenew, false);
});

test('legacy known payment without optional customer requires exact pending ID and subscription metadata', async () => {
  const f = await fixture([subscription({ pendingPaymentId: 'fixture-payment' })]);
  f.network(async () => response(payment({ merchant_customer_id: undefined })));
  assert.equal((await f.api.handleYookassaWebhook(event())).accepted, true);
  assert.equal(f.read()[0].status, 'active');
  const unknown = await fixture();
  unknown.network(async () => response(payment({ merchant_customer_id: undefined })));
  assert.equal((await unknown.api.handleYookassaWebhook(event())).accepted, false);
  assert.equal(unknown.read()[0].status, 'awaiting_payment');
});

test('public status and admin summaries exclude the frozen receipt and idempotence key', async () => {
  const f = await fixture();
  f.network(async () => { throw new Error('fixture lost response'); });
  await assert.rejects(f.api.createTravelCheckout(token, 'sbp'));
  const publicStatus = await f.api.getTravelSubscription(token);
  assert.equal(publicStatus.paymentRequest, undefined);
  const dashboard = await f.api.getTravelAdminDashboard();
  assert.equal(dashboard.subscriptions[0].paymentRequest.bodyJson, undefined);
  assert.equal(dashboard.subscriptions[0].paymentRequest.idempotenceKey, undefined);
  assert.equal(dashboard.subscriptions[0].paymentRequest.state, 'unknown');
});
