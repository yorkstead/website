# CC-026 threat model

## Assets

- Research hypotheses, source references, operational evidence, interview notes and permission decisions.
- Existing CRM records, follow-ups, proposals, project links, conversion analytics and customer-portal data.

## Trust boundaries and threats

| Boundary | Threat | Control |
|---|---|---|
| Browser → owner page/action | Unauthenticated or customer user reads/writes research | Verify existing owner session server-side on every page and each action; no public/customer route imports or projection. |
| Form/query → domain | Forged IDs, oversized text/JSON, invalid state, unsafe URL or crafted search | Strict bounded parser; UUID/enum/date validation; safe URL allowlist; SQL parameters; pagination caps and escaped wildcard search. |
| Opportunity → CRM | Research is treated as confirmed intent, duplicates a lead, or changes an existing follow-up/status | Require validated status and explicit commercial permission; owner confirmation; duplicate candidate review; selected lead linking; locked single transaction; update only opportunity link and CRM fields needed for a new record. |
| Concurrent promotion | Retries create multiple leads | Lock opportunity row, unique CRM link, idempotent existing-link response; integration test with concurrent transactions. |
| Research → analytics/customer portal | Research text leaks through public conversion event or customer projection | No analytics writer/schema link; no customer route/query; server-only owner reporting; route-isolation regression. |
| Retention and archival | Archive/deletion destroys evidence or cascades to CRM | Soft archive; restrictive FK to CRM; event/evidence history retained; no broad deletion. |
| Source references | `javascript:`, `data:`, credentials, or hostile external URL rendered | Accept only `https:` or same-origin relative paths; render escaped plain text/link with safe rel attributes. |

## Data minimization

Do not capture personal contact data during research. Store role-level participant labels and business workflow notes only. New CRM contact fields are required only during explicit promotion after permission; never put sensitive operations, credentials, payment-card data, health data, or private customer records in research notes.

## Abuse and failure behavior

- Owner actions fail closed if session verification or persistence fails; do not expose SQL or research content in error messages/logs.
- Promotion failure rolls back both CRM insert/link and promotion event. Retry may return the existing lead ID.
- Reports are owner-only and separate counts from proposal/won revenue; a partial database failure should display an unavailable state, not zero value.
- Archive/promotion races serialize on the opportunity row and re-check validated/permission state in the transaction.

## Verification

Unauthorized GET/mutations, forged lead IDs, hostile URLs, invalid status transitions, duplicate candidates, parallel retry, rollback, retention/archive, and customer route isolation are covered by unit/API/disposable PostgreSQL/browser tests.
