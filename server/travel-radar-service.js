import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getState, getStoreStatus, setState, updateState,
} from './admin-store.js';
import { fetchAllChannels } from '../scripts/fetch-tours.js';
import { buildDeals, loadRefPrices } from '../scripts/parse-deals.js';
import { monetizeDeals } from '../scripts/travel-affiliate-links.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FEED_KEY = 'travel_radar_feed_v1';
const SUBSCRIPTIONS_KEY = 'travel_radar_subscriptions_v1';
const PRICE_RUB = 300;
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_MS = 30 * 60 * 1000;
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://memorasolutions.ru').replace(/\/$/, '');
const TELEGRAM_TOKEN = process.env.RADAR_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_USERNAME = String(process.env.RADAR_TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
const TELEGRAM_WEBHOOK_SECRET = process.env.RADAR_TELEGRAM_WEBHOOK_SECRET || '';
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || '';
const YOOKASSA_EXPECTED_SHOP_ID = process.env.YOOKASSA_EXPECTED_SHOP_ID || '1442213';
const PROVIDER_TIMEOUT_MS = 12_000;

let refreshTimer;
let renewalTimer;
let refreshRunning = false;
let renewalRunning = false;

const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');
const secretMatches = (actual, expected) => {
  const actualBuffer = Buffer.from(String(actual || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
};
const paymentIdempotenceKey = (...parts) => createHash('sha256')
  .update(parts.map((part) => String(part || '')).join('|'))
  .digest('hex');
const dealKey = (deal) => createHash('sha256').update([
  deal.source, deal.link, deal.type, deal.from?.code, deal.to?.code, deal.price,
].join('|')).digest('hex').slice(0, 24);

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function cleanFilter(value) {
  if (!value || typeof value !== 'object') return { kind: 'all', value: '' };
  const kind = ['all', 'city', 'country'].includes(value.kind) ? value.kind : 'all';
  const cleanValue = String(value.value || '').trim().slice(0, 120);
  return kind === 'all' || !cleanValue ? { kind: 'all', value: '' } : { kind, value: cleanValue };
}

function sanitizeSubscription(subscription) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    status: subscription.status,
    telegramConnected: Boolean(subscription.telegramChatId),
    filters: subscription.filters,
    autoRenew: subscription.autoRenew,
    priceRub: PRICE_RUB,
    currentPeriodEnd: subscription.currentPeriodEnd || null,
    createdAt: subscription.createdAt,
    lastPaymentError: subscription.lastPaymentError || null,
  };
}

async function readStaticFeed() {
  try {
    return JSON.parse(await readFile(join(ROOT, 'public', 'hot-deals.json'), 'utf8'));
  } catch {
    return { updatedAt: '', deals: [], health: [] };
  }
}

async function readRawItems() {
  try {
    return JSON.parse(await readFile(join(ROOT, 'public', 'tours.json'), 'utf8')).items || [];
  } catch {
    return [];
  }
}

export function travelCapabilities() {
  const telegram = Boolean(TELEGRAM_TOKEN && TELEGRAM_USERNAME && TELEGRAM_WEBHOOK_SECRET);
  const payments = Boolean(
    YOOKASSA_SHOP_ID
      && YOOKASSA_SECRET_KEY
      && YOOKASSA_SHOP_ID === YOOKASSA_EXPECTED_SHOP_ID,
  );
  return {
    priceRub: PRICE_RUB,
    periodDays: 30,
    telegram,
    telegramUsername: telegram ? TELEGRAM_USERNAME : null,
    payments,
    subscriptionsAvailable: telegram && payments,
  };
}

export async function getTravelFeed() {
  return getState(FEED_KEY, await readStaticFeed());
}

export async function createTravelSubscription(input) {
  const storage = await getStoreStatus();
  if (!storage.persistent) throw new Error('STORAGE_UNAVAILABLE');
  if (!travelCapabilities().subscriptionsAvailable) throw new Error('SUBSCRIPTIONS_NOT_CONFIGURED');
  const email = cleanEmail(input.email);
  if (!email) throw new Error('INVALID_EMAIL');
  if (input.consent !== true) throw new Error('CONSENT_REQUIRED');
  if (input.privacyConsent !== true) throw new Error('PRIVACY_CONSENT_REQUIRED');

  const token = randomBytes(24).toString('base64url');
  const now = new Date().toISOString();
  const subscription = {
    id: randomUUID(),
    tokenHash: hashToken(token),
    email,
    telegramChatId: null,
    telegramUsername: null,
    status: 'awaiting_telegram',
    filters: {
      origin: cleanFilter(input.filters?.origin),
      destination: cleanFilter(input.filters?.destination),
      dealType: ['flight', 'tour'].includes(input.filters?.dealType) ? input.filters.dealType : 'all',
      maxPrice: Math.max(0, Math.min(2_000_000, Number(input.filters?.maxPrice) || 0)),
      minDiscount: Math.max(0, Math.min(90, Number(input.filters?.minDiscount) || 0)),
    },
    autoRenew: true,
    consentAt: now,
    privacyConsentAt: now,
    createdAt: now,
    updatedAt: now,
    currentPeriodEnd: null,
    paymentMethodId: null,
    pendingPaymentId: null,
    pendingPaymentMethod: null,
    paymentAttempt: 1,
    appliedPaymentIds: [],
    renewalStartedAt: null,
    notifiedDealIds: [],
  };
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => {
    subscriptions.push(subscription);
    return subscriptions.slice(-10_000);
  });
  return {
    token,
    subscription: sanitizeSubscription(subscription),
    telegramUrl: `https://t.me/${TELEGRAM_USERNAME}?start=radar_${token}`,
  };
}

