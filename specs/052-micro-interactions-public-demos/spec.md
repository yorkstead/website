# Slice 3 — Public Walkthroughs & Sandboxes Micro-Interactions

**Parent:** [`049-micro-interactions-program`](../049-micro-interactions-program/spec.md)

## Problem

The public sandbox walkthroughs (`components/public-demo/demo-controls.tsx`, `scenario-display.tsx`, `demo-shell.module.css`) let visitors switch scenarios, toggle a guided walkthrough, reset fictional data, and open `"Why this exists"` disclosures. Currently, toggling guided mode, expanding disclosures, and resetting the sandbox happen instantaneously without visual confirmation.

## Requirements

- R1 (`DemoControls` guided toggle): When `guided` (`aria-pressed={guided}`) is active, apply a crisp `ring-2 ring-primary/50` spotlight transition on the active guided target and a subtle active state transition on the toggle button.
- R2 (`WhyThisExists` disclosure): Smoothly animate the `<details>` content reveal (height/opacity transition over `160ms`) in `demo-shell.module.css` while preserving native `<details>` / `<summary>` keyboard and screen-reader behavior.
- R3 (`Reset sandbox` confirmation): Clicking `Reset sandbox` displays an inline `"Reset"` confirmation state on the button for `~1200ms` (with a subtle check icon or badge swap) so visitors immediately see that fictional sandbox state was cleared.
- R4: Preserve all `PublicDemoManifest` / `PublicDemoScenario` contracts, timers (`use-demo-expiry.ts`), and `prefers-reduced-motion` behavior.

## Acceptance

- A1: Guided mode visually spotlights the active step without shifting layout or breaking Playwright selectors.
- A2: `WhyThisExists` expands/collapses smoothly and remains keyboard-accessible (`Enter` / `Space`).
- A3: `Reset sandbox` provides clear, temporary inline confirmation and still resets state immediately on click.
- A4: All `/demos/*` E2E tests pass.

## Non-goals

- Changing fictional demo datasets, scenario logic, or expiry durations.
