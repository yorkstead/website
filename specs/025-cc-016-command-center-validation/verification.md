# CC-016 verification, validation matrix, and rollback

## Validation matrix

| Workflow | Expected | Actual | Evidence | Remaining manual check | Result |
|---|---|---|---|---|---|
| Public website submission | Valid synthetic submission persists once; identical repeat is duplicate-safe | CI #308 submitted and repeated the same synthetic form, confirmed one disposable PostgreSQL row, then verified CRM visibility. | [CI run #308](https://github.com/yorkstead/website/actions/runs/40822153419); `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | After separately authorized deployment, use read-only smoke checklist below; do not submit live form | Pass |
| CRM visibility and refresh | Owner sees submitted name, email, company, project type, message, status, notes after refresh | CI #308 passed queue/CRM visibility, status qualification, notes, follow-up schedule/completion/counts and refreshed state. | CI #308; `app/dashboard/leads/page.tsx`; CC-016 browser test | After separately authorized deployment, inspect the existing inquiry read-only | Pass |
| Lead status and retirement guard | Active status changes persist; a tombstoned inquiry cannot change | CI #308 full deterministic/PostgreSQL suite passed, including status persistence and retirement/tombstone regression. | CI #308; `lib/lead-follow-up.test.ts`; `tests/lead-follow-up-database.test.ts` | None for disposable checks | Pass |
| Follow-up buckets/counts/reschedule/complete | Overdue/today/upcoming are disjoint, match counts, Denver date semantics, reschedule moves bucket, completion clears date | CI #308 full PostgreSQL suite and browser schedule/completion assertions passed. DB tests verify bucket/count agreement, rescheduling, completion, and retired/closed exclusion. | CI #308; `tests/lead-follow-up-database.test.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | None for disposable checks | Pass |
| Conversion and duplicate safety | First conversion writes one project/activity; repeats return same project; archived/retired/missing IDs fail safely | CI #308 passed missing/existing workspace conversion tests, preservation of existing arrays/data, duplicate-safe conversion, and retired/archived/missing failures. Browser converted the inquiry and reached the project workspace. | CI #308; `lib/lead-conversion.test.ts`; `tests/lead-conversion-database.test.ts`; CC-016 browser log | After separately authorized deployment, inspect existing project/source linkage read-only | Pass |
| Project workspace/source link | Exact source inquiry link, tasks, milestones, decisions persist and remain after refresh | CI #308 verified converted project load, task creation, saved milestone and decision, exact source inquiry link, server persistence via authenticated `/api/workspace`, and records after full reload. | CI #308; `app/api/workspace/route.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | After separately authorized deployment, inspect current project workspace read-only | Pass |
| Missing/expired navigation and errors | Unknown lead/project links show useful recovery links; anonymous owner access denies | CI #308 passed synthetic missing-lead and missing-project recovery links/alerts. Standard browser checks confirm protected owner routes redirect when anonymous. | CI #308; `lib/project-deep-link.test.ts`; `tests/e2e/public-flows.e2e.ts`; CC-016 browser test | None for synthetic checks; see read-only production smoke checklist | Pass |
| Owner, tenant, retirement, customer publication boundaries | Owner authorization remains required; tenants remain scoped; retired records stay protected; customer publication stays gated | CI #308 deterministic/PostgreSQL suite, standard browser suite, and all isolated owner/customer enrollment, publishing, Client Access, Portal Readiness and Communications browser workflows passed. | CI #308; `tests/private-authorization.test.ts`; `tests/e2e/customer-portal-preview.e2e.ts` | None for disposable checks | Pass |
| Yorkstead visual/usability | Existing design retained; only narrow, evidence-based states added | No visual redesign or unsupported usability change. Existing forms, cards, dialogs and recovery links passed the complete CC-016 browser flow. | CI #308; existing mobile/desktop browser cases | None | Pass |
| Scaffold and migration validation | Project scaffold valid; all ordered migrations valid and unchanged | `bun run yorkstead:check` passes (26 active specs); `bun run db:migrate:check` passes all 18 migrations | Local command output, branch `feat/cc-016-command-center-validation` | None | Pass |
| Lint and typecheck | No lint errors or TypeScript errors | Lint passes with existing `components/login-panel.tsx:62` warning; `bun run typecheck` passes | Local command output | None | Pass |
| Unit/integration suite | No failures; DB integration executes against disposable PostgreSQL | Local `bun test`: 369 passed, 109 database-dependent skipped, 0 failed. CI #308 passed the complete deterministic/PostgreSQL suite against disposable PostgreSQL 16. | Local `bun test`; exact-head [CI #308](https://github.com/yorkstead/website/actions/runs/40822153419) | None | Pass |
| Standard browser suite | Existing navigation/auth/publication checks pass | Local `bun run test:e2e --workers=1`: 32/32 passed; CI #308 passed standard browser suite and all five isolated owner/customer browser workflows. | Local Playwright output; CI #308 | None | Pass |
| CC-016 browser suite | Full lifecycle passes with synthetic disposable data; unsafe DB is refused | CI #308 passed submission/repeat, CRM/status/notes/follow-up, conversion, project task/milestone/decision persistence, exact source link, refresh, missing lead/project recovery, synthetic cleanup, and workspace restoration. | [Exact-head CI #308](https://github.com/yorkstead/website/actions/runs/40822153419); `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | None for disposable checks | Pass |
| Production build | Production build completes | Local Turbopack fails binding a worker port (`EPERM`); webpack fallback fails parsing Next `tsc --showConfig` output although typecheck passes. CI #308 production build passed without production runtime secrets. | Local `bun run build`; exact-head CI #308 | None | Pass in CI; local sandbox limitation |
| Git diff | No whitespace errors or unintended generated changes | `git diff --check` passes; CI #308 generated-worktree check passed. Existing unrelated untracked `website.code-workspace` is preserved. | Local command output; CI #308 | None | Pass |

