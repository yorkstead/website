# CC-016 verification, validation matrix, and rollback

## Validation matrix

| Workflow | Expected | Actual | Evidence | Remaining manual check | Result |
|---|---|---|---|---|---|
| Public website submission | Valid synthetic submission persists once; identical repeat is duplicate-safe | Run #296 exercised successful and duplicate form states and verified one synthetic PostgreSQL row. | CI run #296; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Confirm the full corrected exact-head lifecycle | Pass through duplicate persistence; later lifecycle steps pending |
| CRM visibility and refresh | Owner sees submitted name, email, company, project type, message, status, notes after refresh | Run #297 used the correct `/dashboard/leads` route and advanced through lead lifecycle actions to conversion; conversion did not redirect. The next assertion surfaces returned action error text for targeted diagnosis. | CI run #297; `app/dashboard/leads/page.tsx`; CC-016 browser test | Confirm CRM details, conversion and refreshed project after diagnosis | Fail at conversion in #297; diagnosis pending |
| Lead status and retirement guard | Active status changes persist; a tombstoned inquiry cannot change | New unit guard passes; full PostgreSQL integration suite passed on CI run #294, including lifecycle and retirement regression. | CI run #294 job; `lib/lead-follow-up.test.ts`; `tests/lead-follow-up-database.test.ts` | Reconfirm on corrected exact head | Pass on #294 DB suite; rerun pending |
| Follow-up buckets/counts/reschedule/complete | Overdue/today/upcoming are disjoint, match counts, Denver date semantics, reschedule moves bucket, completion clears date | Existing DB regression verifies count/list equality, rescheduling, completion, retired/closed exclusion; full PostgreSQL integration suite passed in CI run #294. Browser assertions are pending rerun after initial public persistence failure. | CI run #294; `tests/lead-follow-up-database.test.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Confirm corrected exact-head browser result | DB pass; browser pending |
| Conversion and duplicate safety | First conversion writes one project/activity; repeats return same project; archived/retired/missing IDs fail safely | Existing unit tests cover errors/idempotent return; PostgreSQL integration suite passed in CI run #294. Conversion test rolls back and does not delete the primary workspace. | CI run #294; `lib/lead-conversion.test.ts`; `tests/lead-conversion-database.test.ts` | Confirm corrected exact-head browser result | DB pass; browser pending |
| Project workspace/source link | Exact source inquiry link, tasks, milestones, decisions persist and remain after refresh | Isolated browser test adds one synthetic task, milestone, decision and verifies exact inquiry href and reload | `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Confirm exact PR-head browser result | Blocked locally; CI pending |
| Missing/expired navigation and errors | Unknown lead/project links show useful recovery links; anonymous owner access denies | Existing project deep-link unit covers not-found; standard browser verifies owner routes redirect; CC-016 browser asserts both unavailable states | `lib/project-deep-link.test.ts`; `tests/e2e/public-flows.e2e.ts`; CC-016 browser test | Confirm exact PR-head browser result | Partial: existing coverage pass; new workflow pending |
| Owner, tenant, retirement, customer publication boundaries | Owner authorization remains required; tenants remain scoped; retired records stay protected; customer publication stays gated | Owner-only server action tests pass; existing customer portal/publishing tests pass in standard browser run; CC-016 status SQL excludes tombstones | `tests/private-authorization.test.ts`; `tests/e2e/customer-portal-preview.e2e.ts`; CC-016 tests | Confirm full exact-head CI and isolated owner/browser workflows | Partial: existing coverage pass; PostgreSQL/browser pending |
| Yorkstead visual/usability | Existing design retained; only narrow, evidence-based states added | No visual redesign; browser flow uses existing forms, cards, dialogs, status/error links | CC-016 browser assertions and existing mobile/desktop cases | Review CC-016 browser screenshots on CI if failure occurs | Pending CI |
| Scaffold and migration validation | Project scaffold valid; all ordered migrations valid and unchanged | `bun run yorkstead:check` passes (26 active specs); `bun run db:migrate:check` passes all 18 migrations | Local command output, branch `feat/cc-016-command-center-validation` | None | Pass |
| Lint and typecheck | No lint errors or TypeScript errors | Lint passes with existing `components/login-panel.tsx:62` warning; `bun run typecheck` passes | Local command output | None | Pass |
| Unit/integration suite | No failures; DB integration executes against disposable PostgreSQL | Local `bun test`: 368 passed, 108 skipped, 0 failed. CI run #294 migrated PostgreSQL 16 and passed the full deterministic/database integration suite. Focused adapter/retirement/URL tests: 5 passed. | Local test output; CI run #294 job | Confirm corrected exact-head suite rerun | Pass on #294 DB suite; rerun pending |
| Standard browser suite | Existing navigation/auth/publication checks pass | Run #295 passed 31/32; the existing public navigation crawl exceeded 30s in CI. It passes standalone locally in 28.7s; its test-specific timeout is now 60s, with a full rerun pending. | CI run #295; `tests/e2e/public-flows.e2e.ts` | Confirm all browser cases on exact PR head | Pending rerun |
| CC-016 browser suite | Full lifecycle passes with synthetic disposable data; unsafe DB is refused | Run #296 validated successful/repeat submission and one row. Run #297 progressed through CRM status, private details and follow-up completion, then conversion returned to the lead route instead of redirecting. The assertion now reports the visible action error for diagnosis on rerun. | CI runs #296/#297; `lib/contact-database.test.ts`; `tests/e2e-cc016/command-center-lifecycle.e2e.ts` | Diagnose and verify conversion, workspace delivery and cleanup | Fail at conversion in #297; rerun pending |
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
