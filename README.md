# Ghost Hand Studio — v5 The Gates

Local v5 Forge, Train, Own, and Fleet interactions on the preserved Drain, ink treatment, compositor, and journey. Next.js App Router, strict TypeScript, R3F/drei, one four-effect composer, GSAP, Lenis, Zustand, Tailwind, and user-initiated Web Audio.

## Run locally

```sh
npm install
npm run dev
```

Development uses http://127.0.0.1:4174. To serve the reviewed production export instead:

```sh
npm run build
npm run check
npm run preview
```

Development and preview use the same port; run one at a time. The current review server is the static export at http://localhost:4174. No public deployment or domain change is part of this assignment.

## Review evidence

- [V5 BUILD RECEIPT](docs/gates-v5/BUILD-RECEIPT.md)
- [V5 STUB MANIFEST / next review](docs/gates-v5/STUB-MANIFEST.md)
- [V5 interaction and geometry checks](docs/gates-v5/geometry-checks.json) and [browser evidence](docs/gates-v5/browser-evidence.json)

- [V4 BUILD RECEIPT](docs/drain-v4/BUILD-RECEIPT.md)
- [V4 STUB MANIFEST / next review](docs/drain-v4/STUB-MANIFEST.md)
- [V4 geometry checks](docs/drain-v4/geometry-checks.json) and [browser evidence](docs/drain-v4/browser-evidence.json)

- [V3 BUILD RECEIPT](docs/ink-v3/BUILD-RECEIPT.md)
- [V3 STUB MANIFEST / next review](docs/ink-v3/STUB-MANIFEST.md)
- [V3 geometry checks](docs/ink-v3/geometry-checks.json) and [browser evidence](docs/ink-v3/browser-evidence.json)

- [BUILD RECEIPT](docs/foundation/BUILD-RECEIPT.md)
- [Dependency-ranked STUB MANIFEST](docs/foundation/STUB-MANIFEST.md)
- [D08–D14 builder choices](docs/foundation/ASSUMPTIONS.md)
- [Browser evidence](docs/foundation/browser-evidence.json)
- [Static checks](docs/foundation/static-checks.json) and [payload measurement](docs/foundation/payload.json)

Source authority: `BUILD-NOW.md` and `RESOLVED-DECISIONS.md` at `/Users/cougarceleste/Websites/ghost-hand-studio/inspo/ghost-hand-storyboard/00-builder-instructions/`. Approved D01–D07 supersede conflicting original wording. V5 was explicitly authorized after v4. Stop at the next human sanity gate before v6.

## Architecture

`Foundation` mounts the permanent Canvas and readable DOM Director. The shared GSAP heartbeat consumes input, advances Lenis/ScrollTrigger and timelines, copies parameters to DOM, uploads uniforms, and advances R3F through the persistent composer. ScrollTrigger's global housekeeping is disabled; its one persistent instance is manually updated. See the public-API integration tradeoff in ASSUMPTIONS.

Camera entrance parameters are separate from scroll progress. Generic 400ms overlaps never own Merge's locked cut. Threshold, Drain, and Merge use local GSAP timelines on the same heartbeat. Ceremony markers live only in `src/core/config.ts` under `TIMING`; the approved Merge timings are unchanged.

Drain uses 28 curved instanced filaments and actual raycast tracing into fourteen illustrative audit fixtures. A dedicated upward gesture or keyboard action starts a staggered body-to-anchor release and local candle-green dawn. Ordinary scrolling cannot release the threads; advancement waits for the dawn to settle. Reduced motion presents a static destination, including when the preference changes during release. The existing composer now uses 2× multisampling for filament-edge quality; its four effects and order remain intact.

Forge follows the cursor into three matching snap slots. Train accepts three characters, then the ghost writes and compiles an inert illustrative command. Own requires a real drag into a circular lock before the green 主 ignition. Fleet accepts upward flicks or longer deliberate sweeps and sends three authored hand studies into the chamber. Shared GSAP parameters drive each action and its World response; accepted actions settle before the next gate opens. Keyboard alternatives follow the same completion path. `npm run verify:gates` checks the board geometry, input recognition, authored field data, and visual clock/palette ownership.

The compositor control demonstrates fog density through the parameter/uniform pipeline without scrolling. The footer lists live owners, visited sword moments, and the separate shing allowance. `window.__GH_DEBUG.snapshot()` exposes local review evidence. No visitor progress or personal data is persisted.

## Temporary foundation fixtures

All fourteen journey states remain playable. Hand/sigil/slash SVG studies, monograms, geometry, shader screens, Drain examples, station meanings, relic descriptions, and synthesized tones are authored fixtures. The shared InkStroke uses pressure ribbons, wet-edge bleed, bristle texture, and tip dissolution. Drain's burdens are illustrative and never derived from visitor accounts. No membership, payment, account, commission order, or external agent is created. Canonical paths, prototype/brand sources, real member media, recordings, and production terms remain required inputs.

Keyboard alternatives and a static reduced-motion strip cover the same states. Pointer-lock, drag, WASD, and optional gyro plumbing exist; physical-device/gyro acceptance remains unmeasured. GPU FPS targets are unverified; heartbeat frequency is reported separately.

## Preserved portfolio

The earlier portfolio remains unchanged in `dist/`, with its original source at Git commit `038d956`. Run `npm run dev:portfolio` on port 4173. Its README is preserved in [docs/portfolio-v1.md](docs/portfolio-v1.md). V2 is preserved at `2bbcf1d`, v3 at `7e74901`, and v4 at `29484fd`. The existing `.openai/hosting.json` still identifies the earlier private Site; it has not been repurposed or published for v5.
