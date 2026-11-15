# Slice 4 — Owner Command Center & Dashboard Micro-Interactions

**Parent:** [`049-micro-interactions-program`](../049-micro-interactions-program/spec.md)

## Problem

The Owner Command Center (`components/dashboard/`) is a dense operational workspace. Motions here must stay ultra-fast (`120–180ms`) and purely functional: collapsing the sidebar snaps widths abruptly, completing or resolving queue items causes list rows to jump without visual continuity, and keyboard tabbing through dense tables lacks smooth focus-ring transitions.

## Requirements

- R1 (`components/dashboard/dashboard-navigation.tsx`): Add a `180ms ease-out` `transition-[width]` when toggling `yorkstead-dashboard-nav-collapsed`, fade nav labels cleanly before clipping, and add a crisp active left-border/bar transition on `LinkItem`.
- R2 (`components/dashboard/unified-attention-view.tsx` & `components/dashboard/lead-priority-queue.tsx`): Add `140–160ms` row completion/exit collapse transitions so resolved items settle out of the queue smoothly without jarring list jumps.
- R3 (Refresh & focus polish): Use subtle, non-distracting pulse/opacity feedback only while an active read/refresh is in flight (keeping calm, legible timestamps when idle), and `transition-shadow duration-150` on keyboard-focusable rows/controls.
- R4: Preserve all CC-021/CC-027/CC-028 routes, active-state rules, keyboard navigation, mobile drawer, print styles, and `prefers-reduced-motion: reduce`.

## Acceptance

- A1: Collapsing/expanding the dashboard sidebar transitions width and labels smoothly without text wrapping glitches.
- A2: Completing/resolving a task or follow-up item transitions cleanly and passes CC-017/CC-018 and dashboard unit/browser tests.
- A3: Print views (`.no-print`, `.print-page`) and `prefers-reduced-motion: reduce` remain unaffected.

## Non-goals

- Changing dashboard data fetching, CC-021 read contracts, source-read timestamps, or CRM/Marketing/Systems record ownership.