## Database and fixture safety

- No schema migration was added; existing migration bytes remain unchanged.
- New/updated lifecycle database tests require matching `DATABASE_URL` and `TEST_DATABASE_URL`, a non-production process, loopback PostgreSQL, and a database name containing a `test` or `disposable` segment.
- Conversion persistence assertions execute in one explicit transaction and roll back; the test no longer deletes or clears `workspaces.primary`.
- The CC-016 browser fixture inserts one unique fictional `example.test` inquiry. It snapshots the pre-test workspace and restores it in `afterAll`, removes only its inquiry and auth fixture, and refuses non-disposable endpoints before connecting.
- No contact inquiry, production record, production schema, deployment, external CRM record, or customer publication/access state was touched.

## Production smoke-test checklist (read-only)

Run only after a separately authorized merge/deployment. Do not use the known real production inquiry as test input and do not submit a production form that writes a record.

1. Confirm the deployed source SHA and deployment health in the hosting dashboard.
2. Open the public contact form and verify fields, required-field browser validation, email fallback link, and no accidental client-side database access. Do not submit it.
3. Sign in as the owner and verify `/dashboard/leads` loads, follow-up counts are visible, and the known production inquiry remains in its existing state. Do not change status, notes, follow-up, archive state, or conversion.
4. Open the existing converted project workspace and confirm its source link, tasks, milestones, decisions, and journal render without editing or saving.
5. Confirm an invalid lead URL offers “View all inquiries,” and an invalid project deep link offers the dashboard/leads recovery path.
6. Confirm customer portal/publication access remains gated and no new customer route or grant is active.
7. Review application error/timeout metrics. Stop if inquiry persistence errors recur or if an unexpected record/status/workspace change appears.

To validate a new submission or mutation, use the isolated PR browser workflow and disposable PostgreSQL only. Production writes are outside this validation authorization.

## Rollback

Revert the CC-016 application/test/documentation commits. No migration or data cleanup is required. The status guard restores prior status-action behavior; test-only fixture and CI config can be reverted with the branch. Existing owner-created CRM/project records are business data and are not automatically removed by a code rollback. CC-016 tests use rollback or exact synthetic cleanup and restore the prior primary workspace snapshot.
