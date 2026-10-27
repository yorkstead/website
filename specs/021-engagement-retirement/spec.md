# Permanent engagement retirement

Status: implementation authorized for review and disposable rehearsal only. Production migrations, record changes, merges, deployments and existing credential changes are prohibited. Existing website PR #67 and Hub PR #87 remain unmerged; these are separate branches from verified main.

## Scope and invariants

Retirement is an immutable, identifier-bound operational exclusion, separate from historical sales stage. No name matching, destructive cleanup, financial reclassification, or false completion. No public retirement endpoint or automatic real-record action. Use a reviewed database operation after future explicit authorization; new operations are revoked from PUBLIC by default.

- Website: preserve the entire inquiry, including won status and intake. An append-only retirement tombstone protects it from update, delete, truncate and conversion. Normal lead lists and retention exclude retired inquiries. For this slice, converted inquiries and in-flight notification states are rejected: a linked website workspace/project must receive a separately reviewed retirement scope, never be silently left active.
- Hub: company-wide retirement locks the company and related rows, verifies a full relational fingerprint, and records immutable event evidence in the same transaction. Preserve company/opportunity stages, amounts, records, content and timestamps. Cancel only unfinished projects and open milestones. Completed history stays completed. Preserve portal updates in their current review state but prohibit mutation, approval and access after retirement; revoke member/share access atomically.
- Guard child insertion, mutation, reassignment and deletion for retired company scopes, including financial records and portal rows. Preserve active unrelated companies. Protect registry/audit from direct modification and truncate. Parent serialization prevents a concurrent conversion/child edit from racing retirement; operation retries are idempotent only for the same operation, actor and scope.
- Exclude retired scopes from active CRM/portal/readiness/website summary/briefing lists. Historical evidence remains in protected database storage; this slice adds no new public history DTO or owner UI.
- Block retirement when external task work is already pending/processing/uncertain; drain and reconcile external operations separately before an operator may retry. No Google/Tasker/provider calls in retirement. Retire company before inquiry, verify between databases; no cross-database atomicity claim.

## Acceptance

A1: sales/financial/content before-images unchanged except approved operational project/milestone/member/share fields; trigger-generated audit identifies each change without copying bodies or addresses.
A2: open milestones become cancelled, completed milestones unchanged; parent retirement denies reactivation and duplicate project conversion, even through old code/direct DML.
A3: retired draft review transitions, new updates/shares/members and portal preview are denied.
A4: aged archived retired inquiries survive retention; unrelated aged archives still purge; direct deletion/truncation is denied.
A5: stale fingerprint, invalid actor, unauthorized operation, concurrent edits and replay mismatch fail atomically. Same operation retry does not create duplicate audit.
A6: ordinary unrelated customer paths still work. No production data in fixtures, tests, logs or Git.
A7: fresh schema and upgrade with synthetic existing records pass. Transaction rollback restores all precommit state. Application rollback retains deny guards, tombstones and immutable evidence; no production down migration or unretire path.

## Security and limits

Database owner/superuser can bypass DDL protections; triggers are not WORM protection against a database administrator. Production qualification must separate migration owner from runtime DML role and export audit evidence to approved encrypted custody. No production role/configuration change is authorized here. Protect logs with generic errors. Do not back up plaintext into Git; original published sensitive documents remain in encrypted custody, and history redaction requires a separate reviewed decision.

Identifier-bound protection cannot identify a newly created alias/company with unrelated IDs. Cross-system mapping and legal-hold retention scope must be approved by the owner. Existing website customer enrollment/publication gates remain closed. Converted website inquiries and unlinked external systems are explicit blockers, not automatically retired.
