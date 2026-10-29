# Plan

1. Add this specification, file-level plan, tasks, and verification record before implementation.
2. Add a shared client navigation shell to `app/dashboard/layout.tsx`. Keep route pages and their authorization/data loading unchanged. Use the App Router pathname only for active states; initialize persisted collapse state after hydration.
3. Remove the homepage horizontal destination strip, WORK//CTRL sidebar, mobile bottom bar, and duplicate destination shortcuts in page headers. Retain non-navigation workspace actions and data widgets.
4. Add a disposable owner-authenticated Playwright suite for primary/secondary destinations, CRM query preservation, project hash links, active state, collapse/persistence, mobile drawer, and keyboard/focus behavior. Add it to CI.
5. Run task-specific browser coverage, then every check in `docs/verification.md`; inspect the diff and update this verification record and `docs/handoffs/CURRENT.md`.
6. Open the requested PR against `main` without merge, manual deployment, or production data operations.

## File-level approach

- `app/dashboard/layout.tsx`: wrap children in shared shell, preserving existing page-level auth behavior.
- `components/dashboard/dashboard-navigation.tsx`: responsive shell, link groups, current state, local preference, keyboard/drawer handling.
- `app/dashboard/page.tsx`, `components/dashboard.tsx`, dashboard headers: remove duplicate navigation while retaining actions and content.
- `tests/e2e-cc017/*`, `playwright.cc017.config.ts`, `.github/workflows/ci.yml`: owner browser workflow and CI invocation.
- `specs/026-cc-017-command-center-navigation/*`, `docs/handoffs/CURRENT.md`: acceptance, evidence, and active state.

## Design decisions

- Projects and Tasks point to the existing dashboard anchors, so there is no new route or data view.
- CRM points to leads. Its secondary links expose follow-up query views and consultations without altering the lead page's query contract.
- Insights points to analytics and exposes marketing and operational metrics in its submenu.
- Settings & Tools exposes the named customer administration destinations, remaining owner tools, account, and external Daily Operations.
- Mobile navigation is a drawer with labels even when the desktop preference is collapsed.
