# SystemForm homepage interaction

## User value

Give the Yorkstead homepage one quiet, recognizable visual system that reinforces the company’s architectural and operational point of view without competing with the page’s content.

## Scope

- Add one fixed, decorative WebGL canvas to the homepage.
- Morph a persistent population of points, short rods, and readable code between a Core state and selected operational forms at restrained intervals down the full homepage.
- Make readable TypeScript fragments the primary morphing material, with abstract strokes and nodes retained only as low-opacity scaffolding.
- Keep the opening state visibly active at rest with a quiet compile pulse, and resolve the five middle states into a shop drawing, clipboard, shop-floor layout, assembly drawing, and POS terminal.
- Drive each transition from an existing homepage section or the homepage footer with GSAP ScrollTrigger.
- Move the persistent form through a restrained sequence of viewport positions as its state changes.
- Preserve bidirectional scroll behavior and a nearly imperceptible idle breath.
- Reduce geometry on small screens, cap device pixel ratio and transition spread, pause while the document is hidden, and provide a non-WebGL/reduced-motion fallback.

## Acceptance criteria

1. The form remains fixed, subtle, low-opacity, non-interactive, and visually consistent with Yorkstead’s blue-gray CAD language.
2. Transitions are anchored to named homepage sections rather than calculated from total page progress.
3. Scrolling backward reverses the active morph without a discontinuity.
4. The form travels between distinct screen regions with the same reversible section progress.
5. Transitional disassembly expands beyond the resting footprint while remaining capped and behind page content.
6. Scroll velocity may loosen the form, but the displacement is capped.
7. Reduced-motion users receive a static architectural mark; no animation loop or ScrollTrigger is created.
8. Mobile renders fewer instances and every canvas caps DPR.
9. Rendering pauses when the document is not visible.
10. Existing homepage content, routes, lead capture, and privacy behavior remain unchanged.
11. The code state continues through the lower homepage and remains active at the page footer rather than fading after Services.
12. Operational drawings appear only at selected section beats and return to Core between them, creating a quiet code-to-interface rhythm rather than a morph on every section.
13. TypeScript fragments compress and dim into denser, front-facing operational illustrations during each selected beat, while the line and point scaffolding strengthens enough to make the subject recognizable without becoming a foreground graphic.
14. Every operational illustration reads as a CAD study: outline-only geometry, shared registration marks and centerlines, and no independent raster or filled illustration layer.
15. Resolved drawings hold visibly between shorter morph windows, and the final owned-system cabinet completes before the bottom of the document and remains assembled through the last scroll interval.

## Non-goals

- No pointer interaction, sound, copy changes, navigation changes, analytics, or new data collection.
- No full-screen hero takeover or high-saturation particle effects.
- No global percentage-based animation timeline.
