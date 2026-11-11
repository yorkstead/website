# CC-028 T105 verification — 2026-11-10

## Scope and source revision

- Slice: remove the disconnected `ConnectedOperations` and `DashboardOperationsBriefing` components only.
- Source base: verified GitHub `main` `683ef64281cf80f8df5d6289544dbb695199cda6`.
- Branch: `chore/cc028-disconnected-components`.
- The unrelated untracked audit document `docs/audits/2026-11-06-consolidation-efficiency-audit.md` is preserved and excluded from this slice.

## Consumer review

An exact-branch search across application, components, library, package, route, and TypeScript configuration paths found only each component's own exported function definition. No static import, dynamic import, route, or package export references either component. These components are private application files, not published package entry points. The active `LeadPriorityQueue` is a different component and remains unchanged. No route, data source, Hub API, credentials, or record lifecycle is modified.

## Required verification

Run results on the final local implementation revision:

- `bun install --frozen-lockfile --offline`: passed; lockfile unchanged.
- `bun run yorkstead:check`: passed; 44 active spec directories.
- `bun run db:migrate:check`: passed; 24 migrations validated; no migration changed.
- `bun run lint`: passed with one existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck`: passed.
- `bun test`: 518 passed, 123 PostgreSQL-backed skipped, 0 failed; 641 tests across 145 files.
- `bun run build`: passed with Next.js 16.4.2; all 88 static pages generated.
- `bun run test:e2e`: not run; no route, navigation, authenticated flow, or browser interaction changed.
- `git diff --check`: pending final diff review.

No production query, data mutation, migration, provider change, merge, or deployment is authorized or performed by this slice.

## T102 attention observation review — 2026-11-10

- Source ownership remains Website CRM for sales follow-ups, Opportunity Discovery for research actions, Automation Hub for its projected review/task sections, GitHub for linked project issues/PRs, and Google Calendar for calendar commitments. Workspace tasks remain in the existing Workspace editor and CalendarTimeline.
- CRM and Opportunity Discovery reads expose bounded items and failure/limit state but no upstream `checkedAt` or record freshness field. The view already links CRM rows to `/dashboard/leads?lead=<id>` and research rows to `/dashboard/opportunities?id=<id>`; supported mutations remain in those source-owned workflows.
- T102 adds only the time at which successful CRM/research reads completed, labeled `Snapshot read` in America/Denver. It does not claim record freshness, alter item ownership/status, extend query bounds, or add source writes. An unsuccessful read has no observation timestamp and remains unavailable rather than empty.
- Focused regression coverage verifies localized observation labels and omission on failed reads. Full command/check evidence will be recorded after execution.

## Spec convergence

- A7: exact-branch consumer scan found no consumers; only the two disconnected presentation files were removed.
- A9: no owner auth, customer, Registry/Operations, recovery, migration, or production path changed.
- A10: this is one separate, reversible cleanup slice; rollback restores the two component files.

## Delivery

PR [#124](https://github.com/yorkstead/website/pull/124) merged to `main` at `6a0173239aeb4860d0dccecc14749ff2f314070b`; its final head was `32f85a1615cbf3b191a9eaaa88644253ce90977a`. The implementation was limited to the two disconnected component files and supporting CC-028 documentation. No production data or configuration was changed.

## T102 local verification — 2026-11-11

- Base: live GitHub `main` `3bc6e1076db103770d20f82087f5147ea50354a3`; isolated branch `chore/119-attention-observation-time`.
- Focused attention/overview tests: 11 passed, 51 assertions.
- `bun run yorkstead:check`: PASS, 45 active spec directories.
- `bun run db:migrate:check`: PASS, all 24 existing migrations; no migration changed.
- `bun run lint`: PASS with the existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck`: PASS.
- `bun test`: PASS, 526 passed, 123 database-gated skipped, 0 failed; 649 tests across 148 files.
- `bun run build`: PASS; Next.js 16.4.2 generated all 89 static pages.
- `git diff --check`: PASS. E2E was not run because the change adds read-only observation labels without changing routes, auth, or browser interaction.
- Dependency install in the isolated worktree used `bun install --frozen-lockfile --offline`; the committed lockfile is unchanged.
- No records, migration, provider, production data/configuration, Registry/Operations, recovery, customer workflow, or external action changed.
