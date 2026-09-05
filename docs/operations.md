# Operations

Deployment and integration reference for maintainers.

## Memora production

The production server is `server.js`. It serves the public site and the
password-protected management interface on `admin.memorasolutions.ru`.

Required environment variables:

- `ADMIN_USER` — Basic Auth login (normally `admin`);
- `ADMIN_PASSWORD` — Basic Auth password; never commit it;
- `DATABASE_URL` or `DATABASE_PUBLIC_URL` — PostgreSQL used by the shared
  Kanban and Pomodoro settings;
- `BDAY_DATABASE_URL` — BdayBot PostgreSQL connection for the centralized
  management panel;
- `BDAY_BOT_TOKEN` — Telegram token used by the centralized panel for bot
  health checks, personal messages, previews, and broadcasts;
- `BDAY_ADMIN_ID` — Telegram ID that receives broadcast previews;
- `BDAY_ADMIN_URL` — optional link to the legacy BdayBot control panel.

Travel Radar runs its Telegram-channel parser inside the production server
every 30 minutes; a separate GitHub Actions workflow refreshes the same public
files twice per hour as a fallback. Paid alerts require:

- `RADAR_TELEGRAM_BOT_TOKEN` — token issued by BotFather;
- `RADAR_TELEGRAM_BOT_USERNAME` — bot username without `@`;
- `RADAR_TELEGRAM_WEBHOOK_SECRET` — random 1–256 character webhook secret;
- `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` — YooKassa API credentials;
- `PUBLIC_BASE_URL` — normally `https://memorasolutions.ru`;
- `YOOKASSA_RECEIPTS_ENABLED=true` if YooKassa must receive receipt data;
- `YOOKASSA_VAT_CODE` — receipt VAT code. Set it explicitly for the merchant's
  tax regime before enabling receipts; the application uses `1` only as a
  backward-compatible fallback.

The YooKassa shop must have recurring payments enabled. Configure its webhook
as `https://memorasolutions.ru/api/travel/payments/yookassa` for the
`payment.succeeded` and `payment.canceled` events. The Telegram webhook is registered automatically on
server startup when all three `RADAR_TELEGRAM_*` variables are present. Bot
commands `/status` and `/cancel` let a subscriber check the paid period or stop
auto-renewal even if browser storage was cleared.

Pomodoro uses one renderer source for desktop and web. After renderer changes,
run `npm run build:web` inside `memora-pomodoro`; this updates
`public/app/pomodoro` and `public/pomodoro-version.json`. A desktop release is
built with `npm run dist:win` from the same directory.

## Configuration and access

### Payment delivery and recovery

Before creating a payment, the server commits a request journal entry into the
subscription's PostgreSQL record. The entry contains a UUID idempotence key and
the exact JSON request bytes, including amount, receipt, customer, payment method
and metadata. Settings changes and restarts preserve that snapshot. A second
transaction claims a 90-second submission lease; the provider POST starts only
after this commit. Concurrent tabs/processes share the same database lock and key.

