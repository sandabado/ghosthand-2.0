# V3 The Ink — focused verification plan

This extends the v2 compositor and stroke contract. It does not authorize v4 or later scene work. D01–D07 remain governing decisions.

## CPU geometry checks

- Ribbon attributes and indices remain finite and in range for curved paths, reversed paths, repeated samples, and invalid/degenerate input.
- Global reveal coordinates are monotonic, begin at the supplied `start`, and end at `start + span`; left/right vertices share the same reveal coordinate.
- The ribbon has a real nonzero width, deterministic pressure variation, and tapered ends. Doubling the width doubles the geometric footprint.
- Rebuilding with identical inputs produces identical geometry. Seed changes alter the seed data without introducing nondeterministic runtime work.
- Tip geometry exposes finite reveal/seed data and a bounded particle count.
- Each geometry is disposed after the assertion; the script adds no new runtime dependency.

## Browser integration checks

- The authored hand, sigil, and slash SVGs all parse through the same SVG-to-3D adapter. Their viewBox coordinates are centered, Y-flipped, and scaled consistently. Empty paths do not manufacture invalid geometry.
- The hand reads as a painted entity: variable brush mass, bristle gaps, irregular wet edges, and a restrained candle rim. It must not merely become a thicker neon vector outline.
- Observe early draw, midpoint, completed wet stroke, and tip decay. Detached particles belong to the stroke tip and fully settle; they do not accumulate across replay.
- The shared system is visibly used by hand, sigil, and headline slash treatments. Source art remains identified as an authored study while canonical hand/prototype sources are missing.
- Replaying and switching scenes preserves one Canvas, one composer, and one heartbeat. Scene resources dispose without retained RAFs, observers, or growing geometry/material counts.
- No runtime HTTP resources leave the local origin, and shader compilation produces no console errors.

## Regression checks

- Threshold and Merge still use separate local clocks. Merge hand draws over 1.6–3.8s, the sword begins at 3.8s, flash/cut overlap remains intentional, audio stays silent from 7.0–8.0s, and Fork appears and becomes interactive at 8.0s.
- Ink adds no sword moment, camera movement verb, palette token, composer, post effect, or independent animation loop.
- Crimson remains confined to the two seal rituals. Enemy blue remains confined to Drain/chain contexts; hand, sigil, and slash ink use the sovereign palette.
- Reduced motion provides complete static strokes without tip drift, bleed animation, flash, or camera motion; keyboard progression stays available.
- Static export, strict TypeScript, palette/resource scans, and the measured payload target are rechecked. Filesystem payload and observed heartbeat values remain distinct from physical-device GPU FPS.

## Remaining canon gaps

The source package contains no executable prototype v0 or dedicated canonical hand SVG paths. V3 can improve authored study geometry and the reusable ink implementation; it cannot convert those studies into founder-approved brand artwork. Production brush feel and hand anatomy require the human sanity review before v4.
