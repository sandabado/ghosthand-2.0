# V3 — THE INK / BUILD RECEIPT

November 13, 2026, America/Los_Angeles. The user authorized v3, local only, after the v2 review gate. V4 and later incantations have not been started.

**Local preview:** http://localhost:4174/ — left running. Sources are on `codex/ink-v3`; v2 remains preserved at `2bbcf1d`, and the original portfolio remains in `dist/` and `038d956`.

## Result

The hand is rendered as loaded brush pigment rather than one-pixel vectors. Authored open finger centerlines replace hollow finger loops; wider palm/wrist masses establish the anatomy. Fine tendon/crease strokes remain inside the broader painted forms. These are identified v3 studies, **not supplied canonical paths or an approved replacement identity**.

The same SVG-to-world utility now powers the hand, a brush-glyph sigil study, and headline slashes. It centers the SVG viewBox, flips Y, samples arc length, preserves stroke metadata, and allocates one cumulative reveal range across all subpaths. Pressure-tapered ribbon meshes carry longitudinal UVs, reveal coordinates, seeded variation, and pressure attributes.

The material has a dense matte bone/green body, darker pigment pooling, broken bristle tracks, capillary bleed, and a restrained candle wet rim. Pigment stays fixed in stroke space; it does not boil with time. Four derivative-filtered noise samples replaced the first pass's eight unfiltered samples. Seeded tip motes lift away during drawing and disappear as the existing tip-decay parameter settles.

The compositor drawer adds local wet-bleed and pressure controls. Both tween shared parameters through GSAP and upload to the existing material uniform pipeline. The pressure control adjusts pigment load; the authored geometry separately supplies the width/pressure profile along each stroke.

## Preserved contracts

- No new animation clock, requestAnimationFrame loop, composer, grade effect, camera verb, scene, sword moment, or palette token.
- The existing Threshold/Merge hand draw remains 1.6–3.8 seconds. All approved ceremony constants are unchanged in `TIMING`.
- The Merge flash/cut overlap, silence interval, and 8.0-second interactive Fork remain intact.
- A frozen completed previous hand fades through the existing 400ms overlap; it does not restart another ink timeline. Merge → Fork still bypasses generic overlap.
- The animated World hand and the static reduced-motion companion never display together. The first render exposed an overly broad fallback selector; that selector was removed.
- Normal alpha blending carries the pigment, with additive blending confined to small tip motes. Resources have explicit disposal ownership, with R3F automatic double disposal disabled for those shared resources.

## Checks and observations

| Check | Actual evidence |
| --- | --- |
| Strict TypeScript and static export | `npm run typecheck`, `npm run build`, and `npm run check` pass. |
| Focused ink checks | Nine checks pass: finite topology/attributes, reveal bounds, pressure taper/variance, width footprint, determinism, reversed/duplicate samples, degenerate input, particle attributes, and shared clock/grade ownership. See `geometry-checks.json`. |
| SVG browser parsing | Hand: 26 parsed subpaths from 24 SVG path nodes. Sigil: four. Slash: one. Each source's reveal starts at 0 and ends at 1; source metadata/bounds are recorded in the runtime receipt. |
| Material pipeline | A keyboard-driven wet-bleed slider reached parameter 1.5 and live material uniform 1.5. Independent pressure/bleed changes also matched live uniform samples. |
| Live resource lifecycle | Desktop Threshold: 31 strokes, 5,022 ribbon vertices, 7,533 tip seeds. After the overlap, Legend retained one stroke / 162 vertices / 243 seeds. Fork retained zero ink resources. These are live allocation counts, not GPU draw-call claims. |
| Shared compositor | Live clock / Canvas / composer stayed 1 / 1 / 1. A settled native callback audit recorded one recurring GSAP callback, one active RAF, and zero intervals. |
| Timing regression | Hand was exactly 1 at local 3.8s. Final observed Fork wall time was 7.9996s for the scheduled 8.0s marker. Callback quantization put the 7.35s cut-end callback at 7.3671s in this run; constants were not retimed. |
| Audio silence | At local 7.101s, silence was true, output disconnected, gain 0, and nav still locked. |
| 390px viewport | Document/client widths both 375px after the reserved scrollbar gutter; one Canvas and 30 ink strokes. The desktop-only headline slash is omitted from this narrow composition. |
| Reduced motion | One mounted Canvas hidden from presentation; static authored SVG visible; all 14 storyboard states retained. Keyboard advancement reached Legend and focused its H2. No stroke or camera animation is shown. |
| Requests / console | No remote HTTP resources in the journey run. Zero console errors; the existing Three.js Clock deprecation warning remains. |

Frame instrumentation sampled approximately 30 ticks/s in this automation session both with the full hand and with one slash, and also with the World hidden for reduced motion. This does **not** establish GPU FPS or physical-device acceptance, and no desktop/mobile target is claimed. The earlier v2 run had different observed browser cadence; it is not reused as a v3 performance measurement.

## Payload

Filesystem measurement of the final export:

- Root HTML + directly referenced entry resources: **1,214,074 bytes raw**, **362,097 bytes estimated gzip**. This is a lower-bound entry set.
- Conservative application-load bound including all exported client code/assets and diagnostic JSON: **2,339,440 bytes raw**, **723,212 bytes estimated gzip**. Below the 4,000,000-byte target before compression.
- Total export: **2,384,887 bytes**, reported separately from initial payload.

Gzip values are `node:zlib` estimates, not captured network transfer. Full lists and methods are in `payload.json`. V2's original measurement has been preserved separately as `docs/foundation/v2-payload.json`.

## Review inputs and remaining work

The canonical hand SVGs, prototype v0, and final brand paths remain absent. The hand/sigil/slash sources in this build are authored local studies, and their anatomy/material remain subject to the human visual review. Reduced-motion presentation uses the same authored silhouette as a static companion rather than simulating wet shader movement.

Physical mobile GPU performance and final production ink art remain unaccepted. Drain instancing/raycast, finished gate mechanics, Dojo expansion, production recordings, commerce, and launch remain later scope. See `STUB-MANIFEST.md`.

**Human sanity gate:** review the local hand, draw, drying edge, and material controls. Stop before v4.

BUILT BY GHOST HANDS