async function findSubscription(token) {
  const tokenHash = hashToken(token);
  const subscriptions = await getState(SUBSCRIPTIONS_KEY, []);
  return subscriptions.find((item) => item.tokenHash === tokenHash) || null;
}

export async function getTravelSubscription(token) {
  return sanitizeSubscription(await findSubscription(token));
}

function paymentAuth() {
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')}`;
}

function assertPaymentConfiguration() {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) throw new Error('SUBSCRIPTIONS_NOT_CONFIGURED');
  if (YOOKASSA_SHOP_ID !== YOOKASSA_EXPECTED_SHOP_ID) throw new Error('PAYMENT_SHOP_MISMATCH');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Платёжный сервис превысил время ожидания');
      timeoutError.code = 'PAYMENT_PROVIDER_ERROR';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function yookassaRequest(path, { method = 'GET', body, idempotenceKey } = {}) {
  assertPaymentConfiguration();
  let response;
  try {
    response = await fetchWithTimeout(`https://api.yookassa.ru/v3${path}`, {
      method,
      headers: {
        Authorization: paymentAuth(),
        'Content-Type': 'application/json',
        ...(idempotenceKey ? { 'Idempotence-Key': idempotenceKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (!error.code) error.code = 'PAYMENT_PROVIDER_ERROR';
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.description || `YooKassa HTTP ${response.status}`);
    error.code = 'PAYMENT_PROVIDER_ERROR';
    const parameter = String(payload.parameter || '');
    if (payload.code === 'invalid_credentials' || response.status === 401) {
      error.publicMessage = 'YooKassa отклонила ключ магазина. Проверьте подключение магазина.';
    } else if (payload.code === 'forbidden' || response.status === 403) {
      error.publicMessage = 'YooKassa запретила создание платежа. Проверьте подключение платежей и автоплатежей в магазине.';
    } else if (parameter.startsWith('receipt')) {
      error.publicMessage = 'YooKassa отклонила параметры чека. Проверьте настройки онлайн-кассы.';
    } else if (['save_payment_method', 'merchant_customer_id'].includes(parameter)) {
      error.publicMessage = 'YooKassa отклонила настройку автоплатежа. Проверьте разрешение на сохранение банковских карт.';
    } else if (parameter.startsWith('payment_method_data')) {
      error.publicMessage = 'СБП ещё требуется подключить для магазина в YooKassa.';
    }
    console.error('YooKassa API request rejected', {
      status: response.status,
      code: payload.code || null,
      parameter: parameter || null,
      id: payload.id || null,
    });
    throw error;
  }
  return payload;
}

function receiptFor(subscription) {
  if (process.env.YOOKASSA_RECEIPTS_ENABLED === 'false') return {};
  const configuredVatCode = Number(process.env.YOOKASSA_VAT_CODE || 1);
  const vatCode = Number.isInteger(configuredVatCode) && configuredVatCode >= 1 && configuredVatCode <= 12
    ? configuredVatCode
    : 1;
  return {
    receipt: {
      customer: { email: subscription.email },
      items: [{
        description: 'Подписка на уведомления Радара путешествий, 30 дней',
        quantity: '1.00',
        amount: { value: `${PRICE_RUB}.00`, currency: 'RUB' },
        vat_code: vatCode,
        payment_subject: 'service',
        payment_mode: 'full_payment',
      }],
    },
  };
}

export function buildInitialPaymentBody(subscription, paymentMethod = 'recurring') {
  if (!['recurring', 'sbp'].includes(paymentMethod)) throw new Error('INVALID_PAYMENT_METHOD');
  const oneTime = paymentMethod === 'sbp';
  return {
    amount: { value: `${PRICE_RUB}.00`, currency: 'RUB' },
    capture: true,
    ...(oneTime
      ? { payment_method_data: { type: 'sbp' } }
      : { save_payment_method: true }),
    merchant_customer_id: subscription.id,
    confirmation: {
      type: 'redirect',
      return_url: `${PUBLIC_BASE_URL}/travel-radar?subscription=payment-return`,
    },
    description: 'Уведомления Радара путешествий — 30 дней',
    metadata: {
      subscription_id: subscription.id,
      payment_kind: 'initial',
      payment_mode: oneTime ? 'one_time' : 'recurring',
    },
    ...receiptFor(subscription),
  };
}

export function renewalStateForPayment(payment, subscription) {
  const oneTime = payment.metadata?.payment_mode === 'one_time';
  const saved = payment.payment_method?.saved === true;
  return {
    autoRenew: oneTime ? false : saved && Boolean(subscription.autoRenew),
    paymentMethodId: oneTime || !saved ? null : payment.payment_method.id,
  };
}

async function preparePaymentAttempt(subscription, paymentMethod) {
  if (!subscription.pendingPaymentId) return subscription;
  const pendingPayment = await yookassaRequest(`/payments/${encodeURIComponent(subscription.pendingPaymentId)}`);
  if (pendingPayment.status === 'succeeded') {
    await applyVerifiedPayment(pendingPayment);
    throw new Error('ALREADY_ACTIVE');
  }
  if (pendingPayment.status === 'pending' && subscription.pendingPaymentMethod === paymentMethod) {
    const confirmationUrl = String(pendingPayment.confirmation?.confirmation_url || '');
    if (confirmationUrl.startsWith('https://')) return { ...subscription, confirmationUrl };
  }
  if (pendingPayment.status === 'pending') {
    await yookassaRequest(`/payments/${encodeURIComponent(subscription.pendingPaymentId)}/cancel`, {
      method: 'POST',
      idempotenceKey: paymentIdempotenceKey(subscription.id, 'cancel', subscription.pendingPaymentId),
    });
  }
  const nextSubscription = {
    ...subscription,
    pendingPaymentId: null,
    pendingPaymentMethod: null,
    paymentAttempt: (subscription.paymentAttempt || 1) + 1,
    updatedAt: new Date().toISOString(),
  };
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => (
    item.id === subscription.id ? nextSubscription : item
  )));
  return nextSubscription;
}

export async function createTravelCheckout(token, paymentMethod = 'recurring') {
  if (!['recurring', 'sbp'].includes(paymentMethod)) throw new Error('INVALID_PAYMENT_METHOD');
  let subscription = await findSubscription(token);
  if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND');
  if (!subscription.telegramChatId) throw new Error('TELEGRAM_NOT_CONNECTED');
  if (subscription.status === 'active' && Date.parse(subscription.currentPeriodEnd) > Date.now()) {
    throw new Error('ALREADY_ACTIVE');
  }

  subscription = await preparePaymentAttempt(subscription, paymentMethod);
  if (subscription.confirmationUrl) return { confirmationUrl: subscription.confirmationUrl };

  const payment = await yookassaRequest('/payments', {
    method: 'POST',
    idempotenceKey: paymentIdempotenceKey(
      subscription.id,
      'initial',
      subscription.paymentAttempt || 1,
    ),
    body: buildInitialPaymentBody(subscription, paymentMethod),
  });
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => (
    item.id === subscription.id
      && !(item.appliedPaymentIds || []).includes(payment.id)
      ? {
        ...item,
        status: 'awaiting_payment',
        pendingPaymentId: payment.id,
        pendingPaymentMethod: paymentMethod,
        updatedAt: new Date().toISOString(),
      }
      : item
  )));
  if (payment.status === 'succeeded') await applyVerifiedPayment(payment);
  const confirmationUrl = String(payment.confirmation?.confirmation_url || '');
  if (payment.status !== 'succeeded' && !confirmationUrl.startsWith('https://')) {
    const error = new Error('Платёжный сервис не вернул защищённую ссылку оплаты');
    error.code = 'PAYMENT_PROVIDER_ERROR';
    throw error;
  }
  return { confirmationUrl: confirmationUrl || null };
}

