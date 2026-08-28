import assert from 'node:assert/strict';

process.env.YOOKASSA_SHOP_ID = '1442213';
process.env.YOOKASSA_EXPECTED_SHOP_ID = '1442213';
process.env.YOOKASSA_SECRET_KEY = 'test-secret';

const {
  isVerifiedPaymentForSubscription,
  travelCapabilities,
} = await import('../server/travel-radar-service.js');

assert.equal(travelCapabilities().payments, true, 'expected YooKassa shop must be enabled');

const subscription = {
  id: 'subscription-1',
  pendingPaymentId: 'payment-1',
  appliedPaymentIds: [],
};
const payment = {
  id: 'payment-1',
  status: 'succeeded',
  amount: { value: '300.00', currency: 'RUB' },
  merchant_customer_id: 'subscription-1',
  metadata: { subscription_id: 'subscription-1', payment_kind: 'initial' },
};

assert.equal(isVerifiedPaymentForSubscription(payment, subscription), true);
assert.equal(isVerifiedPaymentForSubscription({ ...payment, status: 'pending' }, subscription), false);
assert.equal(isVerifiedPaymentForSubscription({ ...payment, amount: { value: '301.00', currency: 'RUB' } }, subscription), false);
assert.equal(isVerifiedPaymentForSubscription({ ...payment, merchant_customer_id: 'other' }, subscription), false);
assert.equal(isVerifiedPaymentForSubscription({ ...payment, id: 'other-payment' }, subscription), false);
assert.equal(isVerifiedPaymentForSubscription(payment, { ...subscription, appliedPaymentIds: ['payment-1'] }), false);

console.log('travel payments: verification checks passed');
