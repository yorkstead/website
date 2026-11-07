# YS-SYS-001 — Disposable application-recovery rehearsal

**Status:** Implementation slice for the synthetic, container-isolated application-readiness phase following PR #110.

## Goal

Provide a repeatable CI rehearsal that creates a synthetic database at the migration-0022 contract, archives and restores it into a fresh PostgreSQL 18 container, then exercises the production-built website against only that restored database.

## Scope

- Use generated synthetic database credentials, synthetic owner and customer accounts, and fictional records only.
- Use a generated administration login only for schema preparation and restore. Run the application and its database-backed access tests as a distinct non-superuser role with only database connect, schema usage, table DML, and sequence usage privileges; it cannot create databases, roles, schemas, or tables.
- Build and run the website in a disposable container. Keep the migration source on a separate Docker `--internal` network; place only the restored target, app, test proxy, and optional egress probe on a second `--internal` runtime network.
- Verify the network boundary independently through Docker network metadata and a failed outbound TCP probe from the application container on that network.
- Run migrations 0001–0022 only on the synthetic source database. Preserve the archive/restore database state at 0022; require 0023/0024 to be absent before and after application tests.
- Authenticate a synthetic owner through the existing Better Auth bootstrap/sign-in flow; check the owner session, dashboard, empty legacy Systems Directory API, and unauthenticated denial.
- Run the existing database-backed customer publication integration suite against the restored target; it creates two fictional tenants and verifies that sessions cannot read the other tenant's project.
- Compare sanitized schema, migration, legacy Directory, and protection-trigger checks before and after app tests. Keep application logs and any transient synthetic dump out of artifacts.
- Emit a redacted report containing only status values, counts needed for acceptance, UTC timestamps, and elapsed durations. Do not claim the complete Production-derived 60-minute RTO.

## Isolation and side-effect controls

- The workflow has `contents: read`, no deployment/environment secrets, and no Production or Cloudflare credentials.
- Runtime application, proxy, and Playwright browser containers join only an internal Docker network. No database, application, proxy, or browser port is published. The browser reaches the proxy by its Docker network alias. Host-side fixed schema helpers may reach only database IPs verified against their inspected internal subnets.
- The app receives only generated synthetic database/auth values and explicit local configuration. It receives no provider tokens, job secrets, webhook credentials, payment credentials, or email API keys. Cron secrets are absent; analytics is disabled; no scheduler, queue worker, integration worker, email sender, payment action, or webhook consumer is started. External requests that application code may attempt have no route out of the Docker internal network.
- Analytics is explicitly disabled. Cron endpoints have no cron secret. Email, payment, push, webhook, queue, and provider integrations have no credentials or reachable egress; they are not invoked by the smoke suite.
- Build-time dependency downloads occur in the dedicated CI job before runtime isolation is exercised. The source and runtime networks are both internal; a TCP egress probe runs on the restored-app runtime network and must fail.
- The target database is destroyed with its container and volume after the run. The temporary plaintext synthetic archive is private and removed on every exit path; CI uploads only the aggregate JSON report.

## Acceptance criteria

1. A fresh synthetic source reaches exactly migration 0022 with canonical repository checksums; Auth schema preparation is synthetic-only and does not advance the application migration ledger.
2. A custom-format archive restores successfully to a fresh PostgreSQL 18 target before the app starts.
3. Integrity checks pass before and after: migration ledger 0001–0022, no 0023/0024 objects or ledger entries, empty legacy Directory entries/audits, no Directory audit orphans, and required legacy audit/revision triggers enabled.
4. Docker reports an internal network, runtime app containers are attached only to it, and a container-originated outbound TCP probe fails.
5. The production-built app runs against the restored DB through the verified non-superuser runtime login. A synthetic owner signs in through Better Auth, receives owner authorization, and the authenticated `/dashboard` page visibly renders its expected overview heading and supporting copy. The read-only legacy Systems Directory loads; anonymous access is denied and tenant-selector injection is rejected.
6. The existing database-backed customer projection tests pass against the restored schema, including actual synthetic Better Auth sessions and denial of cross-tenant project reads.
7. No external service credentials or side effects are configured. The returned report contains no credentials, tokens, hostnames, row-level identifiers, or raw application records.
8. Record schema-preparation time, archive/restore time, app startup/readiness time, test completion time, and total synthetic rehearsal elapsed time. The total is not labeled as a Production RTO measurement.
9. Schema-preparation failures emit only a bounded fixed category, phase, optional four-digit migration version, and optional validated five-character SQLSTATE; raw SQL, credentials, and database contents are suppressed.

## Non-goals and release limits

- No access to Production, Cloudflare R2, historical recovery containers, or real business/customer records.
- No Production database role/configuration changes, backups, migrations, deployments, or Registry activation.
- No application migrations 0023/0024, even in this application-readiness target; separate migration rehearsals remain distinct.
- No real owner credentials/passkeys, email, payment, webhook, or external provider testing.
- No claim that the full 60-minute RTO passed. It remains unproven until a separately authorized end-to-end Production-derived exercise reaches verified service readiness.
