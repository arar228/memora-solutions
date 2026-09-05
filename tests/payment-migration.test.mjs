import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyPaymentReview } from '../server/payment-journal-migration.js';

const subscription = { id: 'fixture-subscription', pendingPaymentId: null, renewalStartedAt: null };
const canceled = { id: 'fixture-payment', status: 'canceled', merchant_customer_id: subscription.id,
  metadata: { subscription_id: subscription.id, payment_kind: 'initial' }, amount: { value: '300.00', currency: 'RUB' } };

test('completed history with zero or canceled initial payments permits a legacy migration', () => {
  assert.equal(legacyPaymentReview(subscription, []).eligible, true);
  assert.deepEqual(legacyPaymentReview(subscription, [canceled]), { eligible: true, canceledIds: [canceled.id] });
  assert.deepEqual(legacyPaymentReview(subscription, [{ ...canceled, merchant_customer_id: undefined }]),
    { eligible: true, canceledIds: [canceled.id] });
});

test('pending, successful, recurring and mismatched legacy payments require manual review', () => {
  for (const payment of [
    { ...canceled, status: 'pending' }, { ...canceled, status: 'succeeded' },
    { ...canceled, metadata: { ...canceled.metadata, payment_kind: 'renewal' } },
    { ...canceled, merchant_customer_id: 'different-customer' },
    { ...canceled, id: undefined },
    { ...canceled, amount: { value: '1.00', currency: 'RUB' } },
  ]) assert.equal(legacyPaymentReview(subscription, [payment]).eligible, false);
});

test('migration preserves existing journal, pending ID, renewal marker and admin overrides', () => {
  for (const changed of [{ paymentJournalVersion: 1 }, { paymentRequest: {} }, { pendingPaymentId: 'known' },
    { renewalStartedAt: '2026-09-05T00:00:00Z' }, { legacyPaymentOverride: {} }]) {
    assert.equal(legacyPaymentReview({ ...subscription, ...changed }, []).eligible, false);
  }
});
