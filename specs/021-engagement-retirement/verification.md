# Verification and release gates

Executed on Zorin 2026-10-27, Bun 1.4.2 / Node 26.10.0 / Next.js 16.4.2. Website packageManager declares Bun 1.3.14; local version differs. Base was freshly verified main after PR #65; existing draft PRs #67/#87 remain unmerged. All database targets were new loopback PostgreSQL 16.15 databases named with `_test`; no production database, credential, QuickBooks or provider was used.

- Ordered migration plan: 18 versions pass. Fresh migration, repeat application and a prepared 0017→0018 upgrade with synthetic pre-existing won inquiry pass; prior status and record retained.
- Migration rollback: transaction `ROLLBACK` removes new objects and preserves synthetic historical row. The retirement SQL suite itself rolls back all test rows. It checks unchanged historical win and content digest, retention exclusion after 365 days, unrelated archived purge, immutable audit, idempotent replay, stale digest, notification/converted scope rejection, forbidden update/delete/truncate and untrusted role privilege denial.
- Concurrency: a prior writer makes the expected digest stale; an incoming write after retirement is denied. Higher-isolation retirement is rejected. Both cases ran on synthetic database sessions.
- Task-specific readiness/model/migration checks: 20 pass. Full website suite with disposable database: **447 pass, 0 skip, 0 fail, 4,866 assertions**. Scaffold, migration check, lint, typecheck and production build pass; lint retains one existing navigation warning. `git diff --check` passes.
- Browser suite not run: existing Playwright cases cover public flows and separate customer readiness, not the owner lead list/retirement operator (no new UI or authenticated route). SQL/route checks cover this slice. No live owner UI, forecast, external integration or scheduled cron cycle was exercised.

## Acceptance convergence

A1 historical sales/evidence: digest, stored row, trigger guards and upgrade checks. A2 cancellation: Hub companion synthetic suite. A3 drafts: Hub companion suite and preview filter. A4 retention: website SQL and cron predicate. A5 stale/race/replay/role: both SQL and concurrency suites. A6 unrelated behavior: full suite and Hub conversion. A7 rollback: explicit transactional migration and operation rollback checks. The companion Hub verification is in its specification.

## Production gate

This PR alone is not launch approval. Preserve both registries and audit on application rollback. Requires reviewed production schema/base revisions, role separation (runtime role must lack retirement table/function privileges), independently stored and tested backup/key recovery, legal retention decision, exact ID/fingerprint authorization, no in-flight delivery/task work, maintenance window, two-database order, deployed-code compatibility and post-change read-only verification. Direct production migration or function invocation, merge and deployment are separately authorized actions. Schema owner/superuser can bypass trigger immutability; qualify operator privileges and export audit to approved custody. Converted website inquiries require a separate scoped design.
