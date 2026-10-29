# Tasks

- [x] T001 — Read session guidance, constitution, CC-015 and contact persistence specs, repository skills, and current CRM/project implementation.
- [x] T002 — Verify live main/PR context and define CC-016 scope, plan, and acceptance criteria.
- [x] T003 — Map lead lifecycle behavior and add disposable PostgreSQL regressions for confirmed integration gaps and failure cases.
- [x] T004 — Add isolated owner browser workflow from public inquiry through project workspace, including repeat and failure paths.
- [x] T005 — Fix only confirmed integration/usability defects; preserve auth, tenant isolation, retirement and publication gates.
- [x] T006 — Run all requested repository checks and review security, hardening, database and spec convergence; record environment-specific blocks.
- [x] T007 — Complete validation matrix, production smoke checklist, rollback, verification evidence and handoff.
- [ ] T008 — Open `CC-016: Command Center Operational Validation` PR. Do not merge or deploy.

## Handoff state

- Current task: T008, publish the reviewed branch and open the requested PR; exact-head CI review follows.
- Branch: `feat/cc-016-command-center-validation`, based on the exact verified main tree (`819a1572607ef8c265cf77aa28df50eb7cb729d7`).
- A focused application fix routes owner status changes through a tombstone-aware SQL helper. The conversion DB regression now requires a disposable URL and rolls back instead of deleting `workspaces.primary`.
- Added the isolated `playwright.cc016.config.ts` browser flow and database integration safety guard. Local database and full lifecycle browser execution are pending hosted CI because no local test URL/service is available.
- Local: scaffold, 18 migration checks, lint (one pre-existing warning), typecheck, unit suite (366 pass / 108 DB skips / 0 fail), focused CC-016 unit tests (14 pass / 3 DB skips), standard browser suite (31/32; existing 30s crawl timeout), standalone crawl (1/1), and diff check pass. Standard Turbopack/webpack builds are blocked by the sandbox worker port and Next TypeScript config parsing issues.
- Final review: `git diff --check` passes and the generated Next.js env file is clean. The only unrelated working-tree file is the pre-existing untracked `website.code-workspace`; leave it untouched.
- Next action: publish the branch/open the requested PR; then verify exact-head CI and repair any browser or PostgreSQL regressions it finds. No production action.
- Production inquiry remains untouched.
