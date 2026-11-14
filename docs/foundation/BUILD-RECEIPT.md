# BUILD RECEIPT — Ghost Hand foundation v2

**Review date:** November 13, 2026, America/Los_Angeles. Machine JSON timestamps use UTC.

**Result:** local Phase 1 implemented and exported; ready for human sanity review. V3–v11, public launch, domain changes, checkout/auth/membership, production recordings, and marketing were not performed.

**Preview:** http://localhost:4174/ — production static export, left running.

**Preservation:** branch `codex/foundation-v2`; earlier portfolio `dist/` and `.openai/hosting.json` unchanged relative to baseline `038d956`. Its README is copied to `docs/portfolio-v1.md`. Source grimoire/reference files were not altered. No excluded bound-person imagery is used.

## Delivered foundation

- Next.js 16.4.6 App Router, strict TypeScript, static export, and the approved stack.
- Permanent R3F Canvas, shared particles/lighting/parameters, `useParam`, uniform upload, and one composer: Bloom → Vignette → FilmGrain/Noise → ChromaticAberration.
- One GSAP heartbeat: input → Lenis/ScrollTrigger → timelines → DOM/uniform adapters → R3F/composer. Lenis automatic RAF is off; R3F uses `frameloop="never"`. Global ScrollTrigger housekeeping is disabled and one pin/spacer instance is manually updated.
- All fourteen scene shells; guarded routes; four gate fixtures; deliberate Look up; two-half stroke Fork; environment-only Chains Hold; persistent 道/代 navigation; six Dojo shader fixtures; three relic fixtures; both isolated seals; Oath.
- Shared temporary hand paths/cursor, capped sound bus, synthesized tones, sound off by default, and output-disconnected ceremonial silence.
- Keyboard alternatives, scene-heading focus, static reduced-motion strip, self-hosted resources, and runtime/footer receipts.

## Checks and measured results

| Check | Evidence |
| --- | --- |
| Development boot | `npm run dev -- --port 4175` started Next/Turbopack and rendered Threshold, one Canvas, and the runtime receipt. Spare server stopped after verification. |
| Production build / export | `npm run build` passed and generated `out/index.html` and referenced assets. |
| TypeScript / source contracts | `npm run check` passed twelve checks: palette, no application RAF/interval, centralized keyframes/timing, one Canvas/composer declaration, local resources, trackers, excluded imagery, fixtures, export, and payload. |
| Referenced entry set | 1,203,950 raw bytes; 359,183 estimated gzip bytes. Lower bound that excludes some lazy code. |
| Conservative app-load bound | 2,296,233 raw bytes including HTML, all exported client assets, and diagnostic JSON; 708,828 estimated gzip bytes. Below the 4,000,000-byte target before compression. |
| Total export | 2,341,680 bytes, reported separately from initial payload. See `payload.json` for lists/method. |
| Fog proof | At scroll zero, GSAP changed density 0.36 → 0.85; GPU uniform reached 0.85. Live Canvas/composer/heartbeat counts stayed 1/1/1. |
| Native frame audit | Settled ~1.5-second audit: one recurring RAF callback (GSAP, 182 calls), one active RAF, zero intervals. ScrollTrigger startup callbacks had stopped; Playwright polling excluded. |
| Browser conditions | Chromium 157 automation, 1440×1000, DPR 1; ANGLE Metal renderer reported Apple M2 Max. |
| Observed heartbeat | Approximately 120 ticks/s. **Not a GPU/presentation FPS benchmark.** Desktop 60fps and mid-tier mobile 30fps acceptance remain unmeasured. |
| Requests / console | No remote HTTP resources; zero console errors in the final production run. One Three.js `Clock` deprecation warning remains. |
| Responsive widths | 320, 390, 768, 1440px: equal document/client widths, post-Fork nav present, one Canvas. Viewport checks do not establish physical-device performance. |

