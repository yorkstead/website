# CC-022 implementation plan

1. Audit Hub source lifecycle/auth/Google/CRM/retry/audit and record exact source routes and transitions.
2. Add additive ordered Hub migration for command idempotency and append-only action audit; include fresh/upgrade disposable PostgreSQL checks.
3. Add dedicated write-authenticated Hub action API. Strictly parse bounded requests, validate current capture state/kind, claim idempotency and transition atomically, reuse existing Google/CRM paths, and mark ambiguous provider writes for manual reconciliation.
4. Extend CC-021 Hub DTO only as needed for safe classification/audit details while preserving version 1 compatibility; never return transcript/device/provider errors.
5. Add Website server-only write client and independently owner-authenticated BFF. Never forward browser-supplied Hub credentials. Enforce same-origin/CSRF metadata and body bounds.
6. Turn Automations into an owner-reviewed inbox with confirmed action dialogs, safe outcomes, history, responsive behavior and explicit unavailable/ambiguous/retry states.
7. Add mocked provider/unit tests, disposable PostgreSQL concurrency/dedup tests and isolated Playwright desktop/mobile owner tests.
8. Update rollout/dependency/rotation/rollback docs. Publish Hub PR first, then Website PR. No production secret provisioning, real capture actions, merge or deployment.
