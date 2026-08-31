import assert from 'node:assert/strict';

process.env.YOOKASSA_SHOP_ID = '1442213';
process.env.YOOKASSA_EXPECTED_SHOP_ID = '1442213';
process.env.YOOKASSA_SECRET_KEY = 'test-secret';

const {
  buildInitialPaymentBody,
  isVerifiedPaymentForSubscription,
  renewalStateForPayment,
  travelCapabilities,
} = await import('../server/travel-radar-service.js');

assert.equal(travelCapabilities().payments, true, 'expected YooKassa shop must be enabled');

const subscription = {
  id: 'subscription-1',
  email: 'buyer@example.com',
  pendingPaymentId: 'payment-1',
  appliedPaymentIds: [],
};

const recurringPayment = buildInitialPaymentBody(subscription, 'recurring');
assert.equal(recurringPayment.save_payment_method, true);
assert.equal(recurringPayment.payment_method_data, undefined);
assert.equal(recurringPayment.metadata.payment_mode, 'recurring');

const sbpPayment = buildInitialPaymentBody(subscription, 'sbp');
assert.deepEqual(sbpPayment.payment_method_data, { type: 'sbp' });
assert.equal(sbpPayment.save_payment_method, undefined);
assert.equal(sbpPayment.metadata.payment_mode, 'one_time');
assert.throws(() => buildInitialPaymentBody(subscription, 'cash'), /INVALID_PAYMENT_METHOD/);
assert.deepEqual(renewalStateForPayment({
  metadata: { payment_mode: 'one_time' },
  payment_method: { id: 'sbp-account', saved: true },
}, { autoRenew: true }), { autoRenew: false, paymentMethodId: null });
assert.deepEqual(renewalStateForPayment({
  metadata: { payment_mode: 'recurring' },
  payment_method: { id: 'saved-card', saved: true },
}, { autoRenew: true }), { autoRenew: true, paymentMethodId: 'saved-card' });
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
