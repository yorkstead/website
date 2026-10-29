# CC-018 Verification

## Status

Implementation branch: `feat/cc-018-actionable-command-center`, source commit `0310c14a521a0ea66fb435104a74ebe87088f6d2`, based on CC-017 merge `ef39c7a11e0ce706a18e6cb099da9893f0b3c5de`. Local checks were run in the managed sandbox on 2026-10-29. Exact PR head and CI evidence will be appended after delivery.

PR [#74](https://github.com/yorkstead/website/pull/74) is open and unmerged against `main`. At exact head `2e3c5f766ed7092d461cbc6073e4af5ff309f68f`, CI run [40850752539](https://github.com/yorkstead/website/actions/runs/40850752539) was queued and the Vercel preview was pending at 2026-10-29 09:35 UTC. This is an initial status; final exact-head outcomes will be recorded before closeout.

At exact head `1b05d3a9c698f73a3c00e014c68713d8f30f386a`, CI [40850840486](https://github.com/yorkstead/website/actions/runs/40850840486) passed unit/database tests, lint, typecheck, the standard browser suite, and all earlier isolated owner browser workflows, then failed in the existing CC-016 lifecycle browser test because the new Overview had removed the `#focus` anchor used by that test. Restored the anchor on the prioritized actions section and added a regression assertion. The CC-017 and CC-018 browser steps/build were skipped by `if: success()` after the earlier failure; rerun is pending.

## Local results

- `bun run yorkstead:check` — PASS; 28 active spec directories.
- `bun run db:migrate:check` — PASS; 18 ordered migrations validated; no migration added.
- `bun run lint` — PASS with one existing `components/login-panel.tsx:62` warning; no CC-018 lint warnings.
- `bun run typecheck` — PASS after fixing the new browser fixture type.
- `bun test` — PASS: 377 passed, 109 database-dependent skipped, 0 failed (486 total; 3,995 assertions). CC-018 focused tests: 12 passed, 1 database integration skipped, 0 failed (49 assertions).
- `bun run build` — BLOCKED by the sandbox: Turbopack worker process cannot bind its internal port (`EPERM`), consistent with the previous handoff's local limitation.
- `bun run test:e2e --reporter=dot` — INCOMPLETE: 15 passed and 17 failed after the local Next dev server returned `ERR_CONNECTION_RESET`/`ERR_CONNECTION_REFUSED` under the default four-worker run. A serial retry could not start the local web server. No CC-018 browser scenario was executed locally.
- `bunx playwright test -c playwright.cc018.config.ts` — BLOCKED locally: Next cannot bind loopback port 3111 (`EPERM`), and the shell has no matching loopback disposable `TEST_DATABASE_URL`/`DATABASE_URL` pair. CI now has a dedicated CC-018 job step after applying migrations and preparing auth.
- `git diff --check` — PASS after final application/test edits and before delivery.

## Coverage and remaining verification

- Pure tests cover deterministic lead/task/project ranking, Denver date classification, exact lead links, closed/completed exclusion, CRM SQL lifecycle filters, safe-field projections, empty/error rendering, and reschedule validation.
- A disposable PostgreSQL lifecycle regression now exercises reschedule, complete, closed/retired denial, and persistence; it is skipped locally without a test DB.
- Owner browser coverage checks anonymous authorization, exact lead/project actions, follow-up complete/reschedule persistence, task open/complete/create persistence, recent saved activity, pipeline labels, and 390px overflow. It remains to be run on the PR CI disposable database.
- The website CRM currently has no structured proposal amount. Overview therefore says potential revenue is “Not tracked.” No activity events are derived from CRM `updated_at`.
- CRM inquiries and `workspaces.primary` are existing single-owner sources; CC-018 adds no separate tenant or storage model. Existing owner checks are preserved.

## Planned verification

- Prioritization and pipeline selector unit tests, including America/Denver day boundaries, empty inputs, and no unsupported revenue estimates.
- Disposable database tests for stage/follow-up/stalled-lead selection, completion/reschedule persistence, retired/closed inquiry exclusion, owner authorization, and tenant isolation where applicable.
- Owner-authenticated browser checks for exact lead/project links, task create/open/complete, CRM complete/reschedule, mobile layout, empty and error states.
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
