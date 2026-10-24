# Acceptance matrix

| Requirement | Planned evidence |
| --- | --- |
| Stable versioned prerequisite contract; deterministic assessment | model unit tests |
| Missing/expired/changed facts or commit/schema/configuration stale approval | model + database tests |
| Forged actor/status/evidence; unsupported activation denied | HTTP + service tests; strict schemas |
| Manual acknowledgment cannot override technical gate | model/database + browser |
| Concurrent decisions, atomic immutable audit, safe upgrade | disposable PostgreSQL tests |
| Customer-specific blockers survive global approval | model/database synthetic adapter tests |
| No tokens/secrets/customer records/raw environment | safe DTO tests; zero customer-table queries |
| Production readonly; existing gates unchanged/404 | gate tests; local production negative smoke |
| Desktop/mobile/keyboard, navigation, existing publishing/access | standard + isolated browser suites |
| Fresh/repeat migrations, historical prepared queries, checks/build/CI | verification.md + PR checks |
