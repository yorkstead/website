# YS-SYS-001 discovery record — 2026-11-01

## Evidence and verification boundary

- GitHub repository metadata identifies `yorkstead/website` as a public repository whose default branch is `main`.
- GitHub resolves `main` to `9070c538277cccf852a3fc0efc214fe65238c1fa`. The clean PR 0 checkout is based on this exact SHA.
- Vercel's latest production deployment for project `website` is READY and reports source branch `main` and source SHA `9070c538277cccf852a3fc0efc214fe65238c1fa`. This verifies deployed source revision only; it does not prove which database is bound or whether its migration state matches source.
- The shell's GitHub DNS lookup failed during this session. GitHub and Vercel connector evidence supplied the remote branch/deployment facts; no `git fetch` or GitHub Actions query was possible through the shell.
- Issue [#86](https://github.com/yorkstead/website/issues/86) supplies the YS-SYS-001 request and source requirements. The named source file `YS-SYS-001-Systems-Registry-Upgrade(1).md` is not present in this checkout; issue #86 is the available source snapshot.

## Authoritative implementation

CC-023 is the authoritative Systems Directory implementation. Preserve and extend these existing surfaces:

- Owner-only App Router page: `app/dashboard/systems/page.tsx`.
- Existing client interface: `components/dashboard/systems-directory.tsx`.
- Server-only service/runtime and HTTP boundary: `lib/system-directory-service.ts`, `lib/system-directory-runtime.ts`, and `lib/system-directory-http.ts`.
- Compatibility endpoints: `/api/systems-directory` and the existing systems overview endpoint. Keep existing page, route, DTO, authorization and audit behavior compatible.
- Existing persistence: migration `migrations/0020_systems-directory.sql` creates `system_directory_entries` and `system_directory_audit`. The entry table is owner-scoped to `yorkstead-owner`, has stable UUID IDs, optimistic revision numbers, billing/renewal fields, manual health, relationships, archive state and uniqueness on normalized name/provider. The audit table stores actor, action, revision, before/after snapshots and timestamp. Database triggers create audit rows on insert/update and reject update/delete/truncate of audit history.
- Migration `0020` contains schema only; it does not seed the seven records. The ordered migration manifest/checker governs subsequent migrations. New schema work must use the next free migration number at implementation time and pass `bun run db:migrate:check`.

## Seven-record and audit baseline

The handoff and issue cite seven original records and a historical displayed subtotal of $76.40/month. That subtotal is historical, not a verified current total. It must not be used as a financial assertion or recreated as seed data.

The only accepted baseline for the seven rows and their audit histories is a separately reviewed, read-only query against the database actually bound to production, using an approved operator session and a redacted output procedure. This session did not inspect environment values, access a production database, or make a production request. Therefore current database target, row count, exact IDs/fields, audit row counts/fingerprints, and production migration ledger are **unverified**. PR 0 records this gate explicitly; no local fixture, source default, or historical handoff is a substitute.

Before PR 1 schema design is approved, collect a read-only evidence bundle containing: opaque database/provider identity sufficient to distinguish the target (no hostname, secret, or credential); migration ledger rows; entry count; all seven stable IDs and field-presence checks with sensitive note/account content redacted; counts per entry for immutable audit rows; and deterministic per-entry audit fingerprints computed over canonical redacted metadata. Store no credentials, raw production notes, secrets, or customer data in GitHub. If the exact seven rows cannot be reconciled, pause schema/backfill work and investigate through an approved channel.

## Existing architecture and boundaries

- `.specify/memory/constitution.md` requires behavior-first specifications, additive preservation, verification, resumable slices, least privilege and safe data handling.
- CC-023 is an owner-only private feature. Reuse `getOwnerSession`, server-side database access, same-origin mutation checks, bounded input, no-store responses and the fixed Yorkstead owner scope.
- Existing manual health is not a monitoring guarantee. Preserve `unknown`, `not_monitored`, stale and unavailable distinctions; never infer monitoring success.
- Existing cost fields distinguish cadence, basis and confirmation. New summaries must distinguish actual, estimated and unknown, and deduplicate shared entitlements without fabricating zero/free status.
- Do not add advertising identifiers, browser database access, sensitive operational fields to public intake, third-party provider credentials, probes, background polling, or provider writes.
- Do not couple this work to CC-026 Opportunity Discovery or the PWA. It must not delay MKT-QR-001's print-critical tracked URL work.

## Environment and dependencies

- Website source deployment is verified at current `main` SHA as above. Production database identity/schema/data and migration application are not verified.
- CC-026 is included in current `main` and the production source deployment. Its migration `0022_opportunity-discovery.sql` is present in the source, but production migration completion/database identity is not independently verified here.
- Live Hub follow-up at `2026-11-01T23:28:04Z`: Hub default branch is `main` at `02c21a31784de965ce35d1af8c6cedcfd57230f2`; PR #93 is closed and merged into that tip. The latest Vercel production deployment is READY at this source SHA. The incident record states that the CC-022B shopping/idempotency and CC-022 command/audit tables were absent in the 2026-10-30 read-only Neon inspection and that ordered production migrations remain a separately approved required action; no later migration execution is evidenced by the reviewed PR/handoff. This confirms the code-side incident patch is deployed, not that shopping capture is recovered. Reverify current production schema/recovery through separately authorized read-only evidence before any release coordination. YS-SYS-001 does not depend on Hub schema, capture recovery, or deployment.
- MKT-QR-001 is issue #85 and is print-critical before sticker printing. It is a separate workstream and not a prerequisite for the Systems Registry.
- No roadmap document exists in the current tree despite historical references to `docs/MASTER-ROADMAP.md`. This PR adds `docs/ROADMAP.md` as the repository's current cross-workstream sequencing page and links to detailed specs/issues.

## PR 0 decision and unresolved evidence

Decision: extend CC-023's existing tables, service, routes, UI and audit stream; do not create a second registry or replace compatibility surfaces. Introduce additional typed records and relationships only through additive migrations after the production baseline is captured. Keep any new activation behind a default-off server-side control and retain a no-write/read-only discovery path.

Open evidence gates before implementation PR 1: production database binding, migration ledger, seven-row identity/field reconciliation, and audit history counts/fingerprints. Automation Hub recovery remains a separate cross-project gate: its code diagnostic is deployed, while production schema/migration recovery is not established by the current evidence. No production values or identifiers are copied into this repository.