async function applyVerifiedPayment(payment) {
  if (!payment?.id || payment.status !== 'succeeded') return false;
  if (payment.amount?.currency !== 'RUB' || Number(payment.amount?.value) !== PRICE_RUB) return false;
  const subscriptionId = String(payment.metadata?.subscription_id || '');
  const paymentKind = String(payment.metadata?.payment_kind || '');
  if (!subscriptionId || !['initial', 'renewal'].includes(paymentKind)) return false;
  if (String(payment.merchant_customer_id || '') !== subscriptionId) return false;

  const now = Date.now();
  let activatedSubscription = null;
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
    if (item.id !== subscriptionId) return item;
    if (!isVerifiedPaymentForSubscription(payment, item)) return item;
    const base = Math.max(now, Date.parse(item.currentPeriodEnd || '') || 0);
    const renewalState = renewalStateForPayment(payment, item);
    activatedSubscription = {
      ...item,
      status: 'active',
      ...renewalState,
      pendingPaymentId: null,
      pendingPaymentMethod: null,
      renewalStartedAt: null,
      lastPaymentError: null,
      appliedPaymentIds: [...(item.appliedPaymentIds || []), payment.id].slice(-60),
      currentPeriodEnd: new Date(base + PERIOD_MS).toISOString(),
      activatedAt: item.activatedAt || new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
    return activatedSubscription;
  }));
  if (activatedSubscription?.telegramChatId) {
    try {
      await sendSubscriptionSnapshot(activatedSubscription, {
        intro: '✅ Подписка активирована на 30 дней.',
      });
    } catch (error) {
      console.error('Travel Radar payment confirmation:', error.message);
    }
  }
  return Boolean(activatedSubscription);
}

