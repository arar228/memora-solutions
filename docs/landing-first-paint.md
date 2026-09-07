# Landing first paint

The September 7, 2026 WebPageTest run identified the secondary hero headline
as the LCP element (2,374 ms, desktop Chrome, Amsterdam). Its entrance used
an 810 ms delay and a 350 ms animation after component activation.

## Changes

- Render the eyebrow, headline, description and actions as visible native elements.
- Give the landing route an immediately visible page wrapper. Other routes keep
  their existing transitions; decorative landing motion remains.
- Extract the Creator route's static JS/CSS graph from the build output and start
  it alongside the entry graph on `/`. Other pages and admin entrypoints retain
  demand loading. Hints are deduplicated and use the selected boot source.
- Retain the transfer deadline, stylesheet gate, source order and document-based
  recovery. Route stylesheet failures participate in the existing recovery flow.

## Verification

Run `npm run lint`, `npm run test:reliability`, `npm run test:deals`,
`npm run test:payments` and `VITE_ASSET_BASE=./ npm run build` (POSIX shell syntax).
The reliability suite covers graph extraction, duplicate hints, route/admin
isolation, source recovery, stylesheet failure and immediate hero markup.

Verify `/` in Russian and English, the contact/cases anchors, gallery, navigation
to another route and return. Repeat WebPageTest under the original desktop
conditions and a mobile profile after release. Animation delays are relative to
component activation: their sum is not a measured LCP improvement.

## Delivery boundary

This patch preserves backend, environment, Caddy, payment and deployment settings.
The VPS already uses long immutable caching for built assets. GitHub Pages uses
its own response headers; moving primary delivery to the VPS requires a separate
availability check because previous origin stalls were observed. Keep the current
CDN recovery order until that check is complete.

Release through the existing exact-SHA CI/assets/VPS workflow and verify health
and the deployed marker. The existing updater retains the previous application
and configuration for transaction recovery. A later functional regression should
be reverted through a reviewed revert commit and the same release checks.
