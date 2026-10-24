# Tasks
- [x] Audit CC-002–006, constitution, repository skills and verified base.
- [x] Establish architecture, scope, threat model and activation gates.
- [x] Implement and test additive challenge/rate-limit migration.
- [x] Implement invitation-controlled proof and account bootstrap.
- [x] Implement narrow authentication controller, UX and portal shell.
- [x] Verify security, concurrency, rollback, actual authentication and disabled routes.
- [x] Run full matrix and record evidence, limitations, handoff and local commit.
- [x] Push feature branch and open unmerged draft PR #58.
- [x] Establish GitHub Actions tracking; final results are authoritative on the PR checks tab.

## PR #58 corrections
- [x] Replace SQL string rewriting with a dedicated parameterized authorization-list function and explicit selection check.
- [x] Add disposable multi-tenant, removed-grant, suspended-membership and unauthorized-selection regression tests.
- [x] Document rate-limit capacity, operational failure modes and release prerequisites.
- [x] Run local verification and prepare corrections for the existing PR branch.
- Latest-head remote verification: track the existing PR #58 checks; the PR description records the observed final run after publication, without adding a documentation-only commit that would invalidate that run.
