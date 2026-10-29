# CC-022B tasks

- [x] T001 Audit current merged Hub/Website contracts and record source evidence.
- [x] T002 Implement deterministic shopping intent, multi-item extraction, ambiguity/review and provider non-dispatch tests in Hub.
- [x] T003 Add additive shopping/payday/audit migrations and PostgreSQL verifier/rollback notes.
- [x] T004 Implement Hub shopping read, versioned owner command, idempotency/CAS and audit for the Website owner planner.
- [x] T005 Add concise optional briefing shopping section with unchanged audio contract.
- [x] T006 Implement Website owner BFF/client and responsive shopping planner under Automations.
- [x] T007 Add Website BFF, same-key recovery, anonymous denial assertion, responsive/refresh/payday browser coverage.
- [x] T008 Run local checks and full Bun suites; disposable PostgreSQL/browser checks are queued for the PR CI environment because no local disposable database is configured.
- [x] T009 Complete specs, operations and current handoff updates. Browser screenshots are deferred because the local owner E2E requires its disposable PostgreSQL credentials.
- [x] T010 Hub PR #92 is ready; dependent Website PR #79 is open and draft while two newly reported recovery edge cases are being validated.
- [x] T011 Fix the initial receipt validation, recurrence clearing, 202 recovery, and payday input rejection findings. Those changes passed exact-head PostgreSQL/browser/build CI and the four original review threads were resolved.
- [ ] T012 Serialize shopping command submissions to prevent concurrent pending-map overwrites, and retain payday recovery keys in memory when session storage is unavailable; add browser regressions and rerun exact-head CI before resolving the newly reported threads or marking #79 ready.
