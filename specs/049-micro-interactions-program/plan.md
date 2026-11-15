# Micro-Interactions Program — Implementation Plan

**Specification:** [`spec.md`](spec.md)

## Phasing Strategy

Deliver in four independent, low-risk slices so each can be reviewed, verified with `docs/verification.md` + Playwright E2E, and merged without blocking the others:

1. **Slice 1 (`050`) — Shared primitives & site chrome:** Lowest-risk, highest-leverage baseline (`Button`, `ThemeToggle`, `SiteHeader`). Establishes shared CSS utility/transition conventions.
2. **Slice 2 (`051`) — Public marketing & lead capture:** `app/page.tsx` scroll reveals + interactive 3-year cost table, `CaseStudyCard`, `ContactForm`.
3. **Slice 3 (`052`) — Public walkthroughs & sandboxes:** `DemoControls` guided spotlight, `WhyThisExists` disclosure, `Reset sandbox` confirmation state.
4. **Slice 4 (`053`) — Owner Command Center & Dashboard:** `dashboard-navigation.tsx` collapse & active indicator, `unified-attention-view.tsx` / `lead-priority-queue.tsx` row transitions and focus rings.

## Verification Strategy

Each slice must pass:
- `bun run yorkstead:check`
- `bun run lint`, `bun run typecheck`, `bun test`, `bun run build`
- Relevant Playwright suites (`bun run test:e2e`) with both default motion and `reducedMotion: "reduce"` sanity checks.

## Rollback

Each slice touches only presentation classes and lightweight UI state; reverting any single slice PR cleanly restores prior behavior with zero data or schema impact.
