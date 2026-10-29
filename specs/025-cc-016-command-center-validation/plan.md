# Plan

1. Trace public contact submission, partial-index persistence, owner CRM reads/actions, follow-up summary predicates, conversion transaction/idempotency, project source linkage, workspace delivery models, and navigation/error states.
2. Add the smallest database regressions for confirmed gaps, with all fixtures transaction-scoped and safe against non-disposable URLs. Re-run the full lifecycle against migrated PostgreSQL.
3. Add a serial owner browser workflow using a fictional owner/session and unique `example.test` inquiry. Exercise submit, refresh, details/status/follow-up, repeat submission, conversion, exact project workspace, existing delivery sections, and safe failures.
4. Correct only defects reproduced by tests. Preserve current design, auth, tenant, retirement, and portal gates.
5. Produce a criterion-by-criterion validation matrix, manual production smoke checklist, rollback guidance, and synchronized task/handoff state.
6. Run the full documented checks and applicable repository security, hardening, database, verification, and convergence reviews. Open the requested PR without merge or manual deploy.

## Branch/base evidence

The live GitHub connector reported `main` at `49f62d1a2e36b809f11405f5d32090ee69254b9f` (PR #71 merge). Local GitHub DNS was unavailable. The verified main tree is `819a1572607ef8c265cf77aa28df50eb7cb729d7`, equal to local parent `9a588f4ed0ccdf68afa918dea4c76a1a386f33dc`'s tree. The CC-016 feature branch therefore starts from the exact same source tree; the source branch is an ancestor of the verified main merge commit.
