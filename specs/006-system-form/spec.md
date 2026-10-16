# SystemForm homepage interaction

## User value

Give the Yorkstead homepage one quiet, recognizable visual system that reinforces the company’s architectural and operational point of view without competing with the page’s content.

## Scope

- Add one fixed, decorative WebGL canvas to the homepage.
- Morph a persistent population of points and short rods through `Core → Architecture → Disorder → Flow → Structure → Network → Core`.
- Drive each transition from an existing homepage section with GSAP ScrollTrigger.
- Preserve bidirectional scroll behavior and a nearly imperceptible idle breath.
- Reduce geometry on small screens, cap device pixel ratio and transition spread, pause while the document is hidden, and provide a non-WebGL/reduced-motion fallback.

## Acceptance criteria

1. The form remains fixed, subtle, low-opacity, non-interactive, and visually consistent with Yorkstead’s blue-gray CAD language.
2. Transitions are anchored to named homepage sections rather than calculated from total page progress.
3. Scrolling backward reverses the active morph without a discontinuity.
4. Scroll velocity may loosen the form, but the displacement is capped.
5. Reduced-motion users receive a static architectural mark; no animation loop or ScrollTrigger is created.
6. Mobile renders fewer instances and every canvas caps DPR.
7. Rendering pauses when the document is not visible.
8. Existing homepage content, routes, lead capture, and privacy behavior remain unchanged.

## Non-goals

- No pointer interaction, sound, copy changes, navigation changes, analytics, or new data collection.
- No full-screen hero takeover or high-saturation particle effects.
- No global percentage-based animation timeline.