Payment events are verified using an authenticated YooKassa GET. They must match
the stored pending ID or the journal request nonce, plus amount, currency and
subscription metadata. `merchant_customer_id` is optional in the provider payment
object (see the [official OpenAPI specification](https://yookassa.ru/developers/using-api/openapi-specification));
when present it must match. Its absence never replaces the required ID/nonce
association. The frozen journal request also has the expected customer ID.
This lets an early webhook bind the provider
ID before the POST response arrives. Terminal results and duplicate IDs are
handled in the same transaction. A late response preserves a committed result.
Legacy events without either association receive HTTP 503 for provider redelivery.
YooKassa retries non-200 webhook responses for up to 24 hours; see its
[webhook documentation](https://yookassa.ru/developers/using-api/webhooks).

At startup and every five minutes the server reconciles at most 12 requests in a
round-robin batch, with three concurrent workers. Known IDs use GET only. An
unknown result uses the persisted POST bytes and key, subject to the lease and
exponential retry delay (one minute to one hour). Provider deadlines include the
response body. Persistent storage is required for every journal mutation.

[YooKassa idempotence](https://yookassa.ru/developers/using-api/interaction-format)
is guaranteed for 24 hours. Automatic POST recovery stops 23 hours after journal
creation, leaving a one-hour margin; server clock synchronization is required.
An ambiguous expired request, an explicit provider rejection or cancellation
during an unknown request sets `paymentReviewRequired`. Checkout and new renewal
creation stop until the payment is reconciled. A never-submitted expired request
is abandoned; an explicit new checkout may prepare a fresh request. Each billing
period gets at most one automatic renewal request, including canceled results.

Operator procedure for `paymentReviewRequired`: locate the existing transaction
in the merchant dashboard/history and verify its subscription/customer/nonce and
amount. Have the provider redeliver its terminal webhook (the server verifies it
by GET). Never clear an ambiguous journal or create a new key merely to retry.
For an administrative access override, late payment evidence is retained for
manual resolution; it does not reactivate the revoked access or issue a refund.
Admin deletion is blocked while payment review or an unresolved request exists.
Current request bodies are server-only; admin responses expose a compact summary.
History is bounded to 120 summaries and 60 applied/resolved IDs per subscription;
provider history and protected database backups remain necessary audit records.

#### Existing subscriptions

After deploying a server reporting `paymentJournalVersion: 1` from
`/api/travel/capabilities`, run the following as the application user with its
server-only environment:

```bash
node --env-file=/etc/memora-solutions.env scripts/migrate-payment-journal.mjs --dry-run
node --env-file=/etc/memora-solutions.env scripts/migrate-payment-journal.mjs --apply
```

Take a database backup first. The migration performs a bounded, fully paginated
provider-history GET scan and upgrades only records with no unresolved payment,
pending ID, renewal marker or admin override. Successful payments, ambiguous
metadata and incomplete history require operator review. A concurrent subscription
change aborts the transaction. Output contains counts only. This migration creates
no payments or Telegram messages and preserves subscription access/expiry.

#### Rollback compatibility

Once a journal request exists, rollback must keep a journal-aware payment engine.
Older code can ignore the recorded key and create another charge. If emergency
rollback to pre-journal code is necessary, first stop the application and updater,
preserve the live database, and remove `YOOKASSA_SECRET_KEY` and `YOOKASSA_SHOP_ID`
from that old release's runtime environment. Keep payment creation disabled until
the journal-aware release is restored and unresolved requests are reconciled.
Do not automatically restore an old database snapshot over a live payment ledger.
The legacy VPS updater currently restores only static assets on health failure;
full application/configuration rollback is a separate deployment follow-up.

Regression tests use mocked provider/Telegram boundaries and synthetic data:
`npm run test:payments` and `npm run test:reliability`. They cover early and lost
events, concurrent instances, simulated database failures/restarts, frozen request
replay, deadline expiry, opt-out, admin overrides and legacy migration eligibility.
These are deterministic service tests, not live charges or a physical VPS crash
test. A restore drill and offsite backups remain operational requirements.

### Runtime credentials

For a local server, copy the repository's `.env.example` to `.env` and run
`node --env-file=.env server.js`. The `npm start` command expects variables
to have already been supplied by the process environment.

VPS workflows use the dedicated `MEMORA_VPS_SSH_KEY` Actions secret and
the [shared SSH setup action](../.github/actions/setup-vps-ssh/action.yml).
The action checks the server's ED25519 host key against a pinned SHA256
fingerprint before a connection is made.

These workflows retain the existing root-level deployment operations.
The dedicated server key disables forwarding and PTY allocation; it still
permits root commands. Protect access to workflow changes and repository
secrets accordingly.

Keep service credentials, database exports, user/session data and deployment
keys outside Git. Use example configuration with empty values or synthetic
test data. Review both tracked files and Git history before making additional
code public, including release artifacts. Deleting a file from the latest
commit does not remove earlier versions. Revoke or rotate exposed credentials;
a secret scanner alone cannot establish that a repository is safe to publish.

## Pomodoro builds

From the repository root:

```bash
cd memora-pomodoro
npm ci
npm run build
npm run build:web
```

Supply the matching `MEMORA_SCENE_KEY` in the build environment or the
application's local environment file. The existing encrypted scene and its
key form a pair; generating a new random key alone cannot decode that scene.

`build:web` updates `public/app/pomodoro` and
`public/pomodoro-version.json` in the parent project. Commit those changes
when intentionally releasing a new web version. `npm run dist:win` builds
a Windows desktop release.

The scene key is embedded in the renderer in obfuscated form. Treat that
mechanism as asset obfuscation, not as a security boundary for service
credentials or user data. Keep private source artwork in the maintained
build environment, and review licensing separately.
