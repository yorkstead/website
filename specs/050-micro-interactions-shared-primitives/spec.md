# Slice 1 — Shared Primitives & Site Chrome Micro-Interactions

**Parent:** [`049-micro-interactions-program`](../049-micro-interactions-program/spec.md)

## Problem

Core interactive primitives (`Button`, `ThemeToggle`, `SiteHeader`) currently only transition colors. Pressing a button lacks tactile feedback, toggling light/dark theme snaps icons abruptly, and the mobile navigation drawer and active desktop nav links lack crisp spatial transitions.

## Requirements

- R1 (`components/ui/button.tsx`): Add tactile press feedback (`active:scale-[0.985]` or `active:translate-y-px`) with `transition-[colors,transform,box-shadow] duration-150 ease-out` on `buttonVariants`, plus subtle directional icon micro-nudges when `group` is used on CTA links/buttons.
- R2 (`components/theme-toggle.tsx`): Cross-fade and rotate `<Sun>` and `<Moon>` icons smoothly (`200ms`) on theme toggle while preserving `aria-label="Toggle color theme"` and SSR/hydration safety.
- R3 (`components/site-header.tsx` & `components/navigation/navigation-link-styles.ts`): Add a crisp active-route underline/pill indicator in desktop nav and a smooth fade/scale entrance on the mobile `DropdownMenu.Content` (`#public-site-navigation`).
- R4: All transitions respect `@media (prefers-reduced-motion: reduce)` in `app/globals.css`.

## Acceptance

- A1: Clicking/pressing any `Button` produces immediate, subtle mechanical press feedback without layout shift.
- A2: Toggling theme rotates/cross-fades the icon cleanly with no hydration warning.
- A3: Active nav state and mobile dropdown menu open/close smoothly and pass existing header/navigation E2E tests.
- A4: Under `prefers-reduced-motion: reduce`, all transitions resolve instantaneously (`0.01ms`).

## Non-goals

- Changing `SiteHeader` navigation items, routes, or `DropdownMenu` keyboard/focus semantics.
- Adding new dependencies.
