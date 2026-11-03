# YS-SYS-001 production identity and preservation baseline — 2026-11-02

## Verified source and provider identity

Live GitHub reports default branch `main` at `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`; migrations `0020` and `0022` are present and current main contains 22 numbered application migrations. PRs #87–#89 are merged. PR #90 is a separate draft cleanup and is not merged.

The owner reports that the temporary diagnostic ran against the production `DATABASE_URL`. Its returned endpoint ID was matched by exact Neon endpoint metadata to project `website`, primary/default branch `production`, database `neondb`. PostgreSQL reports version 18.6. This is an exact provider endpoint match; migration counts alone were not used to establish identity. Public repository artifacts intentionally omit endpoint/project/branch IDs, all row-level identifiers, and fingerprints.

## Owner-reported production result

The diagnostic reported:

- Migration ledger `matches_repository`: 22 expected, 22 applied; all checksums match; migrations `0020` and `0022` are applied.
- Seven `system_directory_entries`, eleven `system_directory_audit` events, zero orphaned audit events, and all seven entries unarchived.
- Append, audit-immutability, and revision triggers enabled.
- Entry constraints: one primary key and 23 checks. Audit constraints: one primary key and four checks. No audit-to-entry FK.

The exact diagnostic execution time and private per-entry payload were not made available in this review. The aggregates are owner-reported; exact seven-record parity has therefore **not** been independently verified. Retain the private response through the approved private evidence channel. Do not attach it to an issue or PR.

## Private seven-entry / eleven-event parity procedure

Before implementation, have an independent reviewer inspect the private baseline for exactly seven stable entry IDs and eleven existing audit events. Verify the sum of per-entry audit counts is eleven, orphan count is zero, revisions and archive state match the owner response, and all seven entries are unarchived. Reconcile each entry's legacy material values (including account-label, cost, URL, note, renewal, and relationship fields) inside the private evidence record; do not publish these values.

The diagnostic fingerprints are PostgreSQL MD5 comparison values, not signatures:

- Entry: `md5(to_jsonb(entry)::text)`.
- Audits: `md5(coalesce(string_agg(to_jsonb(audit)::text, newline ORDER BY audit.id), ''))` per entry.

The original entry hash includes every current column. If migration 0023 adds columns, its whole-row entry fingerprint will change even when all legacy values are preserved. Before/after migration checks must therefore compare an explicit, versioned projection of the original migration-0020 columns and hash that projection separately. Do not misclassify a changed whole-row hash as data loss. The audit table is not changed by the proposed foundation migration, so all eleven audit records, per-entry counts, and original audit fingerprints must remain exactly unchanged.

For an authorized comparison, independently re-confirm the production endpoint/project/branch/database before capture and after migration. Retain both raw diagnostic responses and projected values only in approved private storage. Public evidence should state only the verification timestamp, code/migration revision, aggregate counts, and pass/fail. Required post-migration checks:

1. Exactly the same seven IDs, revisions, archive values, and explicitly projected legacy fields.
2. Exactly eleven original audit events with unchanged per-entry counts and audit fingerprints; zero orphans.
3. Existing entry/audit trigger behavior and constraints remain valid; audit update/delete/truncate is still rejected.
4. Migrations 0001–0022 retain their prior checksums; 0023 is applied with the reviewed checksum.

## Audit foreign key

Migration 0020 intentionally defines `entry_id` without a foreign key to `system_directory_entries`; the immutable audit table can retain history independently of a live entry. This is consistent with append-only retention, but the migration contains no explicit rationale. Keep the no-FK behavior in PR 1 and continue checking the zero-orphan invariant. Do not add an FK or cleanup policy that could delete or block retained history.

## Current recovery gate

Read-only Neon metadata was rechecked on 2026-11-02: the matched project reports six-hour history retention and plan `free_v3`; no snapshot schedule or saved snapshots were listed. A specific currently usable point was not confirmed and no restore was tested. See [`recovery-runbook.md`](./recovery-runbook.md) for the point-in-time options, durable backup choices, disposable restore rehearsal, data-exposure assessment, and required owner approvals.

## Readiness

- **PR 1 design and disposable verification preparation: GO.** Current main ends at migration 0022; 0023 is the next repository candidate. The proposed design and compatibility contract are in `plan.md`.
- **Production migration: NO-GO.** Close the private row-level parity review, verify the chosen recovery point and backup durability, pass the disposable restore/migration rehearsal, establish accepted RPO/RTO and reconciliation ownership, and obtain separate scoped production authorization first.
- No production query, data/DDL write, backup mutation, environment change, branch creation, merge, or deployment was performed in this readiness update.
# Historical diagnostic record — superseded for release gating (2026-11-03)

The owner has retained the currently configured databases and stopped former-database recovery. The historical seven-entry/eleven-audit baseline and its private row-level parity review are **not** current requirements. Do not use the counts or fingerprints below as a current pre-migration baseline. Use [`activation-runbook.md`](activation-runbook.md) to prepare a new prospective baseline of whatever data is present before any separately authorized Production migration. The diagnostic facts below remain historical, owner-reported source evidence only.
