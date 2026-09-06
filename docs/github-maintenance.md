# GitHub maintenance

## Release gate

Code changes enter master through a pull request with successful CI: release,
wallet, site, pomodoro, codeql (javascript-typescript), and codeql (python).
The VPS also verifies CI and production assets for the exact released commit.
Administrators follow the same gate. Force pushes and deletion remain disabled.

## Independent travel data

The travel-data branch contains exactly public/flights.json, hot-deals.json,
radar.json and tours.json. Scheduled workflows run trusted code from master,
load their latest shared data baseline, validate new feeds, then publish a
fast-forward data snapshot using an isolated Git index. Both publishers share
one concurrency group. A stale writer fails; it cannot overwrite a newer run.

The VPS timer refreshes these JSON files in dist even when the code commit has
not changed. Every blob is size/schema checked, and the full branch tree must
match the four-file allowlist before installation. Each destination file is
replaced by rename; this is per-file atomicity, not a four-file transaction.
No application code, tracked checkout, database or process is changed by a data
refresh. Failed validation retains the previous files. A code release carries
the previous data forward and attempts to install the latest validated snapshot.

Bootstrap once from a reviewed checkout with valid source snapshots:

```sh
node scripts/travel-feed-branch.mjs seed
```

This creates a new data-only branch; it refuses non-fast-forward replacement.
Enable master required checks after publishing the branch and deploying these
workflows. Run the channels workflow to verify publication and confirm the VPS
serves the same feed timestamp. The flights workflow can send configured Telegram
notifications; use its normal schedule for verification.

## Dependency policy

Weekly minor/patch updates are grouped per ecosystem. React and its DOM/types
major versions are grouped; ESLint and its plugins are grouped. Actions are
SHA-pinned and updated together. Security audits continue in CI.

The 2026-09-06 batch updates React/DOM/types together (including Pomodoro),
ESLint 10 with react-hooks 7.1.1, Electron 44.1.1, router, GSAP, iconv-lite,
python-telegram-bot 22.8 and timezone data. The brace-expansion security override
is limited to its compatible 1.x consumers rather than replacing the new API.

The follow-up batch clears the next queued compatible updates (pg, Three.js,
PostCSS, Sharp, sql.js, fonts, icon tooling and React DOM types). It migrates the
ESLint React Refresh config to the 0.5 function API, updates i18next 26 and
react-i18next 17 together, and groups future localization updates. TypeScript 7
uses explicit relative alias paths instead of the removed baseUrl option.
Setup Node 7 remains SHA-pinned. BDay's follow-up updates aiogram, APScheduler,
psycopg2-binary, psutil and gunicorn under the same combined CI checks.

Vite 8 / plugin-react 6 migration is deferred: electron-vite 5 accepts Vite 5/6/7,
and plugin-react 6 requires Vite 8. Major updates for these two packages are
explicitly ignored until a coordinated, tested migration is possible. Compatible
patch/minor updates and security scanning remain active. Revisit this exception
when electron-vite adds support and test desktop, web, scene protection and CDN.

BDay remains private. Its combined dependency update is checked by Python
3.11/3.12, PostgreSQL, container, secret scanning and dependency-audit CI. The
current GitHub plan rejects private-repository branch protection (HTTP 403);
merges must be gated manually until the account plan supports it.
