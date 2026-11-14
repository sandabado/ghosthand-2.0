# V5 — THE GATES / BUILD RECEIPT

November 14, 2026, America/Los_Angeles. The user authorized v5 after v4 and kept the work local. V6 and later incantations have not been started.

**Local preview:** http://localhost:4174/

**Final verification status:** closed for local human review. Production export, strict TypeScript, 13 source/export checks, 12 gate checks, nine ink regression checks, nine Drain regression checks, and the browser journey pass. Physical-device GPU targets remain unmeasured.

**Final source checkpoint:** `codex/gates-v5`; the local commit containing this receipt is the v5 checkpoint.

V4 remains preserved at `29484fd`, v3 at `7e74901`, v2 at `2bbcf1d`, and the original portfolio at `038d956` and in `dist/`. Their receipts remain historical evidence; no prior measurement is promoted into this build's acceptance. No public deployment, DNS change, account, payment, order, or external-agent action belongs to this assignment.

## Four playable chambers

The Craft sequence now has four distinct local interactions. Each chamber retains its own existing `tlPass` forward dolly, while its artifact responds through shared parameters. The readable DOM boards remain usable when the World presentation is hidden for reduced motion. Completion is separate from acceptance: a successful input begins a rite, and the next gate stays closed until that rite settles.

### 鍛 Forge

Three loose strands follow the cursor from their grab points. Each has one corresponding numbered socket. A release must land near that socket; travel alone does not seat it, and another strand's socket is not an alternative destination. Missed or cancelled drags return home. A valid release snaps into its structure with a short shared-parameter settle, green/bone response, and local motes. Three distinct settled strands complete Forge.

The board and hit helpers share normalized source and target anchors. Pointer grab offsets keep the held point attached to the cursor. Matching tolerance is `max(20px, 0.095 × min(board width, board height))`, evaluated in physical board pixels after normalized coordinates are converted. Keyboard activation of a strand and the explicit next-strand alternative invoke the same accepted destination and settle.

### 修 Train

One or two entered characters leave the terminal waiting. The third starts authored ghost completion, visibly written from `trainReveal`; the compile response follows through `trainCompile`. The next gate waits for the writing and compile sequence to finish.

The input rule is the first three Unicode code points after ASCII controls are removed and the outer whitespace is trimmed. This implements the three-keystroke motif through usable text rather than counting physical keydown events. Paste uses the same rule. Input is not accepted midway through IME composition; composition completion is normalized through the same entry point. Ghost text is revealed by Unicode code point so a non-BMP character is not sliced into half a surrogate pair.

The command is an authored local demonstration, not model inference, code execution, or a saved training job. The entered seed is rendered as inert text inside the illustrative command. No command is evaluated or sent to a provider.

### 主 Own

An abstract tool follows the visitor's grip into the sovereignty circle. A bare press or pointer-up is insufficient. The source must have an active drag, total travel must be at least 20px, and the release must be within the actual circle. A release in a corner of the ring's rectangular bounds still misses the circle. Failed drags return home.

The ring is centered at normalized board position `(0.66, 0.42)`, with radius `0.22 × min(board width, board height)`. Its displayed diameter uses the same minimum dimension through board container units. On acceptance, the tool seats, the ring closes, and 主 ignites in candle green and bone. The tool is an abstract geometric artifact, not a blade or another sword moment. Keyboard activation and the explicit placement alternative reach the same lock destination.

### 霊 Fleet

Three hands can be taken and sent upward into the dark. A valid flick rises at least 48px, rises more than `1.15 × abs(horizontal travel)`, and finishes within 750ms. A deliberate longer upward sweep of at least 96px also qualifies without the short-duration requirement. Clicks, short movement, downward travel, and predominantly sideways travel do not dispatch.

An accepted hand flies from its release point, with an upward/depth route, trail, and local particle burst. Each hand can be accepted and settled only once. All three distinct flights must settle before Fleet opens the route into the existing Pursuit. Native keyboard activation and the explicit next-hand alternative dispatch through the same local action. No external agents are launched.

