# Issue #98 tasks

- [x] Reconcile Issue #98 scope against current main, CC-023 ownership, migration 0023, owner authorization, feature gate, and Production boundary.
- [x] Add migration 0024 for evidence states, monitoring metadata, billing evidence/allocation, indexes, constraints, revision and immutable audit behavior.
- [x] Implement typed owner-only verification and manual monitoring routes and review UI.
- [x] Implement billing provenance, deduplicated source capture, allocations, audit, and period/currency rollups.
- [x] Preserve legacy route and DTO behavior; keep Registry default-off.
- [x] Add synthetic PostgreSQL integration and Registry browser tests.
- [x] Run exact-head GitHub Actions; disposable PostgreSQL integration and browser checks passed on head 4e48cf694c20cd1d9ce2ee6fa90e7d31b257c835 (run 41667921530).
- [x] Review PR discussion and review threads; none unresolved at final review. Record final CI and Ready Preview evidence in this work package.
- [x] Preserve Production data/configuration and do not run migration 0024, enable the flag, merge, or deploy.
