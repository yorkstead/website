# Plan

1. Add the tenant join and active-status predicate to the existing authorization query.
2. Extend the unit contract to require that tenant predicate.
3. Extend PostgreSQL integration coverage for suspended and disabled tenant denial.
4. Update handoff state and run all required checks.
5. Open a narrow, unmerged pull request.

## Recovery and rollback

Revert this code-only patch. It changes no schema or data and leaves all existing owner authorization unchanged.