## Shared ownership and approved rules

- D01's allowed sword moments and the separate shing allowance remain unchanged. Craft adds no full sword or shing cue.
- D02 permits local typing, snap, lock, ignition, flight, and particle effects. These consume the existing shared GSAP heartbeat; no gate creates a timer, RAF, camera verb, Canvas, or composer.
- D03's locked Merge schedule remains separate from `TIMING.gates`. Threshold's opening clock, Merge's hand/sword/flash/cut sequence, 7–8s all-audio silence, and 8.0s interactive Fork are not retimed by v5.
- D06 confines Craft to the existing candle green, bone, smoke, and void palette. Forge uses no amber, orange, or gold. Enemy blue and crimson are not Craft accents. The Own ignition is green/bone, not one of the crimson rituals.
- The persistent grade remains Bloom → Vignette → FilmGrain/Noise → ChromaticAberration, with the inherited 2× MSAA on that one composer. No gate-owned grade or fifth effect is introduced.
- World fields are authored geometry. The Fleet World uses the existing identified v3 hand study, not newly supplied canonical artwork. Frozen previous-scene artifacts fade through the existing overlap rather than starting another local interaction.

The authored World instance budgets are 60 / 87 / 125 / 61 bars for Forge / Train / Own / Fleet, with 384 / 192 / 192 / 384 local motes. Fleet also merges three copies of the existing hand study into one hand mesh. These are source/CPU counts; final live lifecycle counters and GPU observations are recorded separately below.

## Builder pacing and input choices

These values are reviewable builder choices, not individually ratified changes to D01–D07. Gesture thresholds, board anchors, tolerance, and composition live in the shared gate contracts; timing lives in `TIMING.gates`.

| Local effect | Builder timing |
| --- | ---: |
| Drag feedback smoothing | 0.07s |
| Missed/cancelled drag return | 0.28s |
| Forge snap settle | 0.52s |
| Ghost writing | 2.2s |
| Train compile settle | 0.48s |
| Own lock/ignition | 1.05s |
| Fleet flight | 0.95s |
| Local feedback pulse | 0.32s |

Callbacks remain quantized to browser frames. A scheduled timeline duration is not a sub-frame physical timing claim.

## Input, cancellation, and reduced motion

Draggable controls use primary-pointer capture with an explicit source press. Movement and release are associated with that pointer. Cancellation, lost capture, blur, and Escape clear partial input; repeated actions cannot count a strand, lock, or hand twice. `touch-action: none` is confined to the draggable controls, while scrolling elsewhere remains ordinary page or panel scrolling.

Each drag control supports Enter/Space and is paired with a discoverable native button alternative. Train uses a labeled native text input. Controls are designed with at least 44px hit targets, visible focus, and discrete accessible statuses; final rendered dimensions and keyboard behavior require the browser observations below.

Reduced motion keeps all four outcomes and the fourteen-state storyboard. Accepted Forge strands, an already-started Train command, an accepted Own lock, and accepted Fleet hands settle directly into their static destinations. A preference change does not invent work that was never accepted: untouched strands, an idle terminal, an unclaimed tool, and unsent hands remain incomplete. Any active uncommitted drag returns to its static home state. The World can remain mounted for shared lifecycle ownership while hidden from presentation.

Replay resets accepted/settled arrays, seed and phase, lock state, continuous gate parameters, and gate event evidence. Scene exit stops local rites and disposes that scene's World resources. Final replay and resource observations are recorded separately from this source contract.

## Primary failure and correction

The first browser pass exposed a GPU shader compilation failure caused by the reserved GLSL identifier `active`. The compiler reported `ERROR: 0:84: 'active': Illegal use of reserved word`, an `active` syntax error, and the link failure `Vertex shader is not compiled`. TypeScript and static export had not caught that GPU-language error. That run remains failed evidence; it is not waived or counted as acceptance.

