# YS-SYS-001 controlled Production migration and activation runbook

**Status:** Preparation only. This document is not authorization to query Production, export data, back up/restore, run migrations, change configuration, deploy, or activate the feature flag.

## Current baseline decision

Keep the currently configured Production and Preview databases. Do not pursue former-database recovery. The former seven-entry/eleven-audit evidence is historical and no longer a parity gate. Before a future migration, capture a new prospective baseline from the then-current Production database, allowing an empty, partial, or populated inventory. Preserve whatever entries, revisions, relationships, billing/monitoring evidence, and append-only audit history are actually present.

Recovery planning policy: daily encrypted PostgreSQL custom-format dump, 30-day retention, 24-hour RPO, 60-minute RTO target. The owner is sole operator and approver; the single-person risk exception must be acknowledged. Synthetic R2 transport/encryption and recovery-key retrieval tests are owner-reported PASS. Production export, actual artifact retrieval/restore, expiry enforcement, and measured RTO remain unverified. The first export, recurring schedule, restore, migration and activation each require separate explicit authorization.

## Gate 0 — release candidate and ownership

1. Verify the exact production source deployment and that it is Ready.
2. Through an approved private path, confirm the runtime binding identifies the retained intended Neon production project, branch, endpoint and database. Do not disclose a DSN, hostname, account identifier, or credential publicly.
3. Confirm the current production Vercel build wrapper remains migration-free. Do not treat a Git merge or Vercel deployment as a migration operation.
4. Name the owner/operator, record the single-operator exception acknowledgment privately, and confirm the owner-controlled cancellation and incident contact procedure.

**Stop** on any identity mismatch, inaccessible authorization, unknown build/deployment change, or inability to verify the intended target.

## Gate 1 — read-only schema and data preflight

1. Using only an approved read-only production path, query the migration ledger and confirm actual applied versions/checksums. Do not assume 0022 from an earlier diagnostic. Do not proceed if 0023 or 0024 is partially or unexpectedly applied.
2. Inspect only schema prerequisites, required tables/columns/indexes/constraints and revision/audit triggers for migrations 0023 and 0024. Confirm legacy routes and DTOs are from the deployed candidate.
3. Record an aggregate count and deterministic, versioned prospective fingerprint of the actual current inventory and audit scope, including empty results. Capture UTC time, production identity evidence, deployed SHA, tool/method versions and source provenance privately. Preserve the private artifact outside public GitHub and CI logs.
4. Independently retrieve and integrity-check the encrypted baseline artifact using the approved age key custody procedure. Do not put plaintext or row-level evidence in public comments.

**Stop** if source identity, read-only access, evidence custody, applied ledger, audit protection, encryption retrieval, retention, or owner approval cannot be verified. Do not reconstruct unavailable historical data and call it parity.

## Gate 2 — recovery and disposable verification

1. Confirm the approved backup artifact is complete, encrypted, checksummed, retrievable, and within the current recovery objective. Production backup execution itself requires its own authorization.
2. Run fresh install, 0022-to-0024 upgrade, empty/partial/populated, repeated invocation, current-state preservation, audit immutability, compatibility, relationship integrity, billing, and monitoring tests only against disposable PostgreSQL. `bun run db:migrate:check` checks repository order and must not receive a production connection.
3. Restore an authorized artifact only into a genuinely isolated disposable target with outbound jobs, mail, webhooks and customer effects disabled. Verify schema, migration metadata, all captured records/revisions/relationships/evidence/audit, owner authorization, legacy DTO, and feature flag behavior. Record elapsed time against the 60-minute target. No production restore is part of rehearsal.
4. Record expected recovery exposure. With a daily backup target the objective is at most 24 hours only while every cycle succeeds and has validated remote retrieval; this is not guaranteed by retention duration.

## Gate 3 — separately authorized migrations 0023 and 0024

1. Request an explicit owner decision naming the exact production project/branch/database, applied starting ledger, migrations 0023 and 0024, artifact reference (private), time window, operator, expected impact, cancel path, and verification steps. No approval is inferred from this runbook or a code PR.
2. Execute `bun run db:migrate` as a separate controlled operator action using the authorized target. The Vercel production build wrapper must continue to run only the app build. Never apply production migrations in CI, preview builds, or automatically during application startup.
3. Verify ledger/checksums and required schema after each migration. Compare the new private before/after baseline for exact preservation of all currently present records, revisions, archive states, relationship references, billing/monitoring evidence and every audit event. A historical count is not expected.
4. On any mismatch, stop and leave the default-off feature unavailable. Do not run a destructive down migration. Preserve evidence and request an owner decision for forward repair or separately authorized recovery.

## Gate 4 — application release with feature disabled

1. Review the exact application PR, required CI, Preview state and production diff. Verify exact flag `YS_SYS_001_ENABLED` is not `true` for Production.
2. Obtain separate authorization for merge and the resulting automatic Production deployment. Confirm deployment SHA is Ready.
3. Smoke-test public homepage/intake, authenticated owner access, existing Systems Directory page/API/DTO and audit behavior. Verify typed Registry and analysis routes remain unavailable while the flag is off. Check migration ledger remains unchanged from the authorized 0024 target. Keep all secrets and row-level values private.
4. If a critical smoke test fails, stop; no automatic rollback or redeployment without explicit authorization. A code rollback does not drop additive schema or audit history.

## Gate 5 — separate owner activation decision

1. Review readiness dashboard blockers and informational gaps against evidence in the prospective baseline and migration verification.
2. Confirm responsibility, billing, verification, monitoring and dependency evidence are accurate; resolve or explicitly accept gaps. The dashboard is not a certification or provider health check.
3. Request separate written authorization naming `YS_SYS_001_ENABLED=true`, the target environment, effective time, operator, approved smoke checks and disable procedure. Change only the authorized environment. Do not include the flag change in the migration PR.
4. Verify owner-only page/API authorization, empty/partial state, legacy Directory compatibility, graph/readiness bounds, and audit/revision behavior. Confirm no external probes or scheduled monitoring were introduced.
5. If a critical issue appears, disable access only if that action is included in the activation authorization or newly approved; do not modify production configuration autonomously.

## Backout and forward recovery

- Before migration: cancel the change; no data operation is required.
- After additive migration but before activation: keep the feature flag off and revert application code if needed. Retain the schema and all audit/evidence rows.
- After activation: follow only the separately approved flag-disable/code rollback procedure. Do not delete or roll back additive schema destructively.
- For schema/data defects: stop writes using an explicitly approved safe control, preserve the source database, and prefer a reviewed forward migration. A restore, database branch, endpoint switch, or Production rollback needs separate authorization and an assessed data-loss window.

## Public evidence

GitHub issues and PRs may include only redacted aggregate PASS/FAIL/NOT RUN, source revision, timestamp, and approved links. Keep connection metadata, record IDs, account labels, values, fingerprints, evidence references, credentials and response bodies in private approved storage.
