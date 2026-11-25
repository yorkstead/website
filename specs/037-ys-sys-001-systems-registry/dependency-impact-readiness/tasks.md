# Dependency impact and activation readiness tasks

- [x] Reconfirm current main and preserve the unrelated dirty checkout.
- [x] Reconcile current six-class/evidence/billing/monitoring schema and relationship kinds before implementation.
- [ ] Implement deterministic bounded graph functions and readiness classification.
- [ ] Load minimal analysis fields and verified subscription evidence in one read-only consistent transaction.
- [ ] Gate the read-only analysis API by owner authorization and exact `YS_SYS_001_ENABLED=true`.
- [ ] Add impact and readiness pages, accessible graph + semantic list, filters and record navigation.
- [ ] Add synthetic unit, controller, PostgreSQL and browser regression coverage.
- [ ] Confirm legacy `/api/systems-directory` DTO and page remain unchanged.
- [ ] Add a current 0023/0024 migration, backup, activation, smoke-test and rollback runbook.
  - 2026-11-11: migration applied to Production (ledger `22`→`24`). Activation, a Production smoke test of the registry, and the rollback runbook remain outstanding.
- [ ] Run repository checks and inspect exact diff/security boundaries.
- [ ] Open draft PR; do not merge, deploy, run Production migrations, or enable the flag.
