# Acceptance matrix

| Requirement | Evidence |
| --- | --- |
| Stable versioned prerequisite contract; deterministic assessment | tests/portal-readiness-model.test.ts |
| Missing/expired/changed facts or commit/schema/configuration stale approval | tests/portal-readiness-model.test.ts + tests/portal-readiness-database.test.ts |
| Forged actor/status/evidence; unsupported activation denied | tests/portal-readiness-http.test.ts; strict schemas |
| Manual acknowledgment cannot override technical gate | model/database tests + tests/e2e-cc011/portal-readiness.e2e.ts |
| Concurrent decisions, atomic immutable audit, safe upgrade | tests/portal-readiness-database.test.ts |
| Customer-specific blockers survive global approval | model/database synthetic adapter tests (no application test-adapter import) |
| No tokens/secrets/customer records/raw environment | HTTP/database/browser DTO tests; registry service has zero customer-table queries |
| Production readonly; existing gates unchanged/404 | gate tests; local production negative smoke |
| Desktop/mobile/keyboard, navigation, existing publishing/access | 30 standard + CC-007/009/010/011 isolated suites at 390px/1440px |
| Fresh/repeat migrations, historical prepared queries, checks/build/CI | verification.md + PR checks |
