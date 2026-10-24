# Acceptance matrix

| Requirement | Evidence required |
| --- | --- |
| All production boundaries closed | gate unit tests, production route negatives, inspector blocks |
| Atomic authoritative issue/proof + intent | PostgreSQL success/rollback/revocation/expiry tests |
| No plaintext durable credentials/bodies | custody tamper/expiry/key tests; safe owner/audit projections |
| Durable deduplication/claim/retry/crash | real PostgreSQL concurrent workers, retry exhaustion, stale fencing |
| Compatible recovery only | Better Auth credential hash/session tests, replay/concurrent/suspended/tenant checks; passwordless denial |
| Webhook safety | documented SDK signed fixtures, invalid/old signatures, duplicate/reordered events and suppressions |
| Owner-only read-only UI | HTTP authorization/no mutation; actual owner mobile/desktop browser workflow |
| Readiness remains unqualified | code-vs-production facts, previous manifest/history, same-status invalidation regressions |
| Existing behavior | full repository checks and isolated CC-007–011 suites |

Exact commands/results and limitations recorded in verification.md. Absence of live qualification is a release blocker, not a passed acceptance test.