The two affected vertex shaders were corrected to use `activeStrand` and `activeHand`. After a fresh build and reload, Forge compiled with `window.__glChecks = []`, zero console errors, and only the pre-existing Three.js Clock deprecation warning. This closes the first Forge correction check; it does not substitute for compiling and playing all four gate fields.

**Failure/correction evidence:** the original failed render is [preserved](captures/first-shader-failure.png); the compile/link error and corrected fresh runs are recorded in [browser-evidence.json](browser-evidence.json).

**Fresh all-four-gate GPU/browser proof after correction:** compile/link instrumentation returned `[]` through all four chambers. The final export's browser run had zero errors and one existing dependency warning for deprecated `THREE.Clock`.

The first final source audit also failed: its broad numeric scan mistook a 6.9-unit torii-post height for a ceremony timestamp. [That failed report](first-static-checks-failure.json) is retained. The audit now checks marker duplication in clock-owning/ceremony code and explicitly compares all Merge values with approved D03. No geometry dimension or ceremony timing was changed to evade the check. All thirteen revised checks pass.

## Verification closure

The source and deterministic checks describe implementation invariants. They do not prove cursor tracking, shader compilation, perceived weight, or physical-device performance. Final evidence must identify the fresh export and keep the failed first run distinct.

| Check | Final evidence |
| --- | --- |
| Strict TypeScript / source contracts | `npm run check` passes strict TypeScript and 13 source/export checks, including closed palette, one Canvas/composer, no app RAF/interval, centralized clock markers, and explicit approved Merge values. |
| Gate math / deterministic World geometry | All 12 `verify:gates` checks pass. Both preserved systems also pass nine focused regression checks each; current runs are saved separately from historical receipts. |
| Static export / HTTP response | `npm run build` succeeds; the reviewed static root returns HTTP 200. Port 4174 continues serving the export. |
| Forge tracking, matching snap, misses, and settle guard | Grip error measured 0.004px after smoothing in the sampled drag. Tap, wrong socket, cancel, Escape, and blur accepted no strand. A valid seat was accepted before settling; Next remained disabled. The final UI disables other controls during a pointer snap and re-enables them after it settles. Three distinct strands opened the gate once. |
| Train one/two/three characters, progressive writing, paste, Unicode, and IME | One/two characters stayed idle. Pasted `inkmore` retained seed `ink`, wrote progressively, then compiled after the separate settle. During composition, both two and three characters stayed idle; composition end accepted `火手人` once. Native input remained inert text. |
| Own true-circle targeting, drag requirement, lock, and 主 ignition | Bare pointer-up did nothing. A drop inside the rectangular corner but outside the circle missed and returned home. Sampled valid grip error was 0px. Displayed ring diameter differed from the physical hit circle by 0.006px on desktop. Lock/ignition settled from 0 to 1 before Next. |
| Fleet invalid/valid gestures, distinct hands, trails, and final settle | Click, short, down, sideways, slow short drag, and cancelled flick accepted no hand. Fast upward flicks and a deliberate long sweep dispatched three distinct hands. All three flights settled at 1 before the route opened. A faster initial easing response replaced the first sluggish acceleration after rendered review. |
| Pointer cancellation, blur, Escape, second pointer, and ordinary scrolling | Pointer cancellation, blur, and Escape cleared pending input. Emulated touch cancellation seated nothing. A synthetic non-primary pen press/release was ignored. Ordinary scroll reached 0.307 progress without accepting or completing any gate. |
| Native keyboard controls and explicit alternatives | Direct Enter/Space on the draggable controls and explicit native alternatives completed all four rites through the same guarded settle paths. |
| Initial and live-change reduced-motion behavior | Initial reduced mode hid the Canvas and retained all 14 storyboard states. Forge and Train static paths completed directly. A live change cancelled an uncommitted Forge drag, returned it home, and accepted nothing. An accepted Train command and Own lock settled after the actual preference event. Only one already accepted Fleet hand settled; unsent hands stayed at 0 and Next stayed disabled. |
| Desktop / 390px / 320px layout and emulated touch | All four chambers completed at 390px with browser `pointerType: touch` for drag/flick rites; Train used native text entry. Forge targets measured 50×50px. Client/document widths matched at 375px and 305px after gutters. Compact World transforms and refreshed captures keep artifacts within the narrow composition. Physical phones remain untested. |
| Replay, previous-scene overlap, and live resource cleanup | Stable resource budgets were 1 mesh/384 points, 1/192, 1/192, and 2/384; after Fleet exit, mesh/point counts were 0/0. Replay cleared all accepted/settled arrays, seed, phases, events, and gate parameters; a second actual journey re-entered and completed the gates. |
| Shared native heartbeat / Canvas / composer | Live owners stayed 1/1/1. A settled Fork sample counted one recurring GSAP callback, one active RAF, and zero intervals. The earlier scroll sample separately retained two one-shot Lenis cleanup callbacks. |
| Fleet → Pursuit → Merge → Fork timing and audio silence regression | The full pointer journey reached Fork at observed 8.008s for the scheduled 8s marker. At local Merge 7.083s, nav was locked, output disconnected, and master gain 0. Zero silence violations; shing count stayed 3 with only the allowed opening/Pursuit/Merge sword moments visited. |
| Fresh GPU/console and network observations | Final all-four-gate compile/link error array was empty. Zero console errors; one existing Three.Clock warning. Seventeen observed requests were local, with zero remote or failed requests. |

