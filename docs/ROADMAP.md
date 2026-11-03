# Project roadmap

This page records cross-workstream sequencing. Detailed scope and task status remain in linked issues, feature specs and `docs/handoffs/CURRENT.md`.

## Production stabilization and independent tracks

| Workstream | Current evidence | Coordination |
| --- | --- | --- |
| Automation Hub shopping-capture recovery | Hub PR #93 is merged; Hub `main` and latest Vercel production source are `02c21a31784de965ce35d1af8c6cedcfd57230f2`. The incident record still requires separately approved production migrations for the missing CC-022/022B schema; recovery is not established by the deployed diagnostic patch. | Independent recovery gate. Reverify schema/migration state before release coordination. Do not couple Hub code/data changes or deployment to Website registry migrations. |
| CC-026 Opportunity Discovery | Migration `0022_opportunity-discovery.sql` and feature are on current Website `main`; Vercel production source is current `main`. Production database binding and applied migration ledger are not verified in PR 0. | Activation/migration evidence is an independent production-readiness gate. No shared migration release until verified. |
| YS-SYS-001 Systems Registry | Website `main` is `d5b419e69edc38b5da4f9d5c2b29a82e149f4e3b`; PRs #87–#91 and #93 are merged. The owner reports PR #90 cleanup deployed, both temporary flags disabled, and the authenticated retired diagnostic returning 404. PR #92 is the open additive migration 0023 slice with synthetic seven-entry/eleven-audit preservation tests; this head is being reconciled with current main. The owner-reported production diagnostic matched the Neon production target and reported 22/22 checksums, seven entries and eleven audit events; exact row-level parity remains privately unreviewed. Recovery planning records a six-hour PITR history and an encrypted-dump/30-day/60-minute-RTO target accepted for planning; RPO, storage, operators, private parity and production-derived restore remain open. | Continue exact-head disposable PostgreSQL, browser, lint, typecheck and build verification of PR #92. **Production export, recovery operations and migration 0023 remain NO-GO** until independent private row-level parity review, an approved usable recovery artifact and isolated restore rehearsal, owner decisions, and separate operation-specific authorization. Keep Automation Hub recovery, CC-026 activation evidence, and MKT-QR-001 print readiness as independent coordinated tracks. |
| MKT-QR-001 (`#85`) | Open print-critical project for the tracked sticker URL and first-party scan/inquiry attribution. | Separate workstream; finish and verify tracked URL before sticker printing. Not a dependency of YS-SYS-001. |

## YS-SYS-001 sequence

1. PR 0: repository/runtime discovery, compatibility decision, evidence gates, spec, plan, tasks and coordination.
2. PR 1: additive preservation foundation, default-off control and exact legacy-fixture upgrade proof.
3. PR 2: candidate staging, typed inventory, provenance and ownership/recovery roles.
4. PR 3: subscription evidence, shared entitlement handling and honest cost reconciliation.
5. PR 4: applications/workloads, infrastructure/assets and stack-component links.
6. PR 5: typed dependency graph and bounded impact view.
7. PR 6: truthful monitoring configuration and observation history using existing trusted read-only checks.
8. PR 7: compatibility/preservation review and disposable restore/backout rehearsal. Any production activation remains separately authorized.
