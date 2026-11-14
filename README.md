# Ghost Hand Studio — foundation v2

Local Phase 1 of the approved cinematic grimoire. Next.js App Router, strict TypeScript, R3F/drei, one four-effect composer, GSAP, Lenis, Zustand, Tailwind, and user-initiated Web Audio.

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

- [BUILD RECEIPT](docs/foundation/BUILD-RECEIPT.md)
- [Dependency-ranked STUB MANIFEST](docs/foundation/STUB-MANIFEST.md)
- [D08–D14 builder choices](docs/foundation/ASSUMPTIONS.md)
- [Browser evidence](docs/foundation/browser-evidence.json)
- [Static checks](docs/foundation/static-checks.json) and [payload measurement](docs/foundation/payload.json)

Source authority: `BUILD-NOW.md` and `RESOLVED-DECISIONS.md` at `/Users/cougarceleste/Websites/ghost-hand-studio/inspo/ghost-hand-storyboard/00-builder-instructions/`. Approved D01–D07 supersede conflicting original wording. Stop at the human sanity gate before v3.

## Architecture

`Foundation` mounts the permanent Canvas and readable DOM Director. The shared GSAP heartbeat consumes input, advances Lenis/ScrollTrigger and timelines, copies parameters to DOM, uploads uniforms, and advances R3F through the persistent composer. ScrollTrigger's global housekeeping is disabled; its one persistent instance is manually updated. See the public-API integration tradeoff in ASSUMPTIONS.

Camera entrance parameters are separate from scroll progress. Generic 400ms overlaps never own Merge's locked cut. Threshold and Merge have independent local clocks. Ceremony markers live only in `src/core/config.ts` under `TIMING`.

The compositor control demonstrates fog density through the parameter/uniform pipeline without scrolling. The footer lists live owners, visited sword moments, and the separate shing allowance. `window.__GH_DEBUG.snapshot()` exposes local review evidence. No visitor progress or personal data is persisted.

## Temporary foundation fixtures

All fourteen journey states are playable shells. Hand curves, monograms, geometry, shader screens, Drain examples, station meanings, relic descriptions, and synthesized tones are fixtures. No membership, payment, account, commission order, or external agent is created. Canonical paths, prototype/brand sources, real member media, recordings, and production terms remain required inputs.

Keyboard alternatives and a static reduced-motion strip cover the same states. Pointer-lock, drag, WASD, and optional gyro plumbing exist; physical-device/gyro acceptance remains unmeasured. GPU FPS targets are unverified; heartbeat frequency is reported separately.

## Preserved portfolio

The earlier portfolio remains unchanged in `dist/`, with its original source at Git commit `038d956`. Run `npm run dev:portfolio` on port 4173. Its README is preserved in [docs/portfolio-v1.md](docs/portfolio-v1.md). The existing `.openai/hosting.json` still identifies that earlier private Site; it has not been repurposed or published for v2.
