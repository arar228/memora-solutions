// Dry-run by default. Requires server-only DB/provider credentials in env.
// No payment creation, refunds or Telegram requests are performed here.
import { getState, getStoreStatus, updateState, closeAdminStore } from '../server/admin-store.js';
import { legacyPaymentReview } from '../server/payment-journal-migration.js';

const args = process.argv.slice(2);
if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || (args.includes('--apply') && args.includes('--dry-run'))) {
  throw new Error('Usage: node scripts/migrate-payment-journal.mjs [--dry-run | --apply]');
}
const apply = args.includes('--apply');
const key = 'travel_radar_subscriptions_v1';
try {
  if (!(await getStoreStatus()).persistent) throw new Error('Persistent storage is required');
  if (!process.env.YOOKASSA_SECRET_KEY || process.env.YOOKASSA_SHOP_ID !== '1442213') {
    throw new Error('Expected YooKassa credentials are required');
  }
  // The running upgraded server must already guard legacy initial attempts.
  // A scan while an old writer can create an unjournaled payment is unsafe.
  if (apply) {
    const port = Number(process.env.PORT || 3000);
    const response = await fetch(`http://127.0.0.1:${port}/api/travel/capabilities`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok || (await response.json()).paymentJournalVersion !== 1) {
      throw new Error('Deploy and verify the journal-aware server before applying this migration');
    }
  }
  const snapshot = await getState(key, []);
  const candidates = snapshot.filter(item => item.paymentJournalVersion !== 1);
  if (!candidates.length) console.log(JSON.stringify({ candidates: 0, applied: 0 }));
  else {
    const times = candidates.map(item => Date.parse(item.createdAt));
    if (times.some(value => !Number.isFinite(value))) throw new Error('Legacy timestamps require manual review');
    const since = new Date(Math.min(...times) - 3600_000).toISOString();
    const payments = [];
    const authorization = `Basic ${Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`).toString('base64')}`;
    let cursor;
    let pages = 0;
    do {
      const url = new URL('https://api.yookassa.ru/v3/payments');
      url.searchParams.set('created_at.gte', since);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);
      const response = await fetch(url, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Provider history HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Invalid provider history response');
      payments.push(...data.items);
      cursor = data.next_cursor;
      if (++pages >= 10 && cursor) throw new Error('History exceeds bounded scan; operator review required');
    } while (cursor);
    const reviewed = candidates.map(item => ({ item, review: legacyPaymentReview(item, payments) }));
    const eligible = reviewed.filter(value => value.review.eligible);
    let changed = 0;
    if (apply) {
      const result = await updateState(key, [], items => items.map(item => {
        const match = eligible.find(value => value.item.id === item.id);
        if (!match) return item;
        // A user action, another migration or a renewal during the provider scan
        // invalidates this review. Rerun from a fresh snapshot instead of guessing.
        if (JSON.stringify(item) !== JSON.stringify(match.item)) throw new Error('Subscription changed during review; rerun the migration');
        changed++;
        return { ...item, paymentJournalVersion: 1, paymentReviewRequired: false, lastPaymentError: null,
          resolvedPaymentIds: [...new Set([...(item.resolvedPaymentIds || []), ...match.review.canceledIds])].slice(-60),
          paymentJournalMigration: { version: 1, checkedAt: new Date().toISOString(), since,
            providerPages: pages, result: 'complete_history_no_unresolved_initial_payment' } };
      }));
      if (!result.persistent) throw new Error('Migration was not persisted');
    }
    console.log(JSON.stringify({ candidates: candidates.length, eligible: eligible.length,
      requiresReview: reviewed.length - eligible.length, providerPages: pages, applied: changed, dryRun: !apply }));
  }
} finally { await closeAdminStore(); }