export function isVerifiedPaymentForSubscription(payment, subscription) {
  if (!payment?.id || payment.status !== 'succeeded' || !subscription?.id) return false;
  if (payment.amount?.currency !== 'RUB' || Number(payment.amount?.value) !== PRICE_RUB) return false;
  if (String(payment.metadata?.subscription_id || '') !== subscription.id) return false;
  if (!['initial', 'renewal'].includes(String(payment.metadata?.payment_kind || ''))) return false;
  if (String(payment.merchant_customer_id || '') !== subscription.id) return false;
  if (subscription.pendingPaymentId !== payment.id) return false;
  return !(subscription.appliedPaymentIds || []).includes(payment.id);
}

export async function handleYookassaWebhook(input) {
  const paymentId = String(input?.object?.id || '');
  if (!paymentId || !['payment.succeeded', 'payment.canceled'].includes(input?.event)) {
    return { accepted: true };
  }
  const payment = await yookassaRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (input.event === 'payment.canceled' && payment.status === 'canceled') {
    const subscriptionId = String(payment.metadata?.subscription_id || '');
    if (!subscriptionId || String(payment.merchant_customer_id || '') !== subscriptionId) {
      return { accepted: false };
    }
    await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
      if (item.id !== subscriptionId || item.pendingPaymentId !== payment.id) return item;
      const expired = item.currentPeriodEnd && Date.parse(item.currentPeriodEnd) <= Date.now();
      const renewal = payment.metadata?.payment_kind === 'renewal';
      return {
        ...item,
        status: expired
          ? 'past_due'
          : renewal
            ? 'active'
            : item.telegramChatId ? 'awaiting_payment' : 'awaiting_telegram',
        pendingPaymentId: null,
        pendingPaymentMethod: null,
        paymentAttempt: renewal ? item.paymentAttempt : (item.paymentAttempt || 1) + 1,
        renewalStartedAt: null,
        lastPaymentError: payment.cancellation_details?.reason || 'payment_canceled',
        updatedAt: new Date().toISOString(),
      };
    }));
    return { accepted: true };
  }
  return { accepted: await applyVerifiedPayment(payment) };
}

export async function cancelTravelSubscription(token) {
  const tokenHash = hashToken(token);
  let found = false;
  let result = null;
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
    if (item.tokenHash !== tokenHash) return item;
    found = true;
    result = {
      ...item,
      autoRenew: false,
      paymentMethodId: null,
      renewalStartedAt: null,
      status: item.status === 'active' ? 'canceling' : 'canceled',
      updatedAt: new Date().toISOString(),
    };
    return result;
  }));
  if (!found) throw new Error('SUBSCRIPTION_NOT_FOUND');
  return sanitizeSubscription(result);
}

export async function updateTravelSubscription(token, input) {
  const tokenHash = hashToken(token);
  let result = null;
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
    if (item.tokenHash !== tokenHash) return item;
    result = {
      ...item,
      filters: {
        origin: cleanFilter(input.filters?.origin),
        destination: cleanFilter(input.filters?.destination),
        dealType: ['flight', 'tour'].includes(input.filters?.dealType) ? input.filters.dealType : 'all',
        maxPrice: Math.max(0, Math.min(2_000_000, Number(input.filters?.maxPrice) || 0)),
        minDiscount: Math.max(0, Math.min(90, Number(input.filters?.minDiscount) || 0)),
      },
      updatedAt: new Date().toISOString(),
    };
    return result;
  }));
  if (!result) throw new Error('SUBSCRIPTION_NOT_FOUND');
  if (result.status === 'active'
    && result.telegramChatId
    && Date.parse(result.currentPeriodEnd || '') > Date.now()) {
    try {
      await sendSubscriptionSnapshot(result, { intro: '✅ Настройки маршрута сохранены.' });
    } catch (error) {
      console.error('Travel Radar filter confirmation:', error.message);
    }
  }
  return sanitizeSubscription(result);
}

