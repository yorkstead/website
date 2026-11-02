# Project roadmap

This page records cross-workstream sequencing. Detailed scope and task status remain in linked issues, feature specs and `docs/handoffs/CURRENT.md`.

## Production stabilization and independent tracks

| Workstream | Current evidence | Coordination |
| --- | --- | --- |
| Automation Hub shopping-capture recovery | Hub PR #93 is merged; Hub `main` and latest Vercel production source are `02c21a31784de965ce35d1af8c6cedcfd57230f2`. The incident record still requires separately approved production migrations for the missing CC-022/022B schema; recovery is not established by the deployed diagnostic patch. | Independent recovery gate. Reverify schema/migration state before release coordination. Do not couple Hub code/data changes or deployment to Website registry migrations. |
| CC-026 Opportunity Discovery | Migration `0022_opportunity-discovery.sql` and feature are on current Website `main`; Vercel production source is current `main`. Production database binding and applied migration ledger are not verified in PR 0. | Activation/migration evidence is an independent production-readiness gate. No shared migration release until verified. |
| YS-SYS-001 Systems Registry | PRs #87–89 are merged at main `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`. Owner-reported diagnostic matches the Neon production endpoint and reports 22/22 migration checksums, 7 entries, 11 audit events, and no orphans; exact row-level parity remains privately unreviewed. PRs #90–91 are open drafts with passing latest Actions and Preview. PR #92 prepares additive migration 0023 and synthetic preservation tests; local database execution and recovery-artifact rehearsal remain unavailable. Neon metadata reported six-hour history, no snapshot schedule/saved snapshots. | Continue review and disposable CI verification of migration 0023. **Production migration remains NO-GO** until private row-level parity is independently verified, a usable recovery point and authorized artifact are confirmed, restore rehearsal passes, exposure/RPO/RTO/storage/operators are owner-approved, and separate production authorization is granted. Keep Automation Hub recovery, CC-026 activation evidence, and MKT-QR-001 print readiness as separate coordination gates. |
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
