# CC-018 Verification

## Status

Implementation branch: `feat/cc-018-actionable-command-center`, based on CC-017 merge `ef39c7a11e0ce706a18e6cb099da9893f0b3c5de`. Local checks were run in the managed sandbox on 2026-10-29. PR [#74](https://github.com/yorkstead/website/pull/74) is open and unmerged against `main`.

At exact application head `18c450f3e1507d89740ee3cd8ec3f448a4ad092e`, GitHub Actions run [40851816027](https://github.com/yorkstead/website/actions/runs/40851816027) passed end to end on 2026-10-29: scaffold, dependency audit, PostgreSQL migrations and full database tests, lint, typecheck, standard browser suite, isolated customer enrollment, publishing, Client Access, Portal Readiness, Customer Communications, CC-016 lifecycle, CC-017 navigation, CC-018 owner workflow, production build, and generated-worktree cleanliness. The matching Vercel preview is SUCCESS; Vercel Agent Review was NEUTRAL. No merge or manual deployment occurred.

Review follow-ups restored the `#focus` compatibility anchor, moved stalled-opportunity filtering before its query limit, corrected the owner-browser selector, and made project deep links react to query-only navigation. The complete exact-head CI run above validated these fixes.


## Local results

- `bun run yorkstead:check` — PASS; 28 active spec directories.
- `bun run db:migrate:check` — PASS; 18 ordered migrations validated; no migration added.
- `bun run lint` — PASS with one existing `components/login-panel.tsx:62` warning; no CC-018 lint warnings.
- `bun run typecheck` — PASS after fixing the new browser fixture type.
- `bun test` — PASS: 377 passed, 109 database-dependent skipped, 0 failed (486 total; 3,997 assertions). CC-018 focused tests: 12 passed, 1 database integration skipped, 0 failed (49 assertions).
- `bun run build` — BLOCKED locally by the sandbox: Turbopack worker process cannot bind its internal port (`EPERM`). The exact-head CI production build passed.
- `bun run test:e2e --reporter=dot` — INCOMPLETE: 15 passed and 17 failed after the local Next dev server returned `ERR_CONNECTION_RESET`/`ERR_CONNECTION_REFUSED` under the default four-worker run. A serial retry could not start the local web server. No CC-018 browser scenario was executed locally.
- `bunx playwright test -c playwright.cc018.config.ts` — BLOCKED locally: Next cannot bind loopback port 3111 (`EPERM`), and the shell has no matching loopback disposable `TEST_DATABASE_URL`/`DATABASE_URL` pair. The exact-head CI owner suite passed using its disposable PostgreSQL service.
- `bunx playwright test -c playwright.cc018.config.ts tests/e2e-cc018/actionable-overview.e2e.ts -g 'navigation preserves initial focus'` — BLOCKED locally because the configured Next web server exited during startup in the sandbox. The full browser workflow runs in PR CI with its disposable database and loopback access.
- Focused post-refinement checks: `bun run typecheck` PASS; `bun run lint` PASS with one existing `components/login-panel.tsx:62` warning; `bun run yorkstead:check` PASS; `git diff --check` PASS.

## Coverage and remaining verification

- Pure tests cover deterministic lead/task/project ranking, Denver date classification, exact lead links, closed/completed exclusion, CRM SQL lifecycle filters, safe-field projections, empty/error rendering, and reschedule validation.
- A disposable PostgreSQL lifecycle regression now exercises reschedule, complete, closed/retired denial, and persistence; it is skipped locally without a test DB.
- Owner browser coverage checks anonymous authorization, exact lead/project actions, follow-up complete/reschedule persistence, task open/complete/create persistence, recent saved activity, pipeline labels, and 390px overflow. It passed on the PR CI disposable database.
- Navigation regression browser coverage verifies no initial focus theft, keyboard focus visibility, mobile drawer open/close behavior, official light/dark logo assets, mobile and desktop sizing, and logo persistence when desktop navigation is collapsed. Existing CC-017 browser coverage continues to verify routes, links, history, and drawer behavior.
- The website CRM currently has no structured proposal amount. Overview therefore says potential revenue is “Not tracked.” No activity events are derived from CRM `updated_at`.
- CRM inquiries and `workspaces.primary` are existing single-owner sources; CC-018 adds no separate tenant or storage model. Existing owner checks are preserved.

## Verification coverage

- Prioritization and pipeline selector tests cover America/Denver date boundaries, empty inputs, and no unsupported revenue estimates.
- Disposable database tests cover stage/follow-up/stalled-lead selection, completion/reschedule persistence, and retired/closed inquiry exclusion. Owner authorization and single-owner source boundaries are covered by the existing route/service checks and owner browser workflow.
- Owner-authenticated browser checks cover exact lead/project links, task create/open/complete, CRM complete/reschedule, mobile layout, empty and error states.
- `bun run yorkstead:check`
- `bun run db:migrate:check`
- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run build`
- `bun run test:e2e`
- `git diff --check`

## Rollback

Revert the CC-018 application/specification commits on its feature branch. No database migration, production data mutation, external communication, publication, or manual deployment is planned.
