# Project roadmap

This page records cross-workstream sequencing. Detailed scope and task status remain in linked issues, feature specs and `docs/handoffs/CURRENT.md`.

## Production stabilization and independent tracks

| Workstream | Current evidence | Coordination |
| --- | --- | --- |
| Automation Hub shopping-capture recovery | Hub PR #93 is merged; Hub `main` and latest Vercel production source are `02c21a31784de965ce35d1af8c6cedcfd57230f2`. The incident record still requires separately approved production migrations for the missing CC-022/022B schema; recovery is not established by the deployed diagnostic patch. | Independent recovery gate. Reverify schema/migration state before release coordination. Do not couple Hub code/data changes or deployment to Website registry migrations. |
| CC-026 Opportunity Discovery | Migration `0022_opportunity-discovery.sql` and feature are on current Website `main`; Vercel production source is current `main`. Production database binding and applied migration ledger are not verified in PR 0. | Activation/migration evidence is an independent production-readiness gate. No shared migration release until verified. |
| YS-SYS-001 Systems Registry | Verified Website `main` is `64be4915e42fbff8fe9474f8a9ced81309bb800c`, merging PR #99. PR #97 delivers the six-class inventory, relationships, ownership and legacy compatibility; PR #99 delivers evidence, billing provenance and manual monitoring. `YS_SYS_001_ENABLED` remains default-off and Production migrations 0023/0024 remain unauthorized. The owner retained current Production/Preview databases and stopped former-database recovery; there is no fixed historical seven/eleven parity requirement. Current recovery policy: daily encrypted dump, 24-hour RPO, 30-day retention, 60-minute RTO target; production export, actual restore, retention enforcement and RTO remain unverified. | Current development slice: bounded dependency impact and evidence-based readiness UI/API over existing explicit relationships. The eventual Production sequence and required separate approvals are in `specs/037-ys-sys-001-systems-registry/activation-runbook.md`. Coordinate Hub recovery, CC-026 deployment evidence and MKT-QR-001 separately; do not combine migrations or release gates. |
| MKT-QR-001 (`#85`) | Open print-critical project for the tracked sticker URL and first-party scan/inquiry attribution. | Separate workstream; finish and verify tracked URL before sticker printing. Not a dependency of YS-SYS-001. |

## YS-SYS-001 sequence

1. PR #87: discovery/specification and CC-023 single-registry decision (merged).
2. PR #92: additive six-class schema, default-off typed access, ownership, relationships and legacy compatibility (merged; Production migrations remain separate).
3. PR #97 and PR #99: inventory review corrections, evidence-backed verification, billing provenance and truthful manual monitoring (merged).
4. Current PR: read-only bounded dependency impact and activation-readiness surfaces, plus controlled rollout runbook.
5. Future controlled release: prospective baseline, approved encrypted backup/retrieval, disposable migration/restore rehearsal, separate 0023/0024 execution authorization, then an independent feature-flag activation decision.
