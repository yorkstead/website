# Issue #98 implementation plan

1. Add ordered migration `0024_registry-evidence-billing-monitoring.sql` after the verified main migration 0023. Add independent verification and monitoring columns to canonical entries. Add source-level billing evidence, subscription allocations, supporting indexes, revision triggers, append-only audit, immutable audit protections, and class-aware foreign keys. Do not edit or replace the existing audit stream.
2. Extend strict typed inputs and DTO mapping. Derive stale display state from due dates; do not schedule jobs.
3. Add owner-only verification, monitoring, and billing routes. Apply the existing exact-value default-off feature gate, owner session, same-origin mutation protection, bounded JSON, safe errors, and optimistic revisions.
4. Add service transactions that set server-derived audit actor context. Lock a billing source while checking/inserting allocations so concurrent requests cannot over-allocate. Keep a single source row for shared invoices and report source totals once.
5. Add owner UI for evidence review, monitoring configuration/observations, billing source capture, subscription allocations, audit inspection, and grouped rollups. Preserve the existing Directory page/API contracts.
6. Add synthetic PostgreSQL tests for empty/partial/populated states, all six classes, stale and unknown states, shared sources, duplicate references, actual/estimated/unknown values, concurrent allocations, audit immutability, class integrity, revision conflicts, and legacy compatibility. Add owner-flow browser coverage.
7. Verify migration order/checksum manifest, run repository checks and exact-head GitHub Actions with disposable PostgreSQL. Do not apply the migration to Production.

## Rollback

Disable or omit `YS_SYS_001_ENABLED` to return typed Registry functionality to unavailable. Revert application code while leaving the additive migration and its data in place. Schema correction is forward-only; do not destructively reverse or delete evidence/audit rows.

## Release boundary

Preview and Production database binding must be treated separately. This plan authorizes code and synthetic tests only; it does not authorize Production SQL, migration, data/configuration changes, feature activation, merge, or deployment.
