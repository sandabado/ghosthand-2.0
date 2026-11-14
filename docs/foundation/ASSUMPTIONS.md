# Foundation v2 builder choices and provisional behavior

Approved decisions D01–D07 are the governing rules. The definitions below are engineering choices made to start the authorized v2 foundation. They are **not individually approved amendments**, and they remain part of the human sanity review. V3–v11 have not been started by documenting them.

The source authority is `BUILD-NOW.md` and `RESOLVED-DECISIONS.md` in the preserved storyboard instruction package. The original v1/v2 texts remain unchanged. The earlier portfolio remains preserved in `dist/` and its original Git commit; this local foundation does not replace a public domain or publish a new Site version.

## D08 — Five layers, named for this implementation

The source does not canonically number the physical layer stack. This build uses the following practical bottom-to-top division:

1. **World render:** one permanent R3F Canvas, camera, shared particles, lighting, scene geometry, and the single four-effect composer. The grade is inside this render layer rather than a second Canvas.
2. **Readability veil:** a fixed DOM vignette protects the type from the WebGL atmosphere.
3. **Story and navigation:** readable scene shells, type, fixture interactions, the current/previous shell overlap, header, sound control, and persistent path navigation.
4. **Review interface:** the compositor proof and receipt sit above ordinary story content.
5. **Local effect overlay:** the approved white flash and vertical cut are driven from the same parameters and local Merge clock. The presentation-only cursor sits above them; native controls retain focus and activation semantics.

These are implementation responsibilities, not a claim that the founders approved this five-layer terminology. Z-index values are implementation details; the flash intentionally covers ordinary presentation while remaining pointer-transparent.

## D09 — Parameters and adapters

- Zustand owns the discrete journey state and a stable mutable `params` object. GSAP timelines tween that object; they do not tween DOM nodes or Three objects directly.
- ScrollTrigger writes only `progress` and `depth`. Camera entrance primitives use separate `pass` and `fall` parameters, so they cannot satisfy scroll advancement. Scene and camera adapters consume shared parameters rather than handling browser scroll events themselves.
- The heartbeat copies continuous parameters into DOM custom properties. Cursor position is also copied from the shared parameters in that adapter. SVG stroke drawing and local text treatment consume those properties.
- Negative-priority R3F callbacks upload the parameter-derived shader uniforms and update camera/material adapters before the composer renders. `uploadUniforms` is the shared utility.
- `useParam` publishes snapshots to React consumers at a lower cadence than the render loop; it is not a second animation clock.
- `FALL` keeps orientation fixed. Dojo `ENTER` owns bounded movement; the more aggressive camera act is confined to the single `PURSUIT` transition.

Temporary hand curves, founder monograms, geometry, shader screens, example audit burdens, station prose, relic descriptions, and synthesized audio tones are identified fixtures. Missing hand paths, prototype v0, brand/station canon, member media, recordings, and final offering copy have not been invented as canonical inputs.

## D10 — Crossfade and ceremonial cut ownership

Ordinary scene transitions use `sceneMix` for current/previous shell visibility and a `cutProgress` envelope over `TIMING.overlap` (400ms). A new transition kills the prior overlap before assigning the next owner.

Entry from Pursuit into Merge and entry from Merge into Fork bypass that generic overlap. Merge owns `cutProgress` on its own timeline. Its clock starts at zero when Merge begins, repeats summon and hand, and makes Fork both visible and interactive at `TIMING.merge.fork`. Generic overlap is not added after that marker.

The approved flash and cut intervals intentionally overlap. The complete audio silence is 7.0–8.0 seconds on the Merge clock, not a promise of one second of visual stillness. Threshold has a separate opening clock.

## D11 — One frame authority and library integration

The application heartbeat is registered on GSAP’s ticker. GSAP’s automatic root updater is removed while the engine is active and is advanced manually in the required order:

1. Consume queued input.
2. Advance Lenis and update the persistent ScrollTrigger spine.
3. Advance GSAP timelines.
4. Copy shared values to DOM and uniform/camera adapters.
5. Advance R3F and render through the persistent composer.

Lenis uses `autoRaf: false`; R3F uses `frameloop="never"`. There are no application `requestAnimationFrame` or `setInterval` loops. ScrollTrigger’s global maintenance loop and synchronization interval are disabled after the persistent pin is created; that existing instance is re-enabled and updated from the heartbeat. This uses the library’s public enable/disable/update APIs without patching dependency source. It is a builder integration choice and needs runtime verification across browsers, especially resize and pin behavior.

Live heartbeat/Canvas/composer counters are observability for this application. They do not independently prove how many one-off callbacks a browser or dependency schedules. Source checks, live ownership counts, and a measured native callback audit must be reported separately.

The logical clock pauses while the document is hidden and discards the first return-frame gap. Visible elapsed time is not clamped for timelines: a slow frame catches up to the approved ceremony schedule rather than stretching it. Only input integration is capped at 50ms. Actual callback dispatch is quantized to a browser frame; the receipt records both active timeline elapsed time and observed wall seconds. Background-tab time is intentionally excluded, so an interrupted ceremony is not claimed to last eight wall seconds.

## D12 — Provisional budgets and input thresholds

