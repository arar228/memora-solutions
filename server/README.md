# Memora Concierge API (Phase 1)

Backend for the **Travel Radar — Concierge** module (TZ). Node + Express + SQLite.
Isolated service — does not touch the static site. Delete this folder to roll back.

## Run

```bash
cd server
cp .env.example .env          # optional; defaults work for local dev
npm install
npm run seed                  # creates admin/operator/client demo users
npm start                     # API on http://localhost:4000
```

Health: `GET /api/health` → `{ ok: true, mockPayments: true }`.

Without YooKassa keys the API runs in **mock payment mode**: invoices return a
local demo "payment page" that marks the payment succeeded, so the full
**request → quote → accept → invoice → pay → booking → completed** flow works
end-to-end locally. Add `YOOKASSA_SHOP_ID` + `YOOKASSA_SECRET_KEY` (test shop)
to use the real sandbox.

## Roles
`client` · `operator` · `lead` · `admin`. JWT auth (`Authorization: Bearer …`),
RBAC on every staff action, full audit log. Request status changes go through a
**server-enforced state machine** (illegal transitions are rejected).

## API (high level)
- **Auth:** `POST /api/auth/register|login`, `GET /api/auth/me`
- **Requests:** `POST /api/requests`, `GET /api/requests` (client: own / staff: queue+filters), `GET /api/requests/:id`, `POST /api/requests/:id/assign`, `POST /api/requests/:id/transition`, `POST /api/requests/:id/messages`
- **Offers:** `POST /api/requests/:id/offers` (staff), `POST /api/offers/:id/accept|reject` (client)
- **Payments:** `POST /api/requests/:id/invoice`, `POST /api/payments/webhook`, `POST /api/payments/:id/refund`
- **Operator:** `POST /api/requests/:id/booking|documents|complete`, `GET /api/analytics/funnel`
- **Documents (AES-256-GCM at rest, 152-ФЗ):** `POST /api/requests/:id/documents/upload` (base64), `GET /api/documents/:id/download` (access-controlled decrypt), `GET /api/requests/:id/documents`

## Data model
`users, requests, offers, payments, supplier_payments, bookings, trip_documents, messages, partners, audit_log` (TZ §10).

## Not yet (next increments)
2FA for staff, real notification delivery (Telegram/email/web-push — currently
logged), partner cabinet, PostgreSQL for production, and deployment. The client
frontend (`src/pages/TravelRadarV2`) IS wired to this API (live mode + auth) with
a localStorage fallback when no backend is present.
