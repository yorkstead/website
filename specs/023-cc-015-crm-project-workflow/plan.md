# Plan

1. Keep the PR #48 SQL conversion transaction and project deep-link foundation; add regression coverage for archived and retired conversion denial and clear missing-record errors.
2. Extend existing lead query predicates for overdue, due today, and future dates in America/Denver; use the same predicate for counts and lists. Add a completion action that clears only an active inquiry’s follow-up date and reuse the existing date field for rescheduling.
3. Add exact inquiry deep links from the Command Center and project linkage panel, with an unavailable-record state and return path.
4. Verify existing project detail presentation against the existing delivery/project models; improve the next-step presentation only where the existing data supports it.
5. Add regression coverage for empty data, repeat submissions, invalid IDs, archive/expiry, owner authorization, tenant isolation, and counts. No schema change is expected; if discovery proves otherwise, stop and document before introducing migration work.
6. Run scaffold, migration validation, lint, typecheck, full tests, relevant browser checks, and build; record environment limitations, rollback guidance, and exact PR evidence.
