# Slice 2 — Public Marketing & Lead Capture Micro-Interactions

**Parent:** [`049-micro-interactions-program`](../049-micro-interactions-program/spec.md)

## Problem

On the public marketing site (`app/page.tsx`, `CaseStudyCard`, `ContactForm`), `SystemForm` morphs smoothly on scroll, but the surrounding content sections, 3-year cost comparison table, case study cards, and lead intake form are largely static. Adding restrained, precision-timed micro-interactions will reinforce the craft of the product without distracting from copy or slowing down lead capture.

## Requirements

- R1 (Scroll-linked hairline reveals): Add a lightweight client reveal wrapper (using `IntersectionObserver` + `matchMedia("(prefers-reduced-motion: reduce)")`) for staggered (`60ms`) `opacity` + `8px` Y-translation on key section cards (hero *"The Yorkstead Model"* rows, Buying Model `01`/`02`/`03` cards, and `CaseStudyCard` grids). Elements must default to visible if JS is disabled or reduced motion is enabled, and never block Playwright interactions.
- R2 (Interactive 3-year cost comparison in `app/page.tsx`): Add row hover/focus contrast on the `$500 / $1,000 / $1,500` table rows showing a subtle inline comparison bar or savings delta relative to the `$7,500 once` Yorkstead row, without altering any copy, prices, or semantic `<table>` structure.
- R3 (`components/case-study-card.tsx`): Enhance card hover with subtle index/icon container highlight (`group-hover:border-primary/40 group-hover:bg-primary/15`) and a gentle `scale-[1.015]` on `ProjectMediaFrame` inside `overflow-hidden` (already paired with `group-hover:translate-x-1` on the arrow).
- R4 (`components/contact-form.tsx`): Animate the `Conversation context` pre-fill banner entrance when query params (`?product=`, `?service=`, `?engagement=`) are present, and smoothly transition `SubmitButton` / submission status banners (idle → pending → success/error) without altering form fields, attribution hidden inputs, or privacy boundaries.

## Acceptance

- A1: Scrolling through `app/page.tsx` produces subtle, non-blocking section card settles that respect `prefers-reduced-motion: reduce`.
- A2: Hovering or focusing rows in the 3-year cost comparison table highlights the cost delta cleanly on desktop and mobile.
- A3: `CaseStudyCard` hover transitions icon framing, media zoom, and arrow shift smoothly.
- A4: `ContactForm` submission and query-param context transitions work cleanly and pass all existing contact/lead-capture tests.

## Non-goals

- Changing `components/system-form.tsx` 3D geometry or GSAP ScrollTrigger targets.
- Modifying `app/actions/contact.ts`, hidden attribution fields, or lead-capture validation.
