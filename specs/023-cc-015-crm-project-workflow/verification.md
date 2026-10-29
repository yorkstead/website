# CC-015 verification and rollback

## Verification

- `bun run yorkstead:check` — pass; scaffold reports 24 active specs and required scripts.
- `bun run db:migrate:check` — pass; all 18 ordered migrations validate. No migration was added.
- `bun run lint` — pass with one pre-existing `components/login-panel.tsx:62` warning about `window.location.assign`.
- `bun run typecheck` — pass.
- `bun test` — 362 pass, 107 skip, 0 fail (3,934 assertions). The skipped tests are database-backed because `TEST_DATABASE_URL` is not configured in this environment. This includes integration coverage for empty-workspace conversion, tenant isolation, and follow-up lifecycle persistence; those require the repository's disposable PostgreSQL test setup.
- Production build — pass via `node node_modules/next/dist/bin/next build --webpack`; Next.js compiled, type-checked and generated all 84 static pages. The normal Turbopack build could not start its CSS worker because the sandbox denied local worker-port binding. Webpack exposed two existing client/server import leaks (`node:crypto` from the workflow lead helper and the consultations data module); the shared hash now uses Web Crypto and consultation view types/status live in a pure model module.
- Browser suite — 31 of 32 cases passed in both full runs. The unrelated public navigation crawl takes about 32 seconds locally and exceeded the suite's existing 30-second case timeout. The isolated crawl passed in 32.3 seconds with a command-line-only 90-second timeout. No test source or repository timeout was changed.
- `git diff --check` — pass before final documentation and delivery edits; rerun before commit.

## Scope and data safety

No migration, production connection, production record operation, customer-access change, fabricated data, manual deployment, or merge was performed. All synthetic lifecycle fixtures are confined to gated test transactions. Follow-up updates continue to use the existing `contact_inquiries.follow_up_at`; conversion continues to use the existing atomic `workspaces.primary` write and idempotency key/link.

## Rollback

Revert the CC-015 application commit to restore the previous lead pipeline, Command Center links and project detail presentation. There is no database migration or data backfill to reverse. Any follow-up completion/reschedule or conversion performed later by an authorized owner uses existing business operations and is not undone by a code rollback; handle such records through the owner UI according to the inquiry lifecycle. Preserve existing workspace/project history.

## PR #70 database test correction

- CI run [40794371585](https://github.com/yorkstead/website/actions/runs/40794371585) was for PR #70 head `b58b5ece8f1cbcacaa0af78866f2e0e2f7193aee` and used its disposable PostgreSQL 16 service. Its two failures were test fixture issues: the archived row omitted the `archived_at` value required by the existing check constraint; and PostgreSQL returns `BIGSERIAL` identifiers as strings, while the follow-up helper correctly requires safe numeric IDs. The follow-up test's incorrect `id:number` annotation hid that mismatch and caused an early `false` before the update SQL ran.
- Correction sets `archived_at=NOW()` in the archived fixture and explicitly converts/asserts safe numeric IDs for active, closed, and retired follow-up/conversion fixtures. This preserves and directly exercises the archive, retirement, closed-record, and authorization protections; no application SQL or schema constraint is weakened.
- Follow-up CI run [40794937378](https://github.com/yorkstead/website/actions/runs/40794937378) passed both conversion database tests, confirming the archive and tombstone cases. It exposed one more fixture mismatch at the first bucket assertion: IDs read by the follow-up list query also arrive from PostgreSQL as strings, so those are now normalized before comparing to inserted IDs.
- After correction, `bun run yorkstead:check`, `bun run db:migrate:check`, `bun run lint`, `bun run typecheck`, and `bun test` pass locally (362 pass, 107 database-dependent tests skip, 0 fail). Local `bun audit` is blocked by registry DNS; the local environment has no configured test database and Docker socket access is denied. The pushed PR-head CI run is the disposable PostgreSQL integration and full required-check verification; record its exact head, run URL, and result here after it completes.
