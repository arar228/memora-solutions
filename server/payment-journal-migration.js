// Used only by the explicit operator migration, after a complete provider scan.
export function legacyPaymentReview(item, providerPayments) {
  if (item.paymentJournalVersion === 1 || item.paymentRequest || item.pendingPaymentId
    || item.renewalStartedAt || item.legacyPaymentOverride) return { eligible: false, reason: 'existing_payment_state' };
  const matches = providerPayments.filter(payment => payment.metadata?.subscription_id === item.id
    || payment.merchant_customer_id === item.id);
  if (matches.some(payment => payment.status !== 'canceled'
    || payment.metadata?.subscription_id !== item.id || payment.merchant_customer_id !== item.id
    || payment.metadata?.payment_kind !== 'initial'
    || payment.amount?.currency !== 'RUB' || Number(payment.amount?.value) !== 300)) {
    return { eligible: false, reason: 'provider_review_required' };
  }
  return { eligible: true, canceledIds: matches.map(payment => payment.id) };
}
