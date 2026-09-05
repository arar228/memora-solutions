import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isolatedModule } from './helpers/isolated.mjs';

const key = 'travel_radar_subscriptions_v1';
const token = 'fixture-checkout-token';
const subscription = (extra = {}) => ({
  id: 'fixture-subscription', tokenHash: createHash('sha256').update(token).digest('hex'),
  email: 'fixture@example.invalid', telegramChatId: 123, status: 'awaiting_payment',
  autoRenew: true, paymentAttempt: 1, pendingPaymentId: null, pendingPaymentMethod: null,
  appliedPaymentIds: [], currentPeriodEnd: null, renewalStartedAt: null, ...extra,
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
  const calls = [];
  const api = await isolatedModule('server/travel-radar-service.js', {
    './admin-store.js': {
      getStoreStatus: async () => ({ persistent: true }),
      getState: async (name, fallback) => structuredClone(name === key ? state : fallback),
      setState: async () => { throw new Error('Unexpected setState'); },
      updateState: async (name, _fallback, updater) => {
        assert.equal(name, key);
        if (updateHook) await updateHook();
        state = structuredClone(updater(structuredClone(state)));
        return { value: structuredClone(state), persistent: true };
      },
    },
    '../scripts/fetch-tours.js': { fetchAllChannels() { throw new Error('Unexpected feed request'); } },
    '../scripts/parse-deals.js': { buildDeals: () => [], loadRefPrices: () => [] },
    '../scripts/travel-affiliate-links.js': { monetizeDeals: value => value },
    'node:fs/promises': { readFile: async () => '{"deals": []}' },
  }, {
    env: { YOOKASSA_SHOP_ID: '1442213', YOOKASSA_SECRET_KEY: 'test-only-placeholder' },
    globals: {
      console: { log() {}, error() {} },
      fetch: async (url, options) => {
        calls.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
        // Telegram notifications are stubbed; no messages leave the process.
        if (url.startsWith('https://api.telegram.org/')) return response({ ok: true, result: {} });
        assert.ok(url.startsWith('https://api.yookassa.ru/v3/'));
        return network(url, options);
      },
      ...globals,
    },
  });
  return {
    api, calls, read: () => structuredClone(state),
    change: fn => { state = fn(structuredClone(state)); },
    network: fn => { network = fn; },
    beforeUpdate: fn => { updateHook = fn; },
  };
}

test('early success requests redelivery, then activates exactly once after checkout saves the ID', async () => {
  const f = await fixture();
  f.network(async (_url, options) => {
    if (options.method === 'POST') {
      assert.equal((await f.api.handleYookassaWebhook(event())).accepted, false);
      assert.equal(f.read()[0].status, 'awaiting_payment');
      return response(payment({ status: 'pending', confirmation: { confirmation_url: 'https://checkout.example.invalid/' } }));
    }
    return response(payment());
  });
  await f.api.createTravelCheckout(token, 'sbp');
  assert.equal(f.read()[0].pendingPaymentId, 'fixture-payment');
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
    if (options.method === 'POST') return response(payment({ id: 'new-payment', status: 'pending',
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
  f.network(async (_url, options) => {
    if (options.method === 'POST') {
      // Another response/reconciler has already attached the same idempotent payment.
      f.change(items => items.map(item => ({ ...item, pendingPaymentId: 'fixture-payment' })));
      await f.api.handleYookassaWebhook(event());
      return response(payment({ status: 'pending', metadata: { subscription_id: 'fixture-subscription', payment_kind: 'renewal' } }));
    }
    return response(payment({ metadata: { subscription_id: 'fixture-subscription', payment_kind: 'renewal' } }));
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
