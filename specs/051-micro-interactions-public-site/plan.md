# Slice 2 — Implementation Plan

**Specification:** [`spec.md`](spec.md)

## Approach

1. Create a small, reusable `components/ui/reveal.tsx` client component using `IntersectionObserver` (`threshold: 0.12`, `once: true`) that checks `prefers-reduced-motion: reduce` and applies a `180ms` CSS `opacity` + `translate-y-2` → `translate-y-0` transition.
2. Apply `Reveal` to `app/page.tsx` Buying Model cards and `CaseStudyCard` sections; extract the 3-year cost comparison table into a small client component (e.g., `components/cost-comparison-table.tsx`) for hover/focus delta highlighting while preserving exact `<table>` semantics.
3. Update `components/case-study-card.tsx` with `group-hover:` border/background/media-scale utilities.
4. Update `components/contact-form.tsx` with smooth CSS entrance/state transitions on the context banner and result banner.

## Rollback

Revert the touched components and remove `components/ui/reveal.tsx` / `components/cost-comparison-table.tsx`; no route, action, or schema changes.
