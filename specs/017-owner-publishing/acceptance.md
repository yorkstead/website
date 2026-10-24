# Acceptance matrix

| Requirement | Evidence |
| --- | --- |
| Verified main / new branch / immutable 0014 | Git base and migration diff |
| Owner-only page, list, candidate, preview, mutation and audit | Transport/service denial and browser tests |
| Persisted source only; no payload/actor/tenant injection | Strict schema/HTTP and PostgreSQL regressions |
| Separate preparation, exact draft review and revision-specific approval | Service/interactive workflow tests |
| Independent children/dates, overview required, withdrawals hide output | PostgreSQL and browser workflow tests |
| Source changes invalidate, stale approval conflicts, refresh recovers | Source edit/conflict tests |
| Exact approved preview, no drafts or other-project content | Projection equivalence and multi-project tests |
| Responsive accessible selector/actions, pending/empty/error/success states | Component and mobile/desktop browser tests |
| Safe CSRF/body bounds/errors/private no-store | HTTP controller tests |
| Date-only normalization, preserved offsets, invalid/missing source timestamp exclusion without clock fabrication | Source-unit, database and owner browser regressions |
| Audit actor/revision/time and retained history | Service/database tests |
| Production customer gates unchanged | Existing gate suites and diff review |
| Full local checks and CI; unmerged PR | verification.md and PR checks |
