# CC-016 verification, validation matrix, and rollback

## Validation matrix

| Workflow | Expected | Actual | Evidence | Remaining manual check | Result |
|---|---|---|---|---|---|
| Public website submission | Valid synthetic submission persists once; identical repeat is duplicate-safe | Browser test submits twice and queries exactly one persisted inquiry | `tests/e2e-cc016/command-center-lifecycle.e2e.ts`; database test run pending | Confirm exact PR-head CI workflow result | Blocked locally; CI pending |
| CRM visibility and refresh | Owner sees submitted name, email, company, project type, message, status, notes after refresh | Isolated owner browser flow asserts all fields and note after reload | CC-016 browser test; local fixture stops at required disposable DB guard | Confirm exact PR-head CI workflow result | Blocked locally; CI pending |
| Lead status and retirement guard | Active status changes persist; a tombstoned inquiry cannot change | Parameterized status helper guards tombstones; unit regression passes; PostgreSQL regression added | `lib/lead-follow-up.test.ts`; `tests/lead-follow-up-database.test.ts` | Confirm PostgreSQL result in CI | Partial: unit pass; DB pending |
| Follow-up buckets/counts/reschedule/complete | Overdue/today/upcoming are disjoint, match counts, Denver date semantics, reschedule moves bucket, completion clears date | Existing DB regression verifies count/list equality, rescheduling, completion, retired/closed exclusion; new browser test exercises scheduled/complete views | `tests/lead-follow-up-database.test.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Confirm PostgreSQL/browser results in CI | Blocked locally; CI pending |
| Conversion and duplicate safety | First conversion writes one project/activity; repeats return same project; archived/retired/missing IDs fail safely | Existing unit tests cover errors/idempotent return; PostgreSQL test covers repeat and archived/retired with rollback; corrected fixture no longer deletes the primary workspace | `lib/lead-conversion.test.ts`; `tests/lead-conversion-database.test.ts` | Confirm PostgreSQL result in CI | Partial: unit pass; DB pending |
| Project workspace/source link | Exact source inquiry link, tasks, milestones, decisions persist and remain after refresh | Isolated browser test adds one synthetic task, milestone, decision and verifies exact inquiry href and reload | `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Confirm exact PR-head browser result | Blocked locally; CI pending |
| Missing/expired navigation and errors | Unknown lead/project links show useful recovery links; anonymous owner access denies | Existing project deep-link unit covers not-found; standard browser verifies owner routes redirect; CC-016 browser asserts both unavailable states | `lib/project-deep-link.test.ts`; `tests/e2e/public-flows.e2e.ts`; CC-016 browser test | Confirm exact PR-head browser result | Partial: existing coverage pass; new workflow pending |
| Owner, tenant, retirement, customer publication boundaries | Owner authorization remains required; tenants remain scoped; retired records stay protected; customer publication stays gated | Owner-only server action tests pass; existing customer portal/publishing tests pass in standard browser run; CC-016 status SQL excludes tombstones | `tests/private-authorization.test.ts`; `tests/e2e/customer-portal-preview.e2e.ts`; CC-016 tests | Confirm full exact-head CI and isolated owner/browser workflows | Partial: existing coverage pass; PostgreSQL/browser pending |
| Yorkstead visual/usability | Existing design retained; only narrow, evidence-based states added | No visual redesign; browser flow uses existing forms, cards, dialogs, status/error links | CC-016 browser assertions and existing mobile/desktop cases | Review CC-016 browser screenshots on CI if failure occurs | Pending CI |
| Scaffold and migration validation | Project scaffold valid; all ordered migrations valid and unchanged | `bun run yorkstead:check` passes (26 active specs); `bun run db:migrate:check` passes all 18 migrations | Local command output, branch `feat/cc-016-command-center-validation` | None | Pass |
| Lint and typecheck | No lint errors or TypeScript errors | Lint passes with existing `components/login-panel.tsx:62` warning; `bun run typecheck` passes | Local command output | None | Pass |
| Unit/integration suite | No failures; DB integration executes against disposable PostgreSQL | `bun test`: 366 passed, 108 skipped, 0 failed. Skips are DB-dependent because `TEST_DATABASE_URL` is unset. Focused CC-016 unit tests: 14 passed, 3 DB tests skipped | `bun test`; `bun test tests/disposable-database-safety.test.ts ...` | Confirm all unskipped DB integration tests in CI PostgreSQL 16 | Partial: unit pass; DB pending |
| Standard browser suite | Existing navigation/auth/publication checks pass | 31/32 pass; only public navigation crawl exceeded existing 30s timeout at 32.9s. Standalone rerun passes 1/1 in 28.7s with command-line `--timeout=90000` | `bun run test:e2e --workers=1`; standalone Playwright command | Confirm full browser suite in CI | Partial: one timeout in aggregate; isolated rerun pass |
| CC-016 browser suite | Full lifecycle passes with synthetic disposable data; unsafe DB is refused | Server starts with approved escalation, then fixture rejects absent identical loopback disposable `DATABASE_URL`/`TEST_DATABASE_URL` before any DB write | `bunx playwright test -c playwright.cc016.config.ts`; no local DB is running and Docker runtime is unavailable | Run on CI's disposable PostgreSQL service | Blocked by local DB setup |
| Production build | Production build completes | Turbopack fails binding a worker port (`EPERM`). Webpack fallback fails parsing TypeScript `--showConfig`; typecheck itself passes | `bun run build`; `node node_modules/next/dist/bin/next build --webpack` | Confirm exact PR-head CI build | Blocked by local environment |
| Git diff | No whitespace errors or unintended generated changes | `git diff --check` passes; rerun after final edits | Local command output | None | Pass |

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
