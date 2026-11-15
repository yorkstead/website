# Slice 4 — Implementation Plan

**Specification:** [`spec.md`](spec.md)

## Approach

1. `components/dashboard/dashboard-navigation.tsx`: Add `transition-[width] duration-180 ease-out` on the desktop sidebar container, `transition-opacity duration-120` on label spans, and active left-indicator styling on `LinkItem`.
2. `components/dashboard/unified-attention-view.tsx` & `components/dashboard/lead-priority-queue.tsx`: Add `150ms` row transition classes for completion/resolution states and `transition-shadow duration-150` on interactive controls.
3. `components/dashboard/dashboard-styles.ts`: Add shared operational transition utility constants (`120–180ms`) for reuse across dashboard cards/rows.

## Rollback

Revert the touched `components/dashboard/` files; zero API, schema, or route impact.
