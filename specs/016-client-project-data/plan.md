# Plan

1. Verify remote main includes PR #58 and migration 0013; branch from verified head.
2. Add migration 0014: scoped safe snapshots, revisioned publication state, append-only audit, workspace invalidation trigger. Preserve historical migration bytes and prepared-statement boundaries.
3. Add strict allowlisted source extraction, owner prepare/approve/withdraw/inspect services, workspace-first lock ordering and compare-and-swap transitions.
4. Add per-request customer session verification and active authorization constrained projection query; versioned adapter to CustomerPortalView. Keep production disabled.
5. Exercise synthetic source data in isolated owner preview and tenant/concurrency/database tests. Verify migrations, full application and CI; record limits and handoff.

Rollback application code first; retain additive audit/publication history. Never remove historical migrations or run production rollback.
