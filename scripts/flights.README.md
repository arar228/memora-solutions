# Hot flights source (Travelpayouts Data API)

`scripts/fetch-flights.js` builds a "hot flights" feed from the official
**Travelpayouts (Aviasales) Data API** — not the realtime Search API (that needs
50k+ MAU and isn't required here).

## What it does
1. `GET /v2/prices/latest` (no origin/destination) → the 30 cheapest tickets
   Aviasales found in the last 48h.
2. Per route: `GET /v2/prices/month-matrix` → **median** = the route's "normal"
   price.
3. `score = discount vs median`; keeps only genuinely hot, well-supported deals
   (`≥25%` off, `≥4` matrix samples) → filters noise.
4. Builds an **affiliate deep link** to `aviasales.com` with your `marker`.
5. Writes `public/flights.json` and, if configured, **posts new deals to a
   Telegram channel**.

The Data API is **cached** by Aviasales (not realtime, kept ~7 days), so this
runs on a **cron** (`.github/workflows/update-flights.yml`, every 2h), caches
route medians within a run, and never books on these prices.

## Get access (you do this — I can't log in with your password)
1. Register at **travelpayouts.com**, connect the **Aviasales** program (free).
2. Copy your **API token** (`x-access-token`) and your **Marker** from the
   dashboard.
3. Add them as repo secrets (Settings → Secrets → Actions):
   - `TRAVELPAYOUTS_TOKEN` — the API token
   - `TRAVELPAYOUTS_MARKER` — your affiliate marker
   - `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHANNEL` — optional, to auto-post
     (`@your_channel`; the bot must be an admin of that channel)

Once `TRAVELPAYOUTS_TOKEN` is set, the workflow runs on its own. Nothing is
posted or fetched until then.

## Run locally
```bash
# dry-run (no token → built-in sample, exercises scoring + links + output):
node scripts/fetch-flights.js

# live:
TRAVELPAYOUTS_TOKEN=xxx TRAVELPAYOUTS_MARKER=123456 node scripts/fetch-flights.js

# live + post to Telegram:
TRAVELPAYOUTS_TOKEN=xxx TRAVELPAYOUTS_MARKER=123456 \
TELEGRAM_BOT_TOKEN=yyy TELEGRAM_CHANNEL=@memora_travel node scripts/fetch-flights.js
```

## Note on the loop
If you post to a channel that `scripts/fetch-tours.js` already scrapes (e.g.
`@travelradar`), the deals also flow back into `public/tours.json` and appear on
the site — no extra wiring needed. Otherwise `public/flights.json` is available
to render directly later.

## Tuning
Edit the constants at the top of `fetch-flights.js`: `MIN_DISCOUNT` (0.25),
`MIN_SAMPLES` (4), `TOP_N` (12), `REQUEST_DELAY_MS` (300, rate-limit politeness).
