# CC-026 operational notes

## Runtime and access

- `/dashboard/opportunities` is an owner-only App Router page. The page and every Server Action independently call `getOwnerSession`; there is no customer portal route or public API for opportunity records.
- The store uses the existing `DATABASE_URL` PostgreSQL connection. Apply ordered migrations through the repository migration runner; the workspace fails closed with an unavailable state if its schema/connection is unavailable.
- Research, evidence, interviews, and material history live in `research_opportunities`, `opportunity_evidence`, `opportunity_interviews`, and `opportunity_history`. Only an explicit, permission-backed, confirmed owner action links a research record to `contact_inquiries`.
- CRM follow-up, status, consultations, proposals, project conversion, and first-party conversion analytics remain managed by their existing workflows. Research records do not emit conversion events or projected revenue.

## Migration and activation

Migration `0022_opportunity-discovery.sql` is additive and ordered after `0021`. Validate it with `bun run db:migrate:check` and disposable PostgreSQL integration tests before any environment uses it. No production database was changed for CC-026. Production activation requires a separately authorized normal release/migration operation after review and backup; this PR does not apply it, deploy, or change secrets/configuration.

## Retention and deletion

- Archive hides the record from active queues and reporting; the owner can restore it to researching.
- A deliberate typed confirmation can erase archived opportunity/evidence/interview content. A minimal `opportunity_history` erase event remains without research text. A linked CRM lead is preserved and never cascaded into deletion.
- Evidence and interview rows cascade only when the research opportunity itself is erased. A linked consultation uses `ON DELETE SET NULL`; this feature never deletes consultations.
- Retention policy should be reviewed with the existing CRM/consultation retention schedule before production activation. Do not use the audit table for sensitive conversation content.

## Outbound and privacy

Conversation preparation is local draft text based on entered evidence; it does not send mail or create a contact. Owners must review and take any outbound action. Research-only records should contain business workflow context and participant role, not personal contact details or sensitive operational records. A new CRM lead requires participant authorization, explicit owner confirmation, and owner-entered real contact details. Existing matches can be linked without changing CRM fields.

## Recovery

Do not roll back by deleting the research tables after records exist. If the feature must be disabled, remove access through an authorized code release while preserving research and audit data. Investigate failed promotion transactions from the opportunity history and CRM lead linkage; row locking and a unique CRM link make retry idempotent. Existing CRM records remain authoritative.