async function telegramRequest(method, body) {
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 10_000);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram HTTP ${response.status}`);
  return payload.result;
}

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function adminSubscriptionView(subscription) {
  return {
    id: subscription.id,
    email: subscription.email,
    telegramUsername: subscription.telegramUsername || null,
    telegramConnected: Boolean(subscription.telegramChatId),
    status: subscription.status,
    filters: subscription.filters,
    autoRenew: Boolean(subscription.autoRenew),
    manualAccess: Boolean(subscription.manualAccess),
    currentPeriodEnd: subscription.currentPeriodEnd || null,
    activatedAt: subscription.activatedAt || null,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    lastPaymentError: subscription.lastPaymentError || null,
  };
}

export async function getTravelAdminDashboard() {
  const subscriptions = await getState(SUBSCRIPTIONS_KEY, []);
  const users = subscriptions
    .map(adminSubscriptionView)
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  return {
    capabilities: travelCapabilities(),
    stats: {
      total: users.length,
      connected: users.filter((item) => item.telegramConnected).length,
      active: users.filter((item) => item.status === 'active'
        && Date.parse(item.currentPeriodEnd || '') > Date.now()).length,
      awaitingPayment: users.filter((item) => item.status === 'awaiting_payment').length,
    },
    subscriptions: users,
  };
}

function cleanAdminExpiration(input) {
  if (input.expiresAt) {
    const value = String(input.expiresAt).trim();
    const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) throw new Error('INVALID_EXPIRATION');
    return new Date(timestamp).toISOString();
  }
  const days = Math.max(1, Math.min(365, Math.round(Number(input.days) || 30)));
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function grantTravelAdminSubscription(id, input = {}) {
  const expiresAt = cleanAdminExpiration(input);
  const now = new Date().toISOString();
  let result = null;
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
    if (item.id !== id) return item;
    if (!item.telegramChatId) throw new Error('TELEGRAM_NOT_CONNECTED');
    result = {
      ...item,
      status: 'active',
      autoRenew: false,
      manualAccess: true,
      manualGrantedAt: now,
      activatedAt: now,
      currentPeriodEnd: expiresAt,
      pendingPaymentId: null,
      pendingPaymentMethod: null,
      renewalStartedAt: null,
      notifiedDealIds: [],
      lastPaymentError: null,
      updatedAt: now,
    };
    return result;
  }));
  if (!result) throw new Error('SUBSCRIPTION_NOT_FOUND');

  let messageSent = false;
  try {
    messageSent = await sendSubscriptionSnapshot(result, {
      intro: `✅ Тестовый доступ активирован до ${new Date(expiresAt).toLocaleDateString('ru-RU')}.`,
    });
  } catch (error) {
    console.error('Travel Radar admin grant message:', error.message);
  }
  return { subscription: adminSubscriptionView(result), messageSent };
}

export async function grantTravelAdminAccess(input = {}) {
  const username = String(input.username || '').trim().replace(/^@/, '').toLocaleLowerCase();
  if (!username) throw new Error('INVALID_TELEGRAM_USERNAME');
  const subscriptions = await getState(SUBSCRIPTIONS_KEY, []);
  const subscription = subscriptions.find((item) => (
    String(item.telegramUsername || '').toLocaleLowerCase() === username
  ));
  if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND');
  return grantTravelAdminSubscription(subscription.id, input);
}

export async function disableTravelAdminSubscription(id) {
  const now = new Date().toISOString();
  let result = null;
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
    if (item.id !== id) return item;
    result = {
      ...item,
      status: 'canceled',
      autoRenew: false,
      paymentMethodId: null,
      manualAccess: false,
      currentPeriodEnd: now,
      pendingPaymentId: null,
      pendingPaymentMethod: null,
      renewalStartedAt: null,
      updatedAt: now,
    };
    return result;
  }));
  if (!result) throw new Error('SUBSCRIPTION_NOT_FOUND');
  return { subscription: adminSubscriptionView(result) };
}

export async function sendTravelAdminMessage(id, input = {}) {
  const text = String(input.message || '').trim().slice(0, 3000);
  if (!text) throw new Error('INVALID_MESSAGE');
  const subscriptions = await getState(SUBSCRIPTIONS_KEY, []);
  const subscription = subscriptions.find((item) => item.id === id);
  if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND');
  if (!subscription.telegramChatId) throw new Error('TELEGRAM_NOT_CONNECTED');
  const message = await telegramRequest('sendMessage', {
    chat_id: subscription.telegramChatId,
    text,
  });
  return { sent: true, messageId: message.message_id };
}

export async function deleteTravelAdminSubscription(id) {
  let deleted = false;
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.filter((item) => {
    if (item.id !== id) return true;
    if (item.status === 'active' && Date.parse(item.currentPeriodEnd || '') > Date.now()) {
      throw new Error('SUBSCRIPTION_ACTIVE');
    }
    deleted = true;
    return false;
  }));
  if (!deleted) throw new Error('SUBSCRIPTION_NOT_FOUND');
  return { deleted: true };
}

export async function handleTravelTelegramUpdate(update, secretHeader) {
  if (!TELEGRAM_WEBHOOK_SECRET || !secretMatches(secretHeader, TELEGRAM_WEBHOOK_SECRET)) {
    throw new Error('INVALID_TELEGRAM_SECRET');
  }
  const message = update?.message;
  const chatId = message?.chat?.id ? String(message.chat.id) : '';
  const command = String(message?.text || '').trim().split(/\s+/)[0].replace(/@\w+$/, '');
  if (chatId && command === '/cancel') {
    let changed = false;
    await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
      if (item.telegramChatId !== chatId || !['active', 'canceling'].includes(item.status)) return item;
      changed = true;
      return {
        ...item,
        autoRenew: false,
        paymentMethodId: null,
        renewalStartedAt: null,
        status: item.status === 'active' ? 'canceling' : item.status,
        updatedAt: new Date().toISOString(),
      };
    }));
    await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: changed
        ? 'Автопродление отключено, способ оплаты отвязан. Уведомления продолжат работать до конца оплаченного периода.'
        : 'Активная подписка для этого чата не найдена.',
    });
    return { accepted: true };
  }
  if (chatId && command === '/status') {
    const subscriptions = await getState(SUBSCRIPTIONS_KEY, []);
    const subscription = subscriptions
      .filter((item) => item.telegramChatId === chatId)
      .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))[0];
    const statusText = {
      awaiting_payment: 'Радар подключён. Следующий шаг — активация доступа на сайте.',
      awaiting_telegram: 'Настройте радар на сайте и подключите этот Telegram-чат.',
      canceled: 'Срок доступа завершён. Новый период можно подключить на сайте.',
      past_due: 'Срок доступа завершён. Новый период можно подключить на сайте.',
    };
    await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: subscription && ['active', 'canceling'].includes(subscription.status)
        ? `Подписка ${subscription.status === 'active' ? 'активна' : 'действует до конца периода'}. Доступ до ${new Date(subscription.currentPeriodEnd).toLocaleDateString('ru-RU')}.`
        : statusText[subscription?.status] || 'Откройте персональный радар на сайте и подключите уведомления.',
      reply_markup: {
        inline_keyboard: [[{
          text: 'Открыть персональный радар',
          url: `${PUBLIC_BASE_URL}/travel-radar#personal-radar`,
        }]],
      },
    });
    return { accepted: true };
  }
  const match = String(message?.text || '').match(/^\/start(?:@\w+)?\s+radar_([A-Za-z0-9_-]{20,64})$/);
  if (chatId && ['/start', '/help'].includes(command) && !match) {
    await telegramRequest('sendMessage', {
      chat_id: chatId,
      text: '<b>✈️ Memora Travel Radar</b>\n\n'
        + 'Персональные уведомления о билетах и турах по выбранному маршруту и бюджету.\n\n'
        + 'Настройте направления на сайте — подходящие предложения будут приходить сюда.',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{
          text: 'Настроить персональный радар',
          url: `${PUBLIC_BASE_URL}/travel-radar#personal-radar`,
        }]],
      },
    });
    return { accepted: true };
  }
  if (!message?.chat?.id || !match) return { accepted: true };
  const tokenHash = hashToken(match[1]);
  let linked = false;
  await updateState(SUBSCRIPTIONS_KEY, [], (subscriptions) => subscriptions.map((item) => {
    if (item.tokenHash !== tokenHash) return item;
    linked = true;
    return {
      ...item,
      telegramChatId: String(message.chat.id),
      telegramUsername: message.from?.username || null,
      status: item.status === 'awaiting_telegram' ? 'awaiting_payment' : item.status,
      updatedAt: new Date().toISOString(),
    };
  }));
  await telegramRequest('sendMessage', {
    chat_id: message.chat.id,
    text: linked
      ? 'Радар подключён. Вернитесь на сайт, оплатите подписку — и я начну присылать подходящие предложения.'
      : 'Ссылка подключения устарела. Создайте подписку заново на сайте Радара путешествий.',
  });
  return { accepted: true };
}

