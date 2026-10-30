# CC-023 tasks

- [x] Verify current main, PR #79, owner auth, Settings & Tools, dashboard overview, monitoring, integrations, and migration conventions.
- [x] Define scope, truthful health/cost semantics, privacy rules, and acceptance criteria.
- [x] Add ordered additive persistence and migration validation coverage.
- [x] Implement strict schemas, owner-scoped service, optimistic concurrency, audit, and unit/integration tests.
- [x] Implement owner-only directory routes and route/security tests.
- [x] Build responsive Systems Directory UI and add Settings & Tools/command navigation.
- [x] Add evidence-backed exception and recurring-cost models to Command Center Overview.
- [x] Add owner browser tests for access, navigation, CRUD, and mobile/desktop behavior.
- [x] Run required local checks and migration/browser discovery; record PostgreSQL/browser runtime limitations and leave full disposable-DB browser execution to CI.
- [x] Converge docs, update handoff, commit/push, and open one PR without merge/deploy.

## Existing PR #80 review corrections

- [x] Keep raw amount text while editing and parse decimal amounts only on save; cover decimals, blank, malformed values, and persistence.
- [x] Refresh the systems overview and existing GitHub/Vercel project intelligence together; preserve source-specific checked times and avoid duplicate requests.
- [x] Keep validation, duplicate, and revision-conflict errors accessible inside the editor while preserving the user draft.
- [x] Add unit and owner-browser regressions for the review findings.
- [ ] Run exact-head PostgreSQL-backed browser CI, then resolve only the three matching review threads on PR #80.
