# CC-016 verification, validation matrix, and rollback

## Validation matrix

| Workflow | Expected | Actual | Evidence | Remaining manual check | Result |
|---|---|---|---|---|---|
| Public website submission | Valid synthetic submission persists once; identical repeat is duplicate-safe | CI #304 completed successful and repeat submissions and verified one synthetic PostgreSQL row. | [CI run #304](https://github.com/yorkstead/website/actions/runs/40819086513); `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Confirm final exact-head run | Pass |
| CRM visibility and refresh | Owner sees submitted name, email, company, project type, message, status, notes after refresh | CI #304 rendered the synthetic lead in the queue and CRM and passed status, private notes, follow-up scheduling/completion and refresh assertions. | CI #304; `app/dashboard/leads/page.tsx`; CC-016 browser test | Confirm final exact-head run | Pass |
| Lead status and retirement guard | Active status changes persist; a tombstoned inquiry cannot change | The complete deterministic/PostgreSQL suite passed in CI #304, including retirement guard regression. | CI #304; `lib/lead-follow-up.test.ts`; `tests/lead-follow-up-database.test.ts` | None for disposable checks | Pass |
| Follow-up buckets/counts/reschedule/complete | Overdue/today/upcoming are disjoint, match counts, Denver date semantics, reschedule moves bucket, completion clears date | Full PostgreSQL suite and browser scheduling/completion assertions passed in CI #304. DB tests verify bucket/count equality, rescheduling, completion, and retired/closed exclusion. | CI #304; `tests/lead-follow-up-database.test.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | None for disposable checks | Pass |
| Conversion and duplicate safety | First conversion writes one project/activity; repeats return same project; archived/retired/missing IDs fail safely | CI #304 passed missing-workspace insert and populated-workspace upsert/preservation integration tests, including idempotent repeat and retired/archived failures. Browser converted the lead, loaded `/api/workspace`, and created the first task. | CI #304; `lib/lead-conversion.test.ts`; `tests/lead-conversion-database.test.ts`; CC-016 browser log | Confirm remaining delivery/source/reload states on final head | Pass in PostgreSQL and through task creation |
| Project workspace/source link | Exact source inquiry link, tasks, milestones, decisions persist and remain after refresh | CI #304 loaded the project and created its task, then hit a strict locator ambiguity: the project name appears in the workspace and project list. The assertion now scopes to the named workspace region. | CI #304; `app/api/workspace/route.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Rerun delivery records, source link, reload on corrected exact head | Partial: project/task passed; remaining browser assertions pending |
| Missing/expired navigation and errors | Unknown lead/project links show useful recovery links; anonymous owner access denies | Existing project deep-link unit and standard owner redirect browser checks pass. CC-016 checks both unavailable states, but #304 stopped earlier at the project heading. | `lib/project-deep-link.test.ts`; `tests/e2e/public-flows.e2e.ts`; CC-016 browser test; CI #304 | Rerun CC-016 unavailable-state assertions | Partial: existing coverage passes; new workflow pending |
| Owner, tenant, retirement, customer publication boundaries | Owner authorization remains required; tenants remain scoped; retired records stay protected; customer publication stays gated | CI #304 deterministic/PostgreSQL, standard browser, and all isolated owner/customer browser workflows passed; CC-016 status SQL excludes tombstones. | `tests/private-authorization.test.ts`; `tests/e2e/customer-portal-preview.e2e.ts`; CC-016 tests; CI #304 | None for disposable checks | Pass |
| Yorkstead visual/usability | Existing design retained; only narrow, evidence-based states added | No visual redesign or speculative usability change; browser flow uses existing forms, cards, dialogs, and status/error links. | CI #304 browser evidence and existing mobile/desktop cases | Review final CC-016 screenshots if a check fails | Pass; no design issue observed |
| Scaffold and migration validation | Project scaffold valid; all ordered migrations valid and unchanged | `bun run yorkstead:check` passes (26 active specs); `bun run db:migrate:check` passes all 18 migrations | Local command output, branch `feat/cc-016-command-center-validation` | None | Pass |
| Lint and typecheck | No lint errors or TypeScript errors | Lint passes with existing `components/login-panel.tsx:62` warning; `bun run typecheck` passes | Local command output | None | Pass |
| Unit/integration suite | No failures; DB integration executes against disposable PostgreSQL | Local `bun test`: 369 passed, 109 database-dependent skipped, 0 failed. CI #304 passed the full deterministic/PostgreSQL suite. | Local `bun test`; exact-head CI #304 | None for disposable suite | Pass |
| Standard browser suite | Existing navigation/auth/publication checks pass | Local `bun run test:e2e --workers=1`: 32/32 passed; exact-head CI #304 standard browser suite passed. | Local Playwright output; CI #304 | None for standard suite | Pass |
| CC-016 browser suite | Full lifecycle passes with synthetic disposable data; unsafe DB is refused | CI #304 verified submission, duplicate handling, CRM/follow-up, conversion, authenticated project load, task creation, and guards. It then failed at a strict-mode locator ambiguity because the project name appears in both the workspace and project list; the assertion now scopes to the workspace. | CI #304; `lib/lead-conversion.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Verify milestones, decisions, source link, refresh, recovery and cleanup | Fail at test locator in #304; corrected selector awaits exact-head CI |
| Production build | Production build completes | Local Turbopack fails binding a worker port (`EPERM`). Webpack fallback fails parsing TypeScript `--showConfig`; typecheck passes. CI build was skipped because the CC-016 browser failed earlier. | `bun run build`; `node node_modules/next/dist/bin/next build --webpack` | Confirm exact PR-head CI build after browser passes | Blocked locally; CI pending |
| Git diff | No whitespace errors or unintended generated changes | `git diff --check` passes on the prior head; rerun after selector/docs edits. | Local command output | None | Pass on prior head; rerun pending |

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