**Final browser receipt:** [browser-evidence.json](browser-evidence.json). Review [Forge](captures/v5-forge-connected-final.png), [Train](captures/v5-train-writing-final.png), [Own ignition](captures/v5-own-ignition-final.png), [Fleet flight](captures/v5-fleet-flight-final.png), and the [compact Own](captures/v5-own-mobile-final.png) / [Fleet](captures/v5-fleet-mobile-final.png) captures. Earlier detailed pointer tests and final presentation refinements are identified separately in the evidence.

## Payload and performance

- Root HTML plus directly referenced entry resources: **1,274,563 raw bytes**, **375,724 estimated gzip bytes**. This is a lower-bound entry set.
- Conservative application-load bound including all exported client assets and diagnostic JSON: **2,425,008 raw bytes**, **744,149 estimated gzip bytes**. Below the 4,000,000-byte target before compression.
- Total static export: **2,470,455 bytes**, reported separately from initial payload.
- Payload report and method: [payload.json](payload.json), filesystem bytes and `node:zlib` estimates.
- Final desktop Chromium heartbeat sampled approximately **120 ticks/s**; the clean native audit observed 181 GSAP callbacks over approximately 1.5s. The callback audit ran without page-polling RAFs in that interval.

Filesystem size and `node:zlib` estimates are not measured network transfer. GSAP heartbeat ticks are not GPU presented FPS. **Physical desktop/mobile GPU performance remains unmeasured** unless separately recorded on named hardware. Viewport and touch emulation do not establish the desktop 60fps or mid-tier mobile 30fps targets, including the cost of inherited 2× MSAA.

## Source limits and review gate

The gate visuals, interactions, terminal completion, and local dispatch are authored work. They do not demonstrate a running model, provider integration, learned training state, actual transferred ownership, external fleet, customer outcome, or subscription purchase. No visitor input is persisted as a production training artifact.

Canonical hand SVGs, prototype v0, final brand paths, real member media, production recordings, catalog/terms, later scene fidelity, and the physical-device tuning pass remain separate inputs. Existing synthetic tones are still fixtures. The v4 Drain and its source/historical receipt remain preserved.

**Human sanity gate:** review the Forge's connection, Train's handoff, Own's grip and lock, and Fleet's momentum as one uninterrupted local experience. Stop before v6. See `STUB-MANIFEST.md` for the remaining dependency order.

BUILT BY GHOST HANDS
