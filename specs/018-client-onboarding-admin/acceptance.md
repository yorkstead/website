# Acceptance matrix

| Requirement | Evidence |
| --- | --- |
| Owner-only page, HTTP and service | tests/client-access-http.test.ts; tests/e2e-cc010/client-access.e2e.ts |
| Strict CSRF, bounded requests, safe errors/headers | tests/client-access-http.test.ts |
| Tenant scope, duplicate mappings, stale/concurrent revocations | tests/client-access-database.test.ts |
| Revoked access cannot be restored | tests/client-access-database.test.ts; existing customer authorization/session suites |
| Prepared/issued/delivered/redeemed distinction and secret-free responses | tests/client-access-database.test.ts; tests/e2e-cc010/client-access.e2e.ts |
| Append-only audit, actor and server time | 0015 plus tests/client-access-database.test.ts |
| Objective readiness; production disabled | tests/client-access-database.test.ts; tests/e2e-cc010/client-access.e2e.ts |
| Mobile/desktop accessible navigation and confirmation | tests/e2e-cc010/client-access.e2e.ts (390px/1440px) |
| Existing enrollment, publishing, CRM preserved | 382 full unit/database tests; 30 standard + 2 CC-007 + 2 CC-009 browser scenarios |
| Migration fresh/repeat/prepared compatibility | 15 fresh/repeat migrations; prepared-query compatibility + 0015 additive upgrade test |
| Build, lint, typecheck, audit, CI | verification.md |
