# Micro-Interactions & Micro-Animations Program

**Status:** Draft specification — awaiting owner authorization before any implementation slice.
**Slices:**
- [`050-micro-interactions-shared-primitives`](../050-micro-interactions-shared-primitives/spec.md) — Shared UI primitives & site chrome
- [`051-micro-interactions-public-site`](../051-micro-interactions-public-site/spec.md) — Public marketing & lead capture
- [`052-micro-interactions-public-demos`](../052-micro-interactions-public-demos/spec.md) — Public walkthroughs & sandboxes
- [`053-micro-interactions-dashboard`](../053-micro-interactions-dashboard/spec.md) — Owner Command Center & Dashboard

## Problem

Yorkstead's UI already has a strong visual identity—warm parchment/deep slate OKLCH surfaces, `Geist` + `Geist Mono` typography, hairline borders, and the scroll-linked 3D `SystemForm`—but most interactive controls, cards, disclosures, and operational lists transition instantaneously or only change color. Without deliberate micro-interactions, primary actions, form state changes, guided demos, and dense dashboard queues feel static compared to the physical, precision-built systems Yorkstead sells.

## Design Philosophy — "Precision Shop-Floor Instrument"

Motion must feel like **machined detents, status indicators, and live telemetry**, never floaty SaaS bounce:
1. **Fast & grounded:** `120–180ms` for operational dashboard controls; `150–240ms` for public site surfaces; crisp `ease-out` / `cubic-bezier(0.2, 0, 0, 1)` curves.
2. **Zero new runtime dependencies:** Build exclusively on Tailwind v4 CSS transitions/animations, native HTML/CSS (`@starting-style`, `details` transitions where progressive), React state, `IntersectionObserver`, and `gsap` (already bundled and dynamically imported by `components/system-form.tsx`).
3. **Accessibility first:** Preserve and honor `@media (prefers-reduced-motion: reduce)` in `app/globals.css` and `matchMedia("(prefers-reduced-motion: reduce)")` in any JS-driven observer or GSAP hook.
4. **E2E & layout stability:** Never trap elements at `opacity: 0` when Playwright or assistive tech interacts without scrolling; preserve all `aria-pressed`, `aria-current`, labels, routes, and privacy boundaries.

## Program Requirements

- R1: All motion slices use the shared timing/easing vocabulary (`120–180ms` dashboard, `150–240ms` public, `0.01ms` under `prefers-reduced-motion: reduce`).
- R2: No new animation libraries (e.g., `framer-motion`) are added to `package.json`.
- R3: No route, data contract, database schema, lead-capture payload, or privacy boundary changes.
- R4: Each slice (`050`–`053`) is independently implementable, testable, and reversible on its own branch.

## Non-goals

- Redesigning brand colors, typography, layout structure, or copy.
- Adding decorative continuous/looping animations that distract from reading or operational work.
- Modifying `components/system-form.tsx` 3D geometry itself (public site reveals only coordinate with its existing `data-system-form` sections).
