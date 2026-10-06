# Attention Lab

The Lab currently opens with a local-review scroll-through 3D tunnel. A single
native scroll journey moves the camera through an authored metallic lattice.
Pointer movement changes the view; a collaboration invitation appears at
the end. This replaces the previous five-step configurator. The homepage
entrance follows the project gallery. The existing `/attention-lab` route and
bilingual content remain supported. The reference/infographics shelf, collection,
copyable brief and installation snippets were removed from the Lab interface at
the user's request. Its source modules remain archived locally; the page has no
import or rendering path to them, including old `?example=` / `#playground` URLs.

## Scroll-through tunnel prototype (October 6, 2026)

- The prototype uses the existing Three.js dependency, procedural instanced
  architecture, physically lit materials, generated room environment and capped
  resolution. Lusion informed the layered DOM/canvas architecture, lighting and
  continuous visual response; all geometry and scene code are original. No
  Lusion code, models, textures or fonts are included.
- A full-viewport sticky canvas replaces the light card, panels, stage navigation,
  sliders and explanatory paragraphs. The entry heading fades during the first
  tenth of the passage. The middle of the journey is entirely visual. The only
  persistent controls are the compact site-header actions. The pause button was
  removed at the user's request; the middle contains no scene-specific buttons.
- Fifty-two architectural sections form a dark rectangular corridor, then
  reveal a hexagonal gallery, a triangular hall with faceted forms and a curved-rib spiral. Spatial
  chapter weights blend neighboring families along the flight path, rather than
  displaying one repeated form for the whole journey. Cold highlights transition into blue
  and pink light. An original continuous metallic sculpture holds the central
  focal point, grows at arrival and accompanies the invitation. This is an
  original implementation inspired by the reference, rather than a pixel-exact
  copy or the Lusion astronaut asset.
- The layout uses 2,080 main struts, 1,664 secondary metal strips, 416 luminous
  accents and 416 wall modules in eleven instanced batches. The wall modules use
  authored beveled polygonal panels, hexagonal rings, octahedra and curved metal arcs with separate
  materials. Secondary strips are hidden on narrow
  layouts. Noise is seeded; geometry updates only when scroll progress changes.
  Tests sample every strut through the morph and retain a 4.5-unit central
  corridor, including space for the focal sculpture's final enlargement. Added
  wall modules are checked with conservative transformed bounding spheres for
  central clearance and separation from one another throughout the morph.
- The enclosure now has 616 recessed cassettes (50,784 desktop / 34,272 narrow-layout triangles) in three
  material groups: machined rim, bevel return and dark inset. Spatial chapters
  use clipped rectangular, hexagonal and faceted plates, then open curved
  loops. Apertures reveal a separate service layer and the original wall forms,
  which were moved outward to maintain separation from the new shell. Tests
  check their conservative bounds against actual cassette triangles in five
  sampled morph poses, retaining a minimum quarter-unit gap.
- Two rectangular area lights and generated elongated reflection cards give
  the metal broad highlights. Rim and return materials have directional
  anisotropy, while inset plates remain matte. Curved loops use continuous
  normals with 48 circumferential segments desktop / 24 narrow layouts; geometry
  replacement on breakpoint changes disposes the preceding surface. Spacious chambers interrupt the
  passage; the final room opens and the field of view eases from 62 to 58 degrees
  (76 to 72 on narrow layouts). Geometry remains clear of the central flight path.
- Shell corner profiles are cached; updates rotate shared corners and reuse
  typed GPU buffers rather than rebuilding geometry. Idle rendering still stops.
  A local CPU-only sample of the final desktop shell update averaged about 11ms; this is
  not a browser frame-rate or physical-phone performance measurement. The
  immutable area-light lookup tables load in a separate lazy cached chunk,
  initialized once across route visits. Cancellation after this additional
  import destroys the completed instance before updating an unmounted page.
- The clean postprocessing chain uses multisampled half-float scene targets
  (up to 4 samples desktop / 2 mobile, bounded by driver support), restrained bloom,
  a soft vignette, output color conversion and final output-space FXAA. Canvas
  and composer share their resolution: up to 2x desktop / 1.5x mobile, with
  a 4-million / 1-million pixel cap. Desktop 1x displays get modest supersampling
  when the pixel budget permits. Grain and chromatic edge dispersion were removed.
  Near-camera lamps taper smoothly and metal roughness reduces sparkling highlights.
  GPU render targets and all passes are disposed on route exit.
- Main structural struts share a lightly beveled 108-triangle unit; secondary
  strips retain their 12-triangle box. The reflective focal sculpture uses a
  controlled clearcoat and a brighter generated environment. This adds edge
  highlights while retaining instanced rendering and corridor bounds.
- The Lab alone uses an overlaid transparent header with compact navigation,
  a direct discussion link and the existing language switch. Menu links preserve
  the site's routes; Escape closes the Lab menu and restores its button focus.
- Reverse scrolling retraces the journey and restores the entry. There is no
  compulsory clicking, forced duration, countdown or measured dwell-time claim.
