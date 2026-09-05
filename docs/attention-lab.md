# Attention Lab

The Lab extends Memora's portfolio with a working demonstration of information design. The homepage entrance follows the project gallery. The existing `/attention-lab` route, bilingual content, saved-reference key and copyable brief remain supported.

## Research → product decisions

| Reference | Observed pattern | Application here |
| --- | --- | --- |
| [FT Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary) | Chart families start from the relationship in the data: ranking, change, part-to-whole, flow. | Four question-led studies; shared scales and honest zero baselines. |
| [The Pudding: Dicing an Onion](https://pudding.cool/2025/08/onions/) | Readers adjust a model and compare its visible result; explanations expand with the experiment. | Direct manipulation, immediate selected-value feedback, technique explanation beside the study. |
| [Seeing Theory: Basic Probability](https://seeing-theory.brown.edu/basic-probability/index.html) | Small actions reveal one concept at a time. This resource is archived. | One compact interaction per study; keyboard-accessible controls and exact data tables. |
| [Vega-Lite examples](https://vega.github.io/vega-lite/examples/) | Reusable examples with declarative specifications. | Keep authored data separate from renderers and expose useful references for future projects. |

These are design interpretations, not measured conversion claims or copies of the source designs. All four datasets are authored demonstrations. The Lab makes no claim that a particular highlight improves a real customer's conversion.

## Structure

- `src/shared/AttentionPortal.jsx`: once-only scroll reveal of a chart sheet, ordinary link into the Lab; reduced-motion support.
- `src/pages/AttentionLab/labData.js`: bilingual datasets, reference catalog, safe selection parser, derived insights, text brief.
- `LabWorkbench.jsx`: native buttons, CSS bars and responsive SVG line geometry; exact-value table.
- `AttentionLabPage.jsx`: study selection in `?example=`, device-local collection, copy status and manual fallback, secondary tool reference.
- `AttentionLabPage.css`: dark Memora shell, light chart sheet, responsive controls.
- `tests/attention-lab.test.mjs`: data integrity, insight arithmetic, saved-selection validation and reusable briefs.

The studies render with React, CSS and SVG. Vega-Lite, Altair, Observable Plot, matplotlib and AntV are reference options for future work, not hidden runtime dependencies. No new package was installed. Heavy chart runtimes and continuous Lab animation loops are absent; the shared particle component is unmounted on this route.

The chart workbench opts out of the site's forced 18/22/56 typography to retain readable chart labels and responsive controls. Its body text is 16px; normal chart labels are 14–16px, secondary metadata 13px. The surrounding site keeps Memora typography.

## Reference shelf

Only known study/reference IDs are persisted in the existing `memora-attention-lab-references` key. Existing six external-reference IDs are accepted. Malformed storage is ignored safely; blocked writes keep the current in-memory collection and show an explicit warning. This is a device-local collection, not account synchronization.

Briefs contain the selected technique, applications, output format and public deep links. Clipboard success is shown only after a successful write. Failure reveals selectable text adjacent to the initiating control.

Tool installation snippets are informational. The site does not execute them. Official docs:
- [AntV](https://github.com/antvis/mcp-server-chart)
- [Anthropic Skills](https://github.com/anthropics/skills) — the marketplace command is for Claude Code.
- [OpenSkills](https://github.com/numman-ali/openskills) — SOURCE must be replaced with a reviewed repository.

## Adding a study

1. State the reader's question and the intended decision.
2. Declare the data source. Label authored demonstration data explicitly.
3. Choose the form by the relationship in the data. Keep comparable values on comparable scales; show units and denominators.
4. Give each interaction a visible result, touch-sized controls and a keyboard path.
5. Keep exact values available as a table. Respect reduced motion.
6. Add stable IDs, both languages and a valid focus row. Preserve saved IDs across future revisions.
7. Add arithmetic and brief tests; inspect desktop and narrow layouts.
8. Measure real outcomes separately before making effectiveness claims.

## Development isolation

Vite's dependency scan is restricted to the root `index.html`. Without this boundary it also discovered the independent Pomodoro HTML and optimized Pomodoro's React 18 DOM renderer alongside the website's React 19, causing a development startup failure. Production still uses the existing independent builds and VPS/CDN deployment.

## Validation

- Root ESLint / typography validation and production build.
- 19 automated reliability tests, including five Lab tests.
- Browser checks: question switching; selected values; overview/focus; keyboard activation; exact table; saved collection after reload; copy brief; ru/en; narrow viewport overflow and chart readability.
- Deployment remains on the existing Memora infrastructure. This frontend redesign does not close the remaining server/payment/updater findings recorded in the separate reliability audit.
