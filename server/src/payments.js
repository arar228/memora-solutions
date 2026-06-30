// ЮKassa integration (TZ §5). Falls back to a MOCK provider when no keys are
// configured, so the whole request→quote→pay→booking flow is demoable locally
// without a real merchant account. Set YOOKASSA_SHOP_ID + YOOKASSA_SECRET_KEY
// (test shop) in .env to use the real sandbox.

const SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const SECRET = process.env.YOOKASSA_SECRET_KEY || '';
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:4000';
const RETURN_URL = process.env.PAYMENT_RETURN_URL || 'http://localhost:5173/travel-radar-v2';

// Mock payments are a LOCAL-DEV affordance only. They must never be active in
// production (where the unauthenticated mock-pay page could mark payments paid).
// Requires missing keys AND (non-production OR an explicit opt-in flag).
const ALLOW_MOCK = process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PAYMENTS === 'true';
export const MOCK_MODE = (!SHOP_ID || !SECRET) && ALLOW_MOCK;

// Create a payment. Returns { externalId, confirmationUrl, raw }.
export async function createPayment({ amountRub, description, idempotenceKey, metadata }) {
  if (MOCK_MODE) {
    const externalId = 'mock_' + Math.random().toString(36).slice(2, 12);
    // The mock confirmation page is served by this backend and immediately
    // lets you simulate "succeeded" (see routes/payments mock-pay).
    return {
      externalId,
      confirmationUrl: `${PUBLIC_URL}/api/payments/mock/${externalId}/pay`,
      raw: { mock: true },
    };
  }

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
      Authorization: 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: { value: Number(amountRub).toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: RETURN_URL },
      description: description?.slice(0, 128),
      metadata,
      // SBP + cards are enabled per the shop's settings; no payment_method_data
      // forces ЮKassa's hosted choice (card Мир / СБП / etc.).
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`yookassa create failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { externalId: data.id, confirmationUrl: data.confirmation?.confirmation_url, raw: data };
}

// Re-fetch a payment's status from ЮKassa (the robust, signature-free way to
// trust a webhook notification — never trust the webhook body alone).
export async function getPaymentStatus(externalId) {
  if (MOCK_MODE) return null; // mock status is driven by the mock-pay endpoint
  const res = await fetch(`https://api.yookassa.ru/v3/payments/${externalId}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${SHOP_ID}:${SECRET}`).toString('base64') },
  });
  if (!res.ok) throw new Error(`yookassa status failed: ${res.status}`);
  const data = await res.json();
  return data.status; // pending | waiting_for_capture | succeeded | canceled
}
