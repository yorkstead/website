# Acceptance matrix

| Requirement | Evidence |
| --- | --- |
| Owner-only page, HTTP and service | HTTP/domain tests; isolated browser |
| Strict CSRF, bounded requests, safe errors/headers | HTTP tests |
| Tenant scope, duplicate mappings, stale/concurrent revocations | disposable database tests |
| Revoked access cannot be restored | domain/database tests; unchanged per-request authorization |
| Prepared/issued/delivered/redeemed distinction and secret-free responses | database, presentation/browser tests |
| Append-only audit, actor and server time | migration/database tests |
| Objective readiness; production disabled | domain and browser tests |
| Mobile/desktop accessible navigation and confirmation | isolated browser tests |
| Existing enrollment, publishing, CRM preserved | complete unit/database and browser suites |
| Migration fresh/repeat/prepared compatibility | migration checks and database upgrade test |
| Build, lint, typecheck, audit, CI | verification.md |
