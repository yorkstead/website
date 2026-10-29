# CC-014 verification and operational limits

## Revision and environment

- Base: live `origin/main` `3c37dc43118fbd3c4c38b7fd457c3c6418640567`, verified 2026-10-28 after a transient DNS failure.
- Branch: `feat/cc-014-production-readiness-recovery`, in the user's existing checkout; no worktree created.
- Local runtime: Bun 1.4.2, Next.js 16.4.2. The package manifest pins Bun 1.3.14 for CI.
- No production URL, Neon control plane, provider console, database, customer account or credential was contacted. No migration was applied, backup queried, restore executed, deployment or production setting changed.

## Verified locally

- `bun test lib/operations-observability.test.ts components/dashboard/operations-readiness.test.tsx`: 11 pass, 0 fail (54 assertions). Covers status classification, owner authentication before dependency observation, generic failures/private headers, Neon identity remaining unverified, separate backup/restore evidence freshness, and rendered owner readiness/recovery guidance with no mutation control.
- `bun run yorkstead:check`: pass; 23 active spec directories.
- `bun run db:migrate:check`: pass; 18 migration plans (0001–0018) validated. CC-014 adds no migration.
- `bun run lint`: pass with one existing warning in `components/login-panel.tsx` (`window.location.assign` navigation).
- `bun run typecheck`: pass.
- `bun test`: 354 pass, 105 PostgreSQL-dependent skips, 0 failures (3,898 assertions). The skipped tests require `TEST_DATABASE_URL`, which was not configured; no database was used.
- `bun run test:e2e --grep 'CC-013 Operations access boundaries'`: 2 pass. Public health remains liveness-only; anonymous Operations page redirects; the Operations API returns 401 with private headers and exposes neither credentials nor deployment IDs. Browser checks ran against local Next development server only; no owner database session was used.
- `git diff --check`: pass.

## Build limitation

- `bun run build` fails because Turbopack cannot create its CSS worker process/bind a port (`Operation not permitted`) in this environment. An escalated retry fails the same way.
- `bun x next build --webpack` also fails before compilation with `Could not parse output from TypeScript's --showConfig`. `bun run typecheck` passes independently.
- Production build is not verified in this session. No production operation was attempted to compensate for this local limitation.

## Recovery and identity limits

- The page documents Neon organization `org-aged-leaf-21920027` and project `old-boat-18584731` as owner-facing deployment context. It does not establish that a deployed database belongs to those IDs. A bounded successful query proves only connectivity to the configured database.
- The API checks runtime environment and database configuration presence without returning any environment value. It does not inspect or parse the database connection string.
- The application has no trusted source for external backup availability/freshness or independent restore-test evidence; both controls remain `not_verified` in production output. The model supports separate evidence ages but production does not supply evidence.
- The recovery sequence is documentation only. No provider call, restore, cutover, rollback, schema mutation, customer activation, alert delivery, merge or deployment occurred.
- This feature does not establish production readiness, backup existence, restore capability, RPO/RTO, tenant data integrity after recovery, or current production provider identity.

## Rollback

Revert the CC-014 source and documentation changes. No database rollback or provider change is required. A future production restore or cutover requires a separate plan, exact-target verification, independent backup and restore evidence, explicit authorization, and its own rollback trigger; source rollback alone is not database recovery.
