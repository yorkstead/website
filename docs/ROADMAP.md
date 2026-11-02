# Project roadmap

This page records cross-workstream sequencing. Detailed scope and task status remain in linked issues, feature specs and `docs/handoffs/CURRENT.md`.

## Production stabilization and independent tracks

| Workstream | Current evidence | Coordination |
| --- | --- | --- |
| Automation Hub shopping-capture recovery | Hub PR #93 is merged; Hub `main` and latest Vercel production source are `02c21a31784de965ce35d1af8c6cedcfd57230f2`. The incident record still requires separately approved production migrations for the missing CC-022/022B schema; recovery is not established by the deployed diagnostic patch. | Independent recovery gate. Reverify schema/migration state before release coordination. Do not couple Hub code/data changes or deployment to Website registry migrations. |
| CC-026 Opportunity Discovery | Migration `0022_opportunity-discovery.sql` and feature are on current Website `main`; Vercel production source is current `main`. Production database binding and applied migration ledger are not verified in PR 0. | Activation/migration evidence is an independent production-readiness gate. No shared migration release until verified. |
| YS-SYS-001 Systems Registry | PRs #87–89 merged at `main` `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`. Owner-reported diagnostic exact-matches the Neon `website` production branch/database and reports 22/22 migration checksums, 7 entries, 11 audit events, and no orphans. PR #90 cleanup draft has passing Actions and Preview. Exact row-level preservation values remain private and unreviewed; Neon history is six hours, with no snapshots/schedule and no restore rehearsal. | PR 1 migration 0023 design and disposable verification preparation may proceed. **Production migration remains NO-GO** until private row-level parity review, a confirmed durable/usable recovery point, disposable restore rehearsal, accepted data exposure/RPO/RTO, and separate owner authorization. See `production-preflight.md` and `recovery-runbook.md`; coordinate independently with Automation Hub recovery, CC-026 activation evidence, and MKT-QR-001 print readiness. |
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