function placeMatches(place, filter) {
  if (!filter || filter.kind === 'all') return true;
  if (filter.kind === 'city') return place?.code === filter.value;
  return [place?.country?.ru, place?.country?.en].includes(filter.value);
}

function dealMatches(deal, filters) {
  if (filters.dealType !== 'all' && deal.type !== filters.dealType) return false;
  if (!placeMatches(deal.from, filters.origin) || !placeMatches(deal.to, filters.destination)) return false;
  if (filters.maxPrice && deal.price > filters.maxPrice) return false;
  return !filters.minDiscount || Math.round((deal.discount || 0) * 100) >= filters.minDiscount;
}

function dealTypeMeta(deal) {
  return deal.type === 'tour'
    ? { icon: '🏝', label: 'Тур' }
    : { icon: '✈️', label: 'Билет' };
}

function telegramDealText(deal) {
  const type = dealTypeMeta(deal);
  const discount = deal.discount ? ` · −${Math.round(deal.discount * 100)}%` : '';
  return `${type.icon} <b>${type.label} · ${escapeHtml(deal.from?.name)} → ${escapeHtml(deal.to?.name)}</b>\n`
    + `${Number(deal.price).toLocaleString('ru-RU')} ₽${discount}\n`
    + `<a href="${escapeHtml(deal.link)}">Открыть предложение</a>`;
}

