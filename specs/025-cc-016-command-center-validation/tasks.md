# Tasks

- [x] T001 — Read session guidance, constitution, CC-015 and contact persistence specs, repository skills, and current CRM/project implementation.
- [x] T002 — Verify live main/PR context and define CC-016 scope, plan, and acceptance criteria.
- [x] T003 — Map lead lifecycle behavior and add disposable PostgreSQL regressions for confirmed integration gaps and failure cases.
- [x] T004 — Add isolated owner browser workflow from public inquiry through project workspace, including repeat and failure paths.
- [x] T005 — Fix only confirmed integration/usability defects; preserve auth, tenant isolation, retirement and publication gates.
- [x] T006 — Run all requested repository checks and review security, hardening, database and spec convergence; record environment-specific blocks.
- [x] T007 — Complete validation matrix, production smoke checklist, rollback, verification evidence and handoff.
- [x] T008 — Open `CC-016: Command Center Operational Validation` PR. Do not merge or deploy.
- [ ] T009 — Re-run exact-head CI after adapting development-only loopback disposable database access; repair any remaining lifecycle failure.

## Handoff state

- Current task: T009, re-run exact-head CI and reconcile the matrix; PR #72 is open as a draft.
- Branch: `feat/cc-016-command-center-validation`, based on the exact verified main tree (`819a1572607ef8c265cf77aa28df50eb7cb729d7`).
- A focused application fix routes owner status changes through a tombstone-aware SQL helper. The conversion DB regression now requires a disposable URL and rolls back instead of deleting `workspaces.primary`.
- Added the isolated `playwright.cc016.config.ts` browser flow and database integration safety guard. CI #294 exposed Neon HTTP vs loopback PostgreSQL; the development-only loopback adapter is in place. CI #296 verified public submit, duplicate handling and one row; CI #297 passed CRM and follow-up updates but conversion returned to the lead route. The browser assertion now captures the action error text on the next run.
- Local: scaffold, 18 migration checks, lint (one pre-existing warning), typecheck, unit suite (368 pass / 108 DB skips / 0 fail), focused adapter/lifecycle/safety tests (5 pass), standard browser suite (32/32 with a test-specific 60s timeout for the slow crawl), and diff check pass. Standard Turbopack/webpack builds are blocked by the sandbox worker port and Next TypeScript config parsing issues.
- Final review: `git diff --check` passes and the generated Next.js env file is clean. The only unrelated working-tree file is the pre-existing untracked `website.code-workspace`; leave it untouched.
- Next action: commit/push the diagnostic assertion; inspect and fix conversion failure; rerun exact-head CI and update the matrix. No production action.
- Production inquiry remains untouched.
