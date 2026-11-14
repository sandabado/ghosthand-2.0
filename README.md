# Ghost Hand Studio — v6 The Cut, Mastered

A scrolling chapter journey with cinematic Pursuit, locked Merge, a spring-driven Fork, and a single green return doorway. V6 preserves the Drain, ink treatment, and four playable Craft gates. Next.js App Router, strict TypeScript, R3F/drei, one four-effect composer, GSAP, Lenis, Zustand, Tailwind, and user-initiated Web Audio.

## Run locally

```sh
npm install
npm run dev
```

Development uses http://127.0.0.1:4174. To serve the reviewed production export instead:

```sh
npm run build
npm run check
npm run verify:cut
npm run preview
```

Development and preview use the same port; run one at a time. The current review server is the static export at http://localhost:4174. Source synchronization targets [sandabado/ghosthand-2.0](https://github.com/sandabado/ghosthand-2.0), with v6 on `main` and `codex/cut-v6`. Website hosting remains local; no public website deployment or domain change is part of this assignment.

## Review evidence

- [V6 BUILD RECEIPT](docs/cut-v6/BUILD-RECEIPT.md)
- [V6 STUB MANIFEST / next review](docs/cut-v6/STUB-MANIFEST.md)
- [V6 stroke, spring, travel, and geometry checks](docs/cut-v6/geometry-checks.json) and [browser evidence](docs/cut-v6/browser-evidence.json)

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

Source authority: `BUILD-NOW.md` and `RESOLVED-DECISIONS.md` at `/Users/cougarceleste/Websites/ghost-hand-studio/inspo/ghost-hand-storyboard/00-builder-instructions/`. Approved D01–D07 supersede conflicting original wording. V6 and scroll-only next-stage travel were explicitly authorized after v5. Stop at the next human sanity gate before v7.

## Architecture

`Foundation` mounts the permanent Canvas and readable DOM Director. The shared GSAP heartbeat consumes input, advances Lenis/ScrollTrigger and timelines, copies parameters to DOM, uploads uniforms, and advances R3F through the persistent composer. ScrollTrigger's global housekeeping is disabled; one live instance is manually updated and recreated only when motion-preference pinning changes. See the public-API integration tradeoff in ASSUMPTIONS.

Camera entrance parameters are separate from scroll progress. Generic 400ms overlaps never own Merge's locked cut. Threshold, Drain, and Merge use local GSAP timelines on the same heartbeat. Ceremony markers live only in `src/core/config.ts` under `TIMING`; the approved Merge timings are unchanged.

Scroll cues replace Next-stage buttons. Wheel, native touch scrolling, and PageDown move the story forward only when the current scene is ready, its content is finished, entry has settled, and a fresh downward input arrives. Buffered momentum cannot skip a new chapter or spend an unfinished rite. The Drain, gate interactions, and Fork choice retain their own deliberate controls; scrolling over Fork copy does not select a branch. Dojo and Commission scroll to Oath, while Chains Hold scrolls through its doorway back to Fork.

Pursuit carries the blade through authored cloud/streak fields. Merge adds fog light spill and a flash-bound spike on the existing Bloom effect, keeping the four-effect order intact. The Fork is interactive at the approved 8.0s marker; its two halves hinge around a graphic blade-line using a damped spring. Dedicated grip buttons accept a 40px net stroke, or Space → ArrowDown → Enter, before the rejected half collapses into particles. The holding room has one physical green portal, with a static DOM replacement when reduced motion hides the World. `npm run verify:cut` checks the stroke, spring, travel guards, approved timing contract, field geometry, and shared visual ownership.

Drain uses 28 curved instanced filaments and actual raycast tracing into fourteen illustrative audit fixtures. A dedicated upward gesture or keyboard action starts a staggered body-to-anchor release and local candle-green dawn. Ordinary scrolling cannot release the threads; advancement waits for the dawn to settle. Reduced motion presents a static destination, including when the preference changes during release. The existing composer now uses 2× multisampling for filament-edge quality; its four effects and order remain intact.

Forge follows the cursor into three matching snap slots. Train accepts three characters, then the ghost writes and compiles an inert illustrative command. Own requires a real drag into a circular lock before the green 主 ignition. Fleet accepts upward flicks or longer deliberate sweeps and sends three authored hand studies into the chamber. Shared GSAP parameters drive each action and its World response; accepted actions settle before the next gate opens. Keyboard alternatives follow the same completion path. `npm run verify:gates` checks the board geometry, input recognition, authored field data, and visual clock/palette ownership.

The compositor control demonstrates fog density through the parameter/uniform pipeline without scrolling. The footer lists live owners, visited sword moments, and the separate shing allowance. `window.__GH_DEBUG.snapshot()` exposes local review evidence. No visitor progress or personal data is persisted.

## Source and fixture limits

All fourteen journey states remain playable. Hand/sigil/slash SVG studies, cloud/sword/room geometry, shader screens, Drain examples, station meanings, relic descriptions, and synthesized tones are authored work or illustrative fixtures. The hand remains the identified v3 study, not supplied canonical art. Drain's burdens are never derived from visitor accounts. Train executes no command, and Fleet launches no external agents. No membership, payment, account, or commission order is created. Canonical paths, prototype/brand sources, real member media, recordings, and production terms remain required inputs.

Keyboard alternatives and a static reduced-motion strip cover the same states. Pointer-lock, drag, WASD, and optional gyro plumbing exist; physical-device/gyro acceptance remains unmeasured. GPU FPS targets are unverified; heartbeat frequency is reported separately.

## Preserved portfolio

The earlier portfolio remains unchanged in `dist/`, with its original source at Git commit `038d956`. Run `npm run dev:portfolio` when port 4173 is available. Its README is preserved in [docs/portfolio-v1.md](docs/portfolio-v1.md). The standalone 4173 source is also synchronized to [ghost-hand-studios / codex/localhost-4173](https://github.com/sandabado/ghost-hand-studios/tree/codex/localhost-4173) at `ba9eb7c`, with that repository's earlier `main` preserved.

V2 is preserved at `2bbcf1d`, v3 at `7e74901`, v4 at `29484fd`, and v5 at `b6c6db3`. The existing `.openai/hosting.json` still identifies the earlier private Site; it has not been repurposed as v6 hosting configuration.
