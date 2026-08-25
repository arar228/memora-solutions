# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

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