- The scroll track is 2,400svh desktop / 1,800svh mobile (previously 1,400 / 1,100),
  increasing traversable scroll distance by approximately 77% / 70%. The physical
  flight path is now 180 units (previously 108), with architecture extending
  beyond the final camera position. The architecture morph
  unfolds from 20% to 72%; the final approach starts at 88%. The visitor controls
  the pace. Reduced motion retains its separate 240svh track.
- Animation follows native scroll and pointer interaction, then settles after
  approximately one second of frame time. At rest, rendering stops throughout
  the journey, as well as offscreen and when the document is hidden. Reduced motion uses a fixed camera,
  event-driven lighting changes and a shorter scroll track, with the same CTA.
- Native scrolling, touch `pan-y`, Home/End/PageDown and browser history remain
  available. Scroll listeners are passive; no wheel interception or scroll lock
  is installed. An early keyboard-focusable contact link offers a direct path.
- The invitation appears at 94% scroll progress. It uses one concise heading and
  a contact link; scrolling back hides it. Its appearance keeps keyboard focus
  where the visitor placed it. The existing full 56px entry heading is preserved.
- The contact link carries a fixed validated `labGoal=act` ID. The existing
  contact form creates an editable
  draft from that ID; payment, consent, API and submission behavior stay unchanged.
- A loading/error state remains explicit. A WebGL failure shortens the track and
  exposes the contact link immediately. GPU geometry, materials, environment,
  scroll callbacks and observers are disposed
  on route exit. React effect cancellation also handles an unfinished lazy load.
- The full journey now ends on the final invitation. Removing the reference shelf
  also removes its bottom padding, leaving the final scene full-viewport at End.
  Existing browser-saved selections are untouched; the Lab no longer reads them.

## Archived reference library: research → product decisions

| Reference | Observed pattern | Application here |
| --- | --- | --- |
| [FT Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary) | Chart families start from the relationship in the data: ranking, change, part-to-whole, flow. | Four question-led studies; shared scales and honest zero baselines. |
| [The Pudding: Dicing an Onion](https://pudding.cool/2025/08/onions/) | Readers adjust a model and compare its visible result; explanations expand with the experiment. | Direct manipulation, immediate selected-value feedback, technique explanation beside the study. |
| [Seeing Theory: Basic Probability](https://seeing-theory.brown.edu/basic-probability/index.html) | Small actions reveal one concept at a time. This resource is archived. | One compact interaction per study; keyboard-accessible controls and exact data tables. |
| [Vega-Lite examples](https://vega.github.io/vega-lite/examples/) | Reusable examples with declarative specifications. | Keep authored data separate from renderers and expose useful references for future projects. |

These are design interpretations, not measured conversion claims or copies of the source designs. All four datasets are authored demonstrations. The Lab makes no claim that a particular highlight improves a real customer's conversion.

The following library notes describe archived source modules, not current Lab UI.

## Structure

- `src/shared/AttentionPortal.jsx`: once-only scroll reveal of a chart sheet, ordinary link into the experience; reduced-motion support.
- `AttentionLabPage.jsx` / `AttentionJourney.css`: bilingual sticky scene shell,
  minimal entry/final overlays and motion utility.
- `AttentionSculpture.jsx`: cancellable lazy graphics import, loading/fallback
  state and React lifecycle bridge.
- `sculptureRenderer.js` / `sculptureMath.js` / `sculptureGeometry.js` / `latticeMath.js` / `tunnelShell.js`: Three.js scene, original shared geometry, deterministic architecture, continuous camera
  path, bounded scroll/pointer mapping, damping, capped resolution and GPU cleanup.
- `journey.js`: preserved bilingual goals and validated contact handoff, shared
  with the existing contact form; previous reducer helpers remain compatible.
- `src/pages/AttentionLab/labData.js`: bilingual datasets, reference catalog, safe selection parser, derived insights, text brief.
- `LabWorkbench.jsx`: native buttons, CSS bars and responsive SVG line geometry; exact-value table.
- `ReferenceLibrary.jsx`: study selection in `?example=`, device-local collection, copy status and manual fallback, secondary tool reference.
- `AttentionLabPage.css`: dark Memora shell, light chart sheet, responsive controls.
- `tests/attention-lab.test.mjs`: data integrity, insight arithmetic, saved-selection validation and reusable briefs.
- `tests/attention-journey.test.mjs`: all three goal paths, stage guards, restart,
  safe bilingual contact drafts, drag boundaries and typography/motion contracts.

The library studies render with React, CSS and SVG. Vega-Lite, Altair, Observable Plot, matplotlib and AntV are reference options for future work, not hidden runtime dependencies. No new package was installed. Three.js loads asynchronously for the tunnel; the shared background particle component remains unmounted on this route.

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
- 105 automated reliability tests, including five library, five legacy journey/
  contact contracts and twenty-one tunnel geometry/clearance/choreography/mapping/camera/lifecycle/render-quality tests.
- Browser review covers forward/reverse scroll, the text-free middle, the final
  invitation, keyboard Home/PageDown/End, Russian/English, stable idle frames,
  a 390px layout, a single root scroller and computed 56/22/18 typography.
- Physical phone performance remains a review step. Viewport checks validate
  layout, rather than claiming a measured frame rate on a real device.
- Deployment remains on the existing Memora infrastructure. This frontend redesign does not close the remaining server/payment/updater findings recorded in the separate reliability audit.
