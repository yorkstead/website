# Issue #98 tasks

- [x] Reconcile Issue #98 scope against current main, CC-023 ownership, migration 0023, owner authorization, feature gate, and Production boundary.
- [x] Add migration 0024 for evidence states, monitoring metadata, billing evidence/allocation, indexes, constraints, revision and immutable audit behavior.
- [x] Implement typed owner-only verification and manual monitoring routes and review UI.
- [x] Implement billing provenance, deduplicated source capture, allocations, audit, and period/currency rollups.
- [x] Preserve legacy route and DTO behavior; keep Registry default-off.
- [x] Add synthetic PostgreSQL integration and Registry browser tests.
- [ ] Run exact-head GitHub Actions; require PostgreSQL integration and browser checks to pass without critical skips.
- [ ] Review automated and human findings; update this work package with final exact-head evidence.
- [x] Preserve Production data/configuration and do not run migration 0024, enable the flag, merge, or deploy.
