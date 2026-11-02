# YS-SYS-001 production baseline and recovery evidence — 2026-11-02

## Evidence provenance

The Systems Directory facts below are from the owner-reported response of the temporary, owner-authenticated diagnostic running against the production `DATABASE_URL`. Provider mapping and recovery metadata were separately checked through the authorized Neon integration on 2026-11-02. The diagnostic execution timestamp and exact record-level evidence were not included in the material available to this review; keep those details in the approved private evidence store, not GitHub.

The exact endpoint, project, branch, record IDs, revisions, and fingerprints are intentionally omitted from this repository artifact. The endpoint-to-project mapping is confirmed in provider metadata; private identifiers are retained only in the approved private evidence record.

## Production identity and database baseline

| Evidence | Result |
| --- | --- |
| Provider and endpoint mapping | Neon endpoint from the owner-reported diagnostic matches the `website` Neon project’s primary/default `production` branch. The provider database lookup confirms `neondb`. This is a direct endpoint-ID match, not an inference from migrations or project name. |
| Database engine | PostgreSQL 18.6, from the owner-reported production diagnostic. |
| Migration ledger | `matches_repository`: 22 expected / 22 applied; all checksums match; migrations `0020` and `0022` applied. |
| Systems Directory | 7 entries, 11 audit records, 0 orphan audit records; all 7 entries are unarchived. |
| Audit protection | Append, immutability, and revision triggers enabled. Entry constraints: 1 primary key and 23 checks. Audit constraints: 1 primary key and 4 checks. |
| Audit-to-entry foreign key | None. Migration `0020` also defines no FK. Audit rows are immutable and retain `entry_id` independently; absence of the FK permits history to survive removal of a live entry. This is consistent with append-only retention, but no explicit rationale is documented in the migration. Keep the relationship application-level and verify orphan count during parity checks. |
| Exact row parity | Owner-reported response contained stable IDs, revisions, archive state, per-entry audit counts, and fingerprints for all seven rows. The values are not present in the reviewed evidence artifact, so exact seven-row parity is not independently reviewable here. Do not proceed to a production migration on aggregate counts alone. |

## Fingerprint and repeatable comparison procedure

The deployed diagnostic reports `md5(postgresql_jsonb_text_ordered_by_stable_key)`: entry fingerprints are PostgreSQL `md5(to_jsonb(entry)::text)`; audit fingerprints are PostgreSQL MD5 over JSONB-text audit rows concatenated in ascending audit ID order. These are opaque comparison tokens, not encryption. Preserve the exact algorithm if parity needs to be checked later; changing selected fields or serialization changes the result.

For an authorized pre/post comparison, retain the original owner-only response in the approved private evidence store. Run the same diagnostic against the same verified production endpoint immediately before and after an additive migration, using the same code version and canonicalization. Compare, without copying values to public GitHub:

1. Endpoint/project/branch/database identity and migration version/checksum result.
2. The sorted seven-entry stable-ID set, each revision and archived state.
3. Each entry fingerprint and per-entry audit count/fingerprint.
4. Total entry/audit counts, orphan count, and audit trigger/constraint summaries.

Require exact equality for all legacy IDs, revisions, archive flags, entry fingerprints, per-entry counts/fingerprints, and existing applied-migration checksums; require zero orphan audits. Record only pass/fail, aggregate counts, code revision, and UTC timestamps in public artifacts. Store the detailed comparison privately. New migration rows may change the migration ledger as expected; do not treat that as a legacy-data mismatch.

## Recovery readiness

- Neon project metadata reports a six-hour history-retention window and the `free_v3` plan.
- The provider reports no scheduled snapshot policy and no retained snapshots for the production branch at inspection time.
- Neon supports creating a branch from a parent timestamp/LSN within the available history window. Snapshot restore can target a new branch and can be previewed before a separate finalize operation. These are documented provider capabilities, not a tested recovery of this project.
- A pre-migration point should be within the current six-hour PITR window if migration begins promptly, but exact recoverable timestamps/WAL availability were not independently enumerated. Treat a usable point as **not yet verified** until the owner confirms the chosen timestamp in Neon.
- Restore has not been tested. No branch, snapshot, restore, backup configuration, or production connection was changed.
- Recovery procedure: owner selects and verifies a timestamp/LSN in Neon, creates a separate recovery branch without finalizing over production, validates the restored database and application compatibility, then follows a separately approved traffic/connection cutover and rollback plan. A restore to a new branch can expose writes made after the recovery point; estimate that exposure from the selected timestamp and business activity before any cutover. RPO/RTO have not been measured.
- Required before production migration: confirm a specific pre-migration recovery point, document who can restore and authorize cutover, agree acceptable RPO/data exposure, and test the procedure on a disposable branch/database. No paid snapshot schedule has been enabled or proposed for automatic purchase.

## Diagnostic retirement status

The owner-reported production query succeeded. The connected Vercel integration could not list the Website project (`0` matching projects) or deployments; prior project/environment lookups returned 404 and deployment lookup returned 403. No variable values were requested. Therefore the values of `YS_SYS_001_PREFLIGHT_ENABLED` and `YS_SYS_001_PREFLIGHT_WAF_CONFIRMED`, a subsequent Production redeployment, and the owner-authenticated 404 response are **unverified**.

The temporary mode is removed by this cleanup PR. After the PR is reviewed and merged through the normal GitHub/Vercel process, the owner must separately verify that the Production flags are false/removed and that the resulting Production deployment serves 404 for the mode while preserving the legacy leads diagnostic. Do not manually deploy or change production settings as part of this work.

## Readiness decision

- **PR 1 implementation: NO-GO for schema or migration implementation at this time.** The aggregate baseline is owner-reported and endpoint-mapped, but the exact private row-level evidence was unavailable for review. Recovery remains untested and the pre-migration point is not confirmed. Spec and disposable-database test preparation may continue; no production migration or activation is authorized.
- **Production migration: NO-GO.** Require private seven-row parity review, verified usable recovery point, tested disposable restore/upgrade/backout, owner-approved RPO/RTO and explicit production authorization.

No production SQL, DDL, data, configuration, backup, or deployment operation was performed by this review.