- Legend, Drain, and each Craft chamber have a provisional 1,100px scroll budget in `TIMING.scrollBudget`.
- Threshold, Pursuit, Merge, Fork, Dojo, Commission, Chains Hold, and Oath do not consume a scroll budget. Their time gates, deliberate interactions, or explicit navigation advance the journey.
- Long scene content scrolls inside the readable DOM panel; outer scrolling supplies the provisional world-spine budget. Native scroll chaining at panel boundaries and explicit next-step controls preserve reachability. This is a visible review tradeoff, especially on mobile.
- The initial Threshold gate is eight seconds. Pursuit is two seconds. Entry and overlap durations remain centralized in `TIMING`, apart from the separately approved Merge schedule.
- A new scene resets the spine to its start. Scroll-driven advancement requires reaching the end of the scene budget and, where applicable, interaction completion. Explicit next-step controls provide an equivalent route through the same interaction/state guards without requiring a physical scroll gesture.
- The Look up area uses an upward movement of at least `TIMING.lookUpPixels` (currently 64px), with upward travel greater than lateral travel. The area captures its deliberate gesture separately from page scrolling. A discoverable keyboard control produces the same release; no camera tilt is introduced.
- Fork and seal commitment use the approved 40px stroke minimum. The keyboard stroke is arm, travel, commit rather than ordinary click activation. Interrupted strokes are cancelled.
- Reduced-motion presentation suppresses the moving world and ceremonial overlays, adds a static strip of all the same scene states, and preserves the guarded controls. It does not bypass the approved journey gates.

Distances other than the approved 40px commitment are builder choices. The dedicated performance/accessibility finish remains later scope, but foundation alternatives work now and must be checked now.

## D13 — Evidence and payload definition

`scripts/verify-foundation.mjs` measures the completed `out/` export. It reports:

- Root HTML plus directly referenced resources as a lower-bound entry set.
- Root HTML plus every exported JS/CSS/font/image asset as a conservative client-asset upper bound, including lazy and not-found chunks.
- The eagerly fetched diagnostic receipt JSON separately, and a combined conservative app-load bound.
- Total exported files and bytes, separately from the initial payload.
- Gzip estimates produced by `node:zlib`, labelled as estimates rather than measured network transfer.

The same script writes a compact `foundation-receipt.json` into `public/` and `out/` for the local footer. Those values become stale if source is changed without rebuilding and rerunning the script.

The source audit checks known tracking imports/hosts, remote asset declarations, palette literals, fixture contracts, excluded staging imagery, centralized markers, and Canvas/composer declarations. It cannot prove contextual palette permissions, the complete request graph, or scene behavior. Runtime requests and visitor interactions require separate browser evidence.

The footer’s sampled ticks per second describe the GSAP heartbeat in the observed browser. They are not GPU frame rate, a 60fps desktop acceptance result, or a 30fps mid-tier mobile result. Device targets remain unmeasured until actual named hardware and conditions are recorded. A successful static export is not a performance benchmark.

## D14 — Conservative replay and branch lifecycle

The provisional lifecycle is local to this loaded page; no progress, personal data, or commitment is persisted to storage.

- The first interactive Fork reveal unlocks persistent 道 Dojo / 代 Commission navigation for the rest of that journey, including Chains Hold and Oath. These links remain reversible and may bypass Fork commitment.
- Branch switching preserves completed gates, Drain release, visited scene history, visited allowed sword moments, selected fixture entries, and the two local ritual flags. It does not reset the journey or sound allowance. Camera/input intent resets on entry.
- Chains Hold’s single physical green doorway returns to Fork. It resets that room/gesture interaction, not the journey’s history or counters. It does not lead directly to Oath, and its room contains no sales prompt.
- Dojo and Commission each allow continuation to Oath without requiring the other route or the other ritual. A fixture seal creates no account, membership, order, payment, or external action.
- Explicit “Replay from the threshold” starts a new journey number, returns to Threshold, resets both local clocks, clears gate/release/ritual flags, selected fixture entries, visited scenes, sword history, shing count, pending input, and sound frequency history. The visitor’s chosen sound-on/off setting is retained; no autoplay is introduced.
- Switching scenes or losing the gesture target cancels an interrupted commitment. A cancelled stroke has no deferred effect when returning to that scene.
- Sword accounting records **distinct allowed moments actually visited in this journey**, not a required total and not every repaint or repeated visit to the same permitted moment. Revisiting Commission can show its permitted handover again without fabricating a new story moment. The receipt lists moment names and their count.
- Shing accounting is separate: at most three accepted shing cues per journey, including muted cues when sound is off. Turning sound on later does not replenish that allowance. Other bus events are frequency-capped, and all event playback is blocked during the approved silence window.

Visitor-facing review tradeoffs are therefore concrete: replay loses local progress; switching paths keeps it; muted cues still consume the shing allowance; and the list of sword moments is a unique story-moment list. These policies remain provisional until reviewed, not approved additions to D01–D07.

## Human sanity gate

Review the local full journey, both Fork routes, persistent path switching, both isolated seal rituals, replay, the fog proof, sound silence, keyboard inputs, and reduced-motion strip. Record observed results in BUILD-RECEIPT. Stop before v3. Do not treat this foundation receipt as a public launch, final membership offer, final media approval, or completion of later incantations.
