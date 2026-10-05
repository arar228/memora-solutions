# Attention Lab

The Lab opens with a user-driven attention journey. The visitor finds an accented
entrance, chooses a product goal, connects that goal to the next action, and sees
a collaboration card assembled from the three completed actions. The homepage
entrance follows the project gallery. The existing `/attention-lab` route,
bilingual content, saved-reference key and copyable brief remain supported.

## Attention journey

- Every transition follows an explicit action: start → choose → connect → result.
  The reducer validates both the current stage and a known goal ID. Repeated or
  out-of-order actions have no effect; restart clears the goal and restores focus.
- A finite accent pulse starts when its button enters view. Scene entrances,
  a drawn connecting path and shared-layout cards show continuity. No background
  animation loop, countdown or forced scrolling controls the visitor.
- Dragging uses viewport coordinates for target detection, including after page
  scrolling. A native button offers the same result through keyboard or touch.
- The final message varies with the chosen goal. Its ordinary contact link carries
  only a validated `labGoal` ID. The existing contact form creates an editable
  draft from that ID; payment, consent, API and submission behavior stay unchanged.
- Stage headings receive focus after actions, instructions use polite live
  announcements, and reduced-motion preference gives instant transitions.
- The reference shelf is a secondary native details element. Its JavaScript and
  styles load on first opening; its component stays mounted afterward to preserve
  in-memory selections when browser storage is blocked. `?example=` links and
  the historical `#playground` anchor open the library directly.

## Reference library: research → product decisions

| Reference | Observed pattern | Application here |
| --- | --- | --- |
| [FT Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary) | Chart families start from the relationship in the data: ranking, change, part-to-whole, flow. | Four question-led studies; shared scales and honest zero baselines. |
| [The Pudding: Dicing an Onion](https://pudding.cool/2025/08/onions/) | Readers adjust a model and compare its visible result; explanations expand with the experiment. | Direct manipulation, immediate selected-value feedback, technique explanation beside the study. |
| [Seeing Theory: Basic Probability](https://seeing-theory.brown.edu/basic-probability/index.html) | Small actions reveal one concept at a time. This resource is archived. | One compact interaction per study; keyboard-accessible controls and exact data tables. |
| [Vega-Lite examples](https://vega.github.io/vega-lite/examples/) | Reusable examples with declarative specifications. | Keep authored data separate from renderers and expose useful references for future projects. |

These are design interpretations, not measured conversion claims or copies of the source designs. All four datasets are authored demonstrations. The Lab makes no claim that a particular highlight improves a real customer's conversion.

## Structure

- `src/shared/AttentionPortal.jsx`: once-only scroll reveal of a chart sheet, ordinary link into the experience; reduced-motion support.
- `AttentionLabPage.jsx` / `AttentionJourney.css`: staged interaction, drag target,
  progress, restart, assembled invitation and optional reference library.
- `journey.js`: finite-state reducer, bilingual goals, validated contact handoff
  and viewport target detection; shared by the existing contact form.
- `src/pages/AttentionLab/labData.js`: bilingual datasets, reference catalog, safe selection parser, derived insights, text brief.
- `LabWorkbench.jsx`: native buttons, CSS bars and responsive SVG line geometry; exact-value table.
- `ReferenceLibrary.jsx`: study selection in `?example=`, device-local collection, copy status and manual fallback, secondary tool reference.
- `AttentionLabPage.css`: dark Memora shell, light chart sheet, responsive controls.
- `tests/attention-lab.test.mjs`: data integrity, insight arithmetic, saved-selection validation and reusable briefs.
- `tests/attention-journey.test.mjs`: all three goal paths, stage guards, restart,
  safe bilingual contact drafts, drag boundaries and typography/motion contracts.

The studies render with React, CSS and SVG. Vega-Lite, Altair, Observable Plot, matplotlib and AntV are reference options for future work, not hidden runtime dependencies. No new package was installed. Heavy chart runtimes and continuous Lab animation loops are absent; the shared particle component is unmounted on this route.

The experience, reference workbench and homepage entrance all follow the site's
56/22/18 typography. There are no typography exemptions or component-specific
font-size declarations. Larger numeric insights use the existing `type-display`
class. Narrow layouts adapt the grid and wrapping rather than the font scale.

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
- 84 automated reliability tests, including five library and five journey tests.
- Browser checks: staged Russian flow; successful dragging after scroll;
  English keyboard flow and focus order; repeat and restored entry focus;
  personalized contact draft (without submission); reference switching and saved
  collection after reload; 390px layout and computed 56/22/18 typography.
- Deployment remains on the existing Memora infrastructure. This frontend redesign does not close the remaining server/payment/updater findings recorded in the separate reliability audit.
