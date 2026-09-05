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

Payment events are verified using an authenticated YooKassa GET request. The
provider payment ID must match the subscription's stored pending ID; amount,
currency, customer and subscription metadata remain mandatory checks. Confirmed
successes and cancellations are idempotent and duplicate events are acknowledged.

A valid event arriving before its pending ID is saved receives HTTP 503 with a
retry hint. HTTP 200 is sent only after processing or intentional ignoring of an
unrelated event. YooKassa uses the HTTP status, ignores the response body, and
retries non-200 responses for up to 24 hours; see its
[webhook documentation](https://yookassa.ru/developers/using-api/webhooks).

At startup and every five minutes the server reconciles stored pending payments
via GET only. Each round-robin batch contains at most 12 payments, with three
concurrent provider requests. Provider deadlines cover both headers and JSON
body. A failed payment check leaves its pending ID available for the next run.
Only persistent subscription storage is accepted for payment operations.

An outstanding recovery gap remains: if the process crashes after YooKassa creates
a payment but before its ID is committed, the GET-only reconciler cannot discover
that ID. A durable payment-request/outbox record and operator reconciliation are
still required for this case. Do not blindly retry an old creation request:
[YooKassa idempotence](https://yookassa.ru/developers/using-api/interaction-format)
is guaranteed for 24 hours. These changes do not introduce automatic recharging
to resolve unknown payments.

Regression tests use mocked provider/Telegram boundaries and synthetic data:
`npm run test:payments` and `npm run test:reliability`. They cover early success
and cancellation, duplicate delivery, lost webhook recovery, database failure,
invalid payment fields, late renewal responses and stalled provider bodies.

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