function availableOfferLabel(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) return 'предложение доступно';
    if (mod10 >= 2 && mod10 <= 4) return 'предложения доступны';
  }
  return 'предложений доступны';
}

async function rememberSnapshotDeals(subscriptionId, deals) {
  if (!deals.length) return;
  await updateState(SUBSCRIPTIONS_KEY, [], (items) => items.map((item) => {
    if (item.id !== subscriptionId) return item;
    const ids = new Set(item.notifiedDealIds || []);
    deals.forEach((deal) => ids.add(dealKey(deal)));
    return { ...item, notifiedDealIds: [...ids].slice(-300) };
  }));
}

async function sendSubscriptionSnapshot(subscription, { intro = '' } = {}) {
  const feed = await getTravelFeed();
  const matches = (Array.isArray(feed?.deals) ? feed.deals : [])
    .filter((deal) => dealMatches(deal, subscription.filters));
  const shown = matches.slice(0, 5);
  const countLine = `<b>На данный момент по вашим фильтрам доступно: ${matches.length}</b>`;
  const offerList = shown.length
    ? `\n\n${shown.map(telegramDealText).join('\n\n')}`
    : '\n\nСледующие подходящие предложения появятся в этом чате.';
  const moreLine = matches.length > shown.length
    ? `\n\nЕщё ${matches.length - shown.length} ${availableOfferLabel(matches.length - shown.length)} на сайте.`
    : '';
  await telegramRequest('sendMessage', {
    chat_id: subscription.telegramChatId,
    text: `${intro ? `${intro}\n\n` : ''}`
      + 'Подходящие предложения будут приходить в этот чат. Настройки маршрута доступны на сайте.\n\n'
      + countLine + offerList + moreLine,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{
        text: 'Настроить персональный радар',
        url: `${PUBLIC_BASE_URL}/travel-radar#personal-radar`,
      }]],
    },
  });
  await rememberSnapshotDeals(subscription.id, shown);
  return true;
}

