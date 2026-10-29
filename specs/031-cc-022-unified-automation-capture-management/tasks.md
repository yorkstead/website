# CC-022 tasks

- [x] T001 Verify both repository tips/PR state as available and preserve existing checkout state.
- [x] T002 Audit Hub capture states, review/CRM/Google routes, auth, deduplication, retries and audit behavior; record actual contract.
- [x] T003 Implement Hub command contract, write auth, migration, idempotency, atomic state changes and safe audit.
- [x] T004 Add Hub provider-mocked and guarded disposable PostgreSQL authorization/concurrency/partial-failure coverage, including expired-lease and ambiguous/non-Google recovery assertions; exact-head disposable execution awaits CI.
- [x] T005 Implement Website owner BFF and confirmed action inbox while retaining CC-021 read compatibility.
- [x] T006 Add Website auth/contract and responsive Playwright tests for immediate valid reclassification and same-key recovery across unavailable refresh/remount; browser execution awaits CI due local disposable DB restrictions.
- [ ] T007 Run latest-head Hub and Website checks; record exact CI, PostgreSQL and browser evidence, limits, convergence and rollback in both repositories.
- [x] T008 Continue fixes in existing Hub PR #91 and Website PR #78 only; no new PRs, merges or deployments.