Payload values are filesystem measurements; gzip is a `node:zlib` estimate, not captured transfer. Installation reported zero npm vulnerabilities at that time.

## Locked Merge timing

Constants remain exact in `TIMING`; callbacks are quantized to browser frames. Final visible-tab wall observations:

| Marker | Scheduled seconds | Observed wall seconds |
| --- | ---: | ---: |
| Summon | 0.400 | 0.4080 |
| Hand start | 1.600 | 1.6073 |
| Sword start | 3.800 | 3.8071 |
| Flash start | 6.900 | 6.9063 |
| Cut start / silence | 7.000 | 7.0063 |
| Cut end | 7.350 | 7.3561 |
| Flash end | 7.400 | 7.4046 |
| Fork visible and interactive | 8.000 | 8.0060 |

At local 7.05s, flash was 0.70 and cut was 0.625 while Merge remained active, nav locked, and Fork DOM absent. At local 7.106s in the final audio run, master output was disconnected, gain was 0, and silence active. No connected-output silence violations were recorded. An earlier gain-only mute failed its diagnostic and was replaced; final routing evidence supersedes that earlier run.

Visible elapsed timeline time is not clamped. Hidden-tab time pauses the story clock; interrupted journeys are not claimed to take eight wall seconds.

## Journey and input observations

- Ordinary Drain scrolling did not release filaments. Upward pointer and ArrowUp inputs both released them without rotating FALL.
- Four craft gates completed through keyboard alternatives; the terminal also accepted actual typed characters.
- Plain Fork click did not commit. Space → ArrowDown → Enter entered Chains Hold. Its green door returned to Fork, and both persistent paths remained available.
- Pointer stroke entered Dojo. WASD moved its bounded camera; drag changed camera by approximately x=0.444, z=0.133. Physical pointer-lock/gyro/mobile feel still needs human review.
- Dojo seal accepted a keyboard stroke; Commission seal accepted a pointer stroke. Crimson remains in those two permitted locations.
- Dojo → Oath visited four distinct allowed sword moments: opening glint, Pursuit, Merge, sheathed Oath. Visiting Commission afterward added its handover, giving five on that actual route. Neither is a required total.
- A fresh Fork → Commission → Oath route never visited Chains Hold and committed neither seal. Shing stayed capped at three.
- Escape cancelled an armed stroke; Enter afterward left the visitor at Fork.
- Replay returned to Threshold, locked nav, cleared gates/sword history/shing count, and reset the opening gate; sound preference remained.
- Reduced motion displayed a static fourteen-state strip, hid Canvas/flash/cut presentation, retained keyboard advancement and Look up, and focused the next heading. The settled state had one mounted Canvas; an early pre-lazy-chunk snapshot with zero canvases was not the settled result.

Sword accounting is distinct permitted story moments visited, not every repaint/revisit. Muted accepted shing cues consume the provisional allowance. D08–D14 choices and visitor-facing tradeoffs are documented in `ASSUMPTIONS.md`, not represented as approved amendments.

## Remaining fixtures and limits

Canonical hand/prototype/brand inputs, real portraits, production gate mechanics, instanced/raycast Drain refinement, six real member videos, final catalog/terms, recordings, detailed Dojo art, and physical mobile performance remain outstanding. See the dependency-ranked `STUB-MANIFEST.md`. Drain is currently line geometry plus DOM audit, not the later instanced/raycast implementation. A shared InkStroke fixture now provides uniform-driven line draw and basic tip-particle dissolution. Production wet-edge pressure/bleed, canonical paths, and refined dissolution remain v3 work, not finished fidelity claims.

Cache recovery cleared regenerable npm/pnpm/node-gyp/pip/Python/Homebrew caches. Project files/media were retained. Installed dependencies and export remain; available disk space was approximately 1.8 GiB after the final npm-cache cleanup, before transient build-cache cleanup.

**Human sanity gate:** review this local journey and assumptions. Stop before v3. No public launch performed.

BUILT BY GHOST HANDS