async function sendMatchingNotifications(deals) {
  if (!TELEGRAM_TOKEN) return;
  const subscriptions = await getState(SUBSCRIPTIONS_KEY, []);
  for (const subscription of subscriptions) {
    if (subscription.status !== 'active' || !subscription.telegramChatId) continue;
    if (Date.parse(subscription.currentPeriodEnd || '') <= Date.now()) continue;
    const sent = new Set(subscription.notifiedDealIds || []);
    const activatedAt = Date.parse(subscription.activatedAt || subscription.createdAt || '') || 0;
    const matches = deals.filter((deal) => {
      const published = Date.parse(deal.date || '') || 0;
      return published >= activatedAt - 5 * 60 * 1000
        && !sent.has(dealKey(deal))
        && dealMatches(deal, subscription.filters);
    }).slice(0, 5);
    if (!matches.length) continue;

    const reservedIds = [];
    await updateState(SUBSCRIPTIONS_KEY, [], (items) => items.map((item) => {
      if (item.id !== subscription.id) return item;
      const existing = new Set(item.notifiedDealIds || []);
      for (const deal of matches) {
        const key = dealKey(deal);
        if (!existing.has(key)) {
          existing.add(key);
          reservedIds.push(key);
        }
      }
      return { ...item, notifiedDealIds: [...existing].slice(-300) };
    }));
    const reservedMatches = matches.filter((deal) => reservedIds.includes(dealKey(deal)));
    if (!reservedMatches.length) continue;
    const reservedText = reservedMatches.map(telegramDealText).join('\n\n');
    try {
      await telegramRequest('sendMessage', {
        chat_id: subscription.telegramChatId,
        text: reservedText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error(`Travel notification ${subscription.id}:`, error.message);
      await updateState(SUBSCRIPTIONS_KEY, [], (items) => items.map((item) => (
        item.id === subscription.id
          ? { ...item, notifiedDealIds: (item.notifiedDealIds || []).filter((id) => !reservedIds.includes(id)) }
          : item
      )));
    }
  }
}

export async function refreshTravelRadar({ force = false } = {}) {
  if (refreshRunning) return { skipped: true, reason: 'already-running' };
  refreshRunning = true;
  try {
    const previousFeed = await getTravelFeed();
    if (!force && Date.now() - Date.parse(previousFeed.updatedAt || '') < 25 * 60 * 1000) {
      return { skipped: true, reason: 'fresh' };
    }
    const previousRaw = previousFeed.rawItems || await readRawItems();
    const raw = await fetchAllChannels(previousRaw);
    const deals = await monetizeDeals(buildDeals(raw.items, await loadRefPrices()));
    const feed = {
      updatedAt: raw.updatedAt,
      marker: '748397',
      deals,
      health: raw.health,
      rawItems: raw.items,
    };
    await setState(FEED_KEY, feed);
    await sendMatchingNotifications(deals);
    console.log(`Travel Radar: ${deals.length} deals from ${raw.items.length} fresh posts`);
    return { skipped: false, deals: deals.length, health: raw.health };
  } finally {
    refreshRunning = false;
  }
}

async function renewSubscriptions() {
  if (renewalRunning || !travelCapabilities().payments) return;
  renewalRunning = true;
  try {
    await updateState(SUBSCRIPTIONS_KEY, [], (items) => items.map((item) => {
      if (!item.currentPeriodEnd || Date.parse(item.currentPeriodEnd) > Date.now()) return item;
      if (item.status === 'canceling') return { ...item, status: 'canceled', updatedAt: new Date().toISOString() };
      if (item.status === 'active' && (!item.autoRenew || !item.paymentMethodId)) {
        return { ...item, status: 'past_due', updatedAt: new Date().toISOString() };
      }
      return item;
    }));
    const subscriptions = await getState(SUBSCRIPTIONS_KEY, []);
    const due = subscriptions.filter((item) => item.status === 'active'
      && item.autoRenew && item.paymentMethodId
      && !item.pendingPaymentId
      && Date.parse(item.currentPeriodEnd || '') <= Date.now() + 12 * 60 * 60 * 1000
      && (!item.renewalStartedAt || Date.now() - Date.parse(item.renewalStartedAt) > 6 * 60 * 60 * 1000));
    for (const subscription of due) {
      const startedAt = new Date().toISOString();
      await updateState(SUBSCRIPTIONS_KEY, [], (items) => items.map((item) => (
        item.id === subscription.id ? { ...item, renewalStartedAt: startedAt } : item
      )));
      try {
        const payment = await yookassaRequest('/payments', {
          method: 'POST',
          idempotenceKey: paymentIdempotenceKey(
            subscription.id,
            'renewal',
            subscription.currentPeriodEnd,
          ),
          body: {
            amount: { value: `${PRICE_RUB}.00`, currency: 'RUB' },
            capture: true,
            payment_method_id: subscription.paymentMethodId,
            merchant_customer_id: subscription.id,
            description: 'Продление уведомлений Радара путешествий',
            metadata: { subscription_id: subscription.id, payment_kind: 'renewal' },
            ...receiptFor(subscription),
          },
        });
        await updateState(SUBSCRIPTIONS_KEY, [], (items) => items.map((item) => (
          item.id === subscription.id ? { ...item, pendingPaymentId: payment.id } : item
        )));
        if (payment.status === 'succeeded') await applyVerifiedPayment(payment);
      } catch (error) {
        await updateState(SUBSCRIPTIONS_KEY, [], (items) => items.map((item) => (
          item.id === subscription.id
            ? { ...item, lastPaymentError: error.message, updatedAt: new Date().toISOString() }
            : item
        )));
      }
    }
  } finally {
    renewalRunning = false;
  }
}

async function configureTelegramWebhook() {
  if (!travelCapabilities().telegram) return;
  try {
    await telegramRequest('setWebhook', {
      url: `${PUBLIC_BASE_URL}/api/travel/telegram/webhook`,
      secret_token: TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message'],
    });
    await telegramRequest('setMyCommands', {
      commands: [
        { command: 'start', description: 'Открыть персональный радар' },
        { command: 'status', description: 'Проверить подписку' },
        { command: 'cancel', description: 'Отключить автопродление' },
      ],
    });
    console.log('Travel Radar: Telegram webhook configured');
  } catch (error) {
    console.error('Travel Radar Telegram webhook:', error.message);
  }
}

export function startTravelRadarServices() {
  setTimeout(() => refreshTravelRadar({ force: true }).catch((error) => {
    console.error('Travel Radar initial refresh:', error);
  }), 5_000).unref();
  refreshTimer = setInterval(() => refreshTravelRadar({ force: true }).catch((error) => {
    console.error('Travel Radar scheduled refresh:', error);
  }), REFRESH_MS);
  renewalTimer = setInterval(() => renewSubscriptions().catch((error) => {
    console.error('Travel Radar renewals:', error);
  }), 60 * 60 * 1000);
  refreshTimer.unref();
  renewalTimer.unref();
  configureTelegramWebhook();
  renewSubscriptions().catch((error) => console.error('Travel Radar renewals:', error));
}

export function stopTravelRadarServices() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (renewalTimer) clearInterval(renewalTimer);
}
