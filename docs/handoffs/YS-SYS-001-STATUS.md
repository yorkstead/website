# YS-SYS-001 current handoff — 2026-11-03

## Current verified state

- GitHub reports Website `main` at `d5b419e69edc38b5da4f9d5c2b29a82e149f4e3b`; PRs #90, #91 and #93 are merged. PR #92 was reconciled from its prior head by non-rewriting merge commit `b2930735f2a73968042009aa9d1caa908371ca43` and pushed to its existing branch. Exact proposed-merge run [41565610202](https://github.com/yorkstead/website/actions/runs/41565610202) passed on that head; the handoff/verification update is pending a final exact-head run. PR #92 remains open and unmerged.
- PR #92 contains additive migration 0023, default-off typed-registry access and disposable synthetic preservation tests. It does not update or seed the existing directory rows. No production migration, export, backup, restore, configuration change, merge or deployment is authorized here.
- The PR #93 recovery rehearsal on `main` is synthetic-only; its successful CI does not establish private production parity or production restore readiness.
- `docs/handoffs/CURRENT.md` now has a short dated, redacted status entry; the earlier handoff body remains historical and was not republished.
- Production export and migration remain **NO-GO** pending independent private seven-entry/eleven-audit row-level parity review, an authorized and usable recovery artifact, isolated restore rehearsal, outstanding owner decisions and separate operation-specific approval.

## Reconciliation and review update — 2026-11-03

- Current main `d5b419e69edc38b5da4f9d5c2b29a82e149f4e3b` is included as the second parent of merge commit `b2930735f2a73968042009aa9d1caa908371ca43`; PR branch history was not rewritten. The only content conflict was the recorded PR #93 synthetic-run evidence in `tasks.md`, resolved to the current main evidence.
- Exact proposed-merge Actions run [41565610202](https://github.com/yorkstead/website/actions/runs/41565610202) passed both independent jobs. The application job passed 553 Bun tests (0 failures, 0 skipped), migration plan/application checks, lint, typecheck, the 35-test Playwright suite and all dedicated browser flows, then production build. The separate isolated synthetic recovery job passed its seven-entry/eleven-audit encrypted restore test (1 pass, 0 failures) in its own internal-network PostgreSQL/container environment.
- Vercel Preview status for the reconciled head succeeded. The current handoff/verification documentation update requires another exact-head run; final review-thread resolution is pending that run.
- PR #92 preserves additive migration 0023 and default-off access. No production schema/data/configuration, backup, export, restore, merge or deployment action occurred. Production migration remains **NO-GO**.

## Historical status snapshot — 2026-11-02

The following sections preserve the status as recorded on 2026-11-02. Current GitHub state and the dated update above supersede their readiness statements.

## Repository and review sequence

- Verified `main` before consolidation: `b521af85b00334f69c4cb089cdb6458c1e3e5ec9`, with application migrations through 0022.
- Proposed order after separate release authorization: #91 recovery design and production-build migration guard; #90 temporary diagnostic source cleanup; #93 synthetic recovery preparation; #92 additive schema 0023. Each branch inherits the preceding PR through non-rewriting merge commits. No PR is merged or deployed by this preparation.
- `vercel.json` invokes `bun run vercel-build`; the consolidated wrapper runs `bun run build` only. GitHub Actions migrations use its isolated PostgreSQL service. A production migration requires a separate owner-authorized operator command and recovery gate. Every `main` merge remains a Vercel production deployment candidate and needs separate release authorization.

## Verified disposable evidence and limits

- Earlier exact-head #92 CI run 41499404998 passed 554 tests with zero failures/skips, including fresh/repeat migration 0023 and a populated 0022-to-0023 seven-entry/eleven-audit synthetic preservation test.
- Earlier exact-head #93 CI run 41504298230 passed 554 tests with zero failures/skips, including encrypted synthetic export, local upload simulation, isolated restore, checksum/failure-path checks and seven/eleven parity.
- The consolidated PR head must pass fresh checks before review completion. Synthetic tests do not prove private production row-level parity or a production-derived restore.
- Owner planning decisions: encrypted custom-format `pg_dump`, 30-day artifact retention from verified capture, and a 60-minute incident-to-verified-service RTO target. RPO/cadence, storage/cost/key custody, operators and reviewer remain open. The RTO target is not demonstrated.

## Production gates

- Read-only Vercel metadata previously showed both protected preflight flag records edited before a Ready production redeployment. Their values remain inaccessible through this access. The owner must confirm both flags false/removed and an owner-authenticated HTTP 404 for the old diagnostic mode; PR #90 source cleanup is not deployed.
- Private seven-entry/eleven-audit fingerprints, IDs, revisions, values and capture provenance need independent review in approved private storage.
- A target-specific production export approval, recoverable encrypted artifact, independent retrieval, isolated production-derived restore rehearsal, approved RPO/storage/operators and a separate migration 0023 approval remain outstanding.
- **Production export and migration: NO-GO.** No merge, manual deployment, production DDL/data/configuration change or backup operation was performed.
