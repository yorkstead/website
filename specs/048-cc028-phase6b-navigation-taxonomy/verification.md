# CC-028 Phase 6b — verification

**Updated:** 2026-11-11. Local disposable PostgreSQL 18.6 (`scripts/local-db.sh`, database `website_test`); CI uses PostgreSQL 16.

## Browser coverage — the meaningful check for this slice

`bunx playwright test -c playwright.cc017.config.ts` — **10 passed**, covering:

- every destination in the route matrix, including the new Systems group;
- Pipeline active on leads, consultations, opportunities, overlap review, and marketing;
- Systems active on systems, automations, and operations;
- follow-up query views keeping Pipeline active;
- mobile drawer focus, Escape, backdrop, and route selection;
- print media hiding dashboard navigation;
- Automations owner-only access and Hub rendering, unchanged.

Run twice: once in a sibling worktree during development and once on this branch after copying the two files.

## Repository baseline

- `bun run yorkstead:check` — PASS, 48 spec directories.
- `bun test` — 653 pass, 0 fail, 0 skip (6,036 assertions, 33s).
- `bun run lint` — 0 errors; one pre-existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — clean.
- `bun run build` — success after removing a stale `.next`; the first attempt failed prerendering `/solutions` with `Cannot read properties of null (reading 'useContext')`, a page that does not use navigation. The clean rebuild compiled and prerendered all 89 pages, so the failure was stale build state rather than this change.

## Limits

- Visual review at unusual viewport widths was not performed beyond the existing mobile/desktop browser cases.
- Automations remains reachable from two places (Systems and the existing Automations page), which is intentional; no route was removed.
- Quick Launch targets (T106a) are a separate PR (#131) and are not part of this branch.
