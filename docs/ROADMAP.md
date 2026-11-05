# Project roadmap

This page records cross-workstream sequencing. Detailed scope and task status remain in linked issues, feature specs and `docs/handoffs/CURRENT.md`.

## Production stabilization and independent tracks

| Workstream | Current evidence | Coordination |
| --- | --- | --- |
| Automation Hub shopping-capture recovery | Hub PR #93 is merged; Hub `main` and latest Vercel production source are `02c21a31784de965ce35d1af8c6cedcfd57230f2`. The incident record still requires separately approved production migrations for the missing CC-022/022B schema; recovery is not established by the deployed diagnostic patch. | Independent recovery gate. Reverify schema/migration state before release coordination. Do not couple Hub code/data changes or deployment to Website registry migrations. |
| CC-026 Opportunity Discovery | Migration `0022_opportunity-discovery.sql` and feature are on current Website `main`; Vercel production source is current `main`. Production database binding and applied migration ledger are not verified in PR 0. | Activation/migration evidence is an independent production-readiness gate. No shared migration release until verified. |
| YS-SYS-001 Systems Registry | Verified Website `main` is `b8f00b49da27a3d450fd3199cfbfecda6f68145c`. PRs #97, #99 and #100 deliver the six-class inventory, evidence/billing/monitoring, dependency impact and readiness surfaces. `YS_SYS_001_ENABLED` remains default-off; Production migrations 0023/0024 remain unapplied and unauthorized. The owner retains current Production/Preview databases; former-database recovery and historical seven/eleven parity are closed. The owner-reported current preflight is migrations 0001–0022/checksums PASS, 0023/0024 absent, Directory entries/audits/orphans 0/0/0, and protections PASS. Current recovery policy remains daily encrypted backups, 24-hour RPO, 60-minute RTO target, and 30-day retention; no full Production backup, timed restore, or retention enforcement has been verified. | Current preparation: one-time full-database `pg_dump -Fc` procedure and isolated synthetic archive/encryption/restore rehearsal, independent of PR #95's selective Directory evidence workflow. Production export remains NO-GO pending exact-head CI/review, private identity/role/R2/cost rechecks, and separate one-time authorization. Production migrations and feature activation require separate later approvals. Keep Automation Hub, CC-026, and MKT-QR-001 coordination independent; do not combine their operations or release gates. |
| MKT-QR-001 (`#85`) | Open print-critical project for the tracked sticker URL and first-party scan/inquiry attribution. | Separate workstream; finish and verify tracked URL before sticker printing. Not a dependency of YS-SYS-001. |

## YS-SYS-001 sequence

1. PR #87: discovery/specification and CC-023 single-registry decision (merged).
2. PR #92: additive six-class schema, default-off typed access, ownership, relationships and legacy compatibility (merged; Production migrations remain separate).
3. PR #97 and PR #99: inventory review corrections, evidence-backed verification, billing provenance and truthful manual monitoring (merged).
4. PR #100: read-only bounded dependency impact and activation-readiness surfaces (merged).
5. Current work: prepare/review the one-time full-database backup and isolated synthetic restore procedure; independent of PR #95's selective Directory capture.
6. Future controlled release: prospective baseline, approved encrypted backup/retrieval, disposable migration/restore rehearsal, separate 0023/0024 execution authorization, then an independent feature-flag activation decision.
