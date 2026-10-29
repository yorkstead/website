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
- [x] T010 Hub PR #92 and dependent Website PR #79 are open and ready for review after exact-head validation.
- [x] T011 Fix the initial receipt validation, recurrence clearing, 202 recovery, and payday input rejection findings. Those changes passed exact-head PostgreSQL/browser/build CI and the four original review threads were resolved.
- [x] T012 Serialize shopping command submissions to prevent concurrent pending-map overwrites, and retain payday recovery keys in memory when session storage is unavailable; browser regressions passed on Website application head `c34fa996cc6afb8dacf80dbcdeab2934e2857ffb` in [exact-head CI 40971125294](https://github.com/yorkstead/website/actions/runs/40971125294). The final documentation head `81c10dec9be6883567a606c53ebf8a5b73915d0a` passed [exact-head CI 40972288651](https://github.com/yorkstead/website/actions/runs/40972288651); both follow-up review threads are resolved and #79 is ready for review.
