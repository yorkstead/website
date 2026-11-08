# Application-recovery rehearsal verification

## Local checks

- `bun run yorkstead:check`: PASS (39 active specifications).
- `bun run db:migrate:check`: PASS (validates all 24 ordered repository migrations; applies none).
- `bun run typecheck`: PASS.
- `bun run lint`: PASS with one pre-existing warning in `components/login-panel.tsx:62`.
- `bun test`: PASS, 495 passed / 121 PostgreSQL-backed tests skipped / 0 failed. Skipped local PostgreSQL checks are not treated as passing; the dedicated CI jobs below execute disposable database coverage.
- Recovery Playwright discovery: PASS (one test). Shell syntax and `git diff --check`: PASS.
- Local production build: BLOCKED because the environment cannot reach existing Google Fonts. The exact-head CI production application build passed.

## Exact-head CI evidence

- PR #111 implementation head: `290e058a818456d02156aa113ed8c358066e39a5`.
- GitHub Actions [run #42353868907](https://github.com/yorkstead/website/actions/runs/42353868907) (run 673): all four jobs PASS, including the isolated PostgreSQL 18 restore/recovery, application verification, read-only role verification, and restored-app readiness.
- Vercel Preview for that head: Ready.
- Sanitized artifact: aggregate readiness report only; no records, credentials, hostnames, or logs. Its reported total synthetic rehearsal duration was 147 seconds.

| Requirement | Evidence | Status |
|---|---|---|
| Disposable PostgreSQL 18 source and restored target | Dedicated exact-head CI job | PASS |
| Migration ledger through 0022 with canonical checksums | Read-only before/after verifier | PASS |
| Migrations 0023/0024 absent | Ledger and schema-object checks | PASS |
| Directory integrity and protection triggers | Before/after summaries match | PASS |
| Production application starts against restored target | Isolated runtime HTTPS proxy, standard port 443 | PASS |
| Synthetic Better Auth sign-up/sign-in and owner authorization | Recovery Playwright test | PASS |
| Dashboard and empty legacy Directory reads | Recovery Playwright test | PASS |
| Anonymous denial and tenant selector rejection | Recovery Playwright test | PASS |
| Actual-session cross-tenant denial | Existing database integration suite against restored target | PASS |
| Runtime egress block | Docker internal network, exact membership, app-container TCP probe | PASS |
| External side effects disabled | No integration credentials or workers; isolated network | PASS |
| Full Production-derived 60-minute RTO | Requires separate authorized end-to-end recovery exercise | NOT RUN / NOT DEMONSTRATED |

The source schema-preparation failure occurred once before safe phase diagnostics existed. It did not recur on later runs; its original cause remains unconfirmed. Other CI corrections normalized Docker's extra blank line in membership output while preserving exact membership, and changed the synthetic HTTPS proxy to standard port 443 because the production authentication configuration correctly rejects custom ports. The proxy has only the `NET_BIND_SERVICE` capability; production auth behavior was not relaxed.

## Interpretation

The 147-second measurement covers the synthetic CI rehearsal only. It is not a Production-derived RTO result and does not establish readiness of the owner-reported restored Production-derived database. No Production or R2 access, Production migration, or Registry activation occurred.

## Review corrections — 2026-11-07

- Existing PR head `d178dc7789f87647b971714cca3d9ef899544b02` was verified open with all four CI jobs and Vercel Preview successful before corrections. That head still lacked a failure category, used one generated PostgreSQL superuser for both schema administration and application runtime, and checked only the dashboard HTTP status.
- Added diagnostics regression tests for fixed categories/phases, four-digit migration versions, validated SQLSTATEs, bounded output, and suppression of SQL/data/credential text.
- Separated generated synthetic administration and runtime credentials. The application and restored-target cross-tenant test suite now connect as a verified non-superuser with no database/schema/table creation, role administration, superuser, RLS bypass, temporary-table, truncate, or administration-role membership privileges; its grants cover application table DML and generated sequences.
- The authenticated browser workflow now checks the visible dashboard heading and supporting copy. This is a rendered-content assertion after successful synthetic owner authorization.
- Local: offline frozen dependency install passed without lockfile changes; scaffold, all-24 migration plan check, lint, typecheck, focused diagnostics (2/2), full Bun tests (497 pass / 121 database skips / 0 fail), Playwright discovery, shell syntax and `git diff --check` passed. Docker-backed readiness could not run locally because Snap confinement refused the Docker client; the local production build could not fetch Google Fonts.
- Initial exact-head run `42415249052` identified generated admin-name allowlist mismatches in the preparation and integrity helpers. The admin role retained the previously accepted generated name, while the runtime role remains separately generated; these checks then passed.
- Final corrected implementation head `21f281e21705041faa551306c4168d22ae40d808`: GitHub Actions [run 42415700933](https://github.com/yorkstead/website/actions/runs/42415700933) passed all four jobs: application verification, isolated synthetic recovery rehearsal, restored-app readiness, and synthetic read-only role verification. Vercel Preview passed at [deployment HR15PcoKhfy8fo5BLfyHtwppMXYo](https://vercel.com/yorkstead/website/HR15PcoKhfy8fo5BLfyHtwppMXYo). Readiness output confirmed PostgreSQL 18 restore, the non-superuser app role, owner dashboard, tenant denial, and blocked egress; elapsed synthetic rehearsal was 147 seconds. This is synthetic timing only.
- Restrictions remain: no Production or R2 access; migrations 0023/0024 were not applied; both networks were Docker `--internal` and the app-originated egress probe was blocked; no merge or manual deployment. Full Production-derived 60-minute RTO remains NOT DEMONSTRATED.

## Runtime privilege correction — 2026-11-07

- The independent review found the preceding runtime role still had blanket `SELECT, INSERT, UPDATE, DELETE` on every table and `USAGE, SELECT, UPDATE` on every sequence. This correction removes blanket DML and sequence grants while retaining the distinct generated synthetic administrator for schema preparation, migrations and restore.
- Runtime table rights are catalog-audited against explicit operation allowlists. It has `SELECT` across the existing application schemas, `INSERT` only on application write targets and app-triggered append-only audit tables, `UPDATE` only on tables with application update/upsert paths, and `DELETE` only on explicit deletion/retention paths. `public.application_migrations` remains readable but has no write, truncate, or ownership privileges. Auth writes are restricted to Better Auth's `user`, `account`, `session`, and `verification` tables.
- Runtime sequence rights are `USAGE` only on the generated-ID sequences required by application inserts and their audit triggers: `workspace_snapshots_id_seq`, `contact_inquiries_id_seq`, `conversion_events_id_seq`, `opportunity_history_id_seq`, `portal_release_evidence_id_seq`, `client_project_publication_audit_id_seq`, `client_access_admin_audit_id_seq`, `document_audit_events_id_seq`, `portal_release_audit_id_seq`, `system_directory_audit_id_seq`, and `customer_mail_audit_id_seq`. The application uses `INSERT ... RETURNING`, not `currval`, so sequence `SELECT` is not granted. `UPDATE` is denied on every sequence; all other sequences in the synthetic schemas are denied.
- Executable synthetic checks cover INSERT/UPDATE/DELETE/TRUNCATE denial on the migration ledger; `nextval` denial on an unapproved sequence; `setval` denial on an approved application sequence; and schema/role/grant denial. Catalog checks verify the runtime has no object/database/schema ownership, no role memberships, no create/temp/database-role privileges, no RLS bypass, no grant option, and no admin-role membership. The existing authenticated app and cross-tenant integration checks run using the runtime URL.
- Local verification after the grant and retry corrections: `bun run yorkstead:check`, `bun run db:migrate:check` (checks the ordered plan only; applies no migrations), `bun run lint`, `bun run typecheck`, `bun test` (498 passed / 121 database-backed skipped / 0 failed), Playwright recovery discovery, shell syntax and `git diff --check` passed. Local Docker is unavailable, so Docker-backed privilege probes and restored-app workflows require exact-head CI. Local `bun run build` was blocked by the sandbox refusing Turbopack's child process/port binding; exact-head CI must supply the production-build result.
- Run `42423511017` at `357c57508a98b34a5166821c44a02763db7cc405` passed application verification, isolated recovery, and the separate synthetic read-only-role check; restored-app readiness failed during grant setup because the initial allowlist referenced billing tables introduced only by excluded migrations 0023/0024. The rehearsal stopped before starting the application, and cleanup removed its disposable resources. Those tables were removed from the synthetic 0001–0022 manifest.
- Run `42423840371` at `6c9fccb9c663f4ed40eadc5dcf94175d0c9be9d3` passed the full application test/browser/build job, isolated recovery, and separate read-only-role job. Its restored-app readiness failed on both attempts during the initial empty-source query with a sanitized connection-failure category, before runtime grants or app startup. Added a five-attempt, bounded retry only for connection-class errors at that initial query; SQLSTATE/application/schema failures are not retried. This new retry change needs exact-head CI.
- Run `42425024304` at `ae2c1930418ddfc4c19c980141079856b9f0b602` failed restored-app readiness on `system_directory_relationships`, a table created only by migration 0023; this was before app startup. The table has been removed from the runtime write allowlists. Exact application-job conclusion for that run is pending as of this update.
- Run `42425679396` at `77829a731a7b06b36d31e5820dab85b141fd2308` passed synthetic source schema preparation and per-table grants, then failed inside the sequence ACL audit when PostgreSQL evaluated `has_sequence_privilege` against a TOAST catalog relation. No privilege-negative probes or app startup ran. The sequence audit now reads `pg_sequences`, which yields only actual sequences; exact-head CI is pending.
- Run `42426277124` at `6b6ca0103298391533cd34a36fe068ed86f9dab6` passed source prep, table grants, role catalog checks, and the corrected sequence audit, then failed when the test attempted to grant SELECT back to the runtime role itself. That was an invalid escalation probe because the role already had SELECT; it did not add privilege.
- Run `42427191450` at `ef021e577aeecbc553232517c61043ab49456236` reached the INSERT self-grant probe. PostgreSQL returned success for `GRANT INSERT`, but the command result alone does not prove the ACL changed. The probe now checks the runtime's effective INSERT privilege inside the rollback-only transaction, and a catalog audit checks grant options across all application tables and sequences. Exact-head verification is pending.
- Vercel Preview for `6b6ca0103298391533cd34a36fe068ed86f9dab6` is Ready. Synthetic success still does not demonstrate Production-derived recovery, achieved RPO, retention expiry/deletion, or the complete 60-minute RTO. Production and R2 remain untouched, and Production migrations 0023/0024 remain unapplied.

### Owner authentication grant correction — 2026-11-07

Exact-head run 42428086949 at 90d599f651747ddda313b6e91f42bcdf4dd9f301 passed the catalog privilege checks and the executable migration-ledger write, self-grant, schema/role, and sequence-denial probes. It then failed owner registration with HTTP 422. The owner Better Auth pool uses the `public` schema; the prior DML list granted auth operations only on `customer_auth`. Added DML for only `public.user`, `public.account`, `public.session`, and `public.verification`, matching Better Auth's owner registration/sign-in/session paths, and included these exact public auth tables in the update/delete audit allowlists. Existing `customer_auth` grants remain limited to the four Better Auth tables used by customer workflows. The migration ledger remains read-only. New exact-head CI is required to confirm authenticated registration, rendered dashboard, tenant isolation, restored workflows, and unchanged synthetic/network restrictions.
