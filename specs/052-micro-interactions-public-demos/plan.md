# Slice 3 — Implementation Plan

**Specification:** [`spec.md`](spec.md)

## Approach

1. `components/public-demo/demo-controls.tsx`: Add local `justReset` state with a `1200ms` timeout (cleaned up on unmount) to show inline reset confirmation; add transition classes to the guided toggle button.
2. `components/public-demo/demo-shell.module.css`: Add smooth `details[open]` content fade/slide and `.guided-active` spotlight ring transition (`160ms ease-out`).
3. `components/public-demo/scenario-display.tsx`: Apply subtle fade/slide transition when `scenarioId` changes.

## Rollback

Revert the three files under `components/public-demo/`.
