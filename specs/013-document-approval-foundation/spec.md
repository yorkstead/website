# CC-005 — Secure documents and approvals

Status: implementation in progress. Base: main including merged PR #54.

## Discovery and boundaries

`lib/projects.ts` Project is the existing project model, persisted through the workspace snapshot foundation; `lib/client-delivery.ts` owns milestones, deliverables, informal decisions, external links, payment references and activity. Those links/decisions are not authenticated, version-bound approvals. CC-004 `CustomerPortalView` is a read-only projection, with fictional owner-only preview. No migration or automatic reinterpretation of existing delivery decisions is safe or intended.

0009 supplies normalized customer identities, tenant memberships, unique tenant/project mappings and explicit view-only project grants. 0010 isolates Better Auth in `customer_auth`; CC-003 derives the provider subject from verified sessions, checks active identity/membership/tenant/project/grant on every request, and defaults customer capabilities off. Reuse these structures; no customer-specific data, competing project model, account provisioning or grant backfill.

## Domain contract

A document has a stable UUID, immutable tenant/project ownership, type, display name, bounded metadata, server timestamps, and draft/internal_review/approved/archived lifecycle. Versions have independent UUIDs, immutable metadata snapshots and sequential positive numbers per document. Metadata permits only bounded classification, reference and description strings, with no file, URL, storage credential or arbitrary payload fields. Operators must not put secrets or file contents into free text. Creating a later version supersedes open approval requests and resets document status to draft. Archived documents cannot change or acquire versions.

An internal approval request binds a document and immutable version. States: draft -> pending/cancelled/superseded; pending -> approved/changes_requested/cancelled/superseded; terminal states cannot change. Only one open request per document. Sending requires internal_review. An internal owner decision is explicitly internal evidence, never customer consent. Approval requires the latest version and changes its document lifecycle to approved; changes requested returns it to draft. Comments are bounded, optional internal text and are excluded from audit payloads. Customer decisions remain unconditionally disabled.

Actors come from server-verified owner sessions; inputs never accept actor/role/tenant authority. Customer reads use CC-003 verified-session authorization and project grants and are also disabled by capability gate. Owner reads/writes require active tenant/project mapping. No trusted-system writer is needed in this milestone; audit events always identify an authenticated owner. Future system actors require a separately reviewed fixed identity path.

## Acceptance criteria

1. Additive migration preserves all existing rows, reapplies through migration runner safely, and binds documents, versions, requests and audit by composite scope keys.
2. Owner-only services create metadata, append versions, change lifecycle, create/transition requests and read history; all operations authorize server-side. Forged, absent and expired/non-owner sessions fail before database writes.
3. Version records and audit events reject update/delete/truncate; document and approval deletion is forbidden. Server owns UUIDs, version numbers and timestamps.
4. Transactions serialize on document rows. Duplicate/conflicting and stale-version decisions fail; new versions invalidate open requests atomically. Audit and mutation commit or roll back together.
5. Cross-tenant/project and inactive/missing/revoked authorization fail closed. No browser-supplied identity/role is trusted. All customer capabilities remain false; no routes expose content or mutations.
6. Automated unit and disposable PostgreSQL tests verify constraints, authorization, concurrency, immutable history, migration repeatability and preservation; repository matrix preserves owner behavior.
7. Existing owner-only preview may show explicitly fictional version/status/audit examples with no writes or downloads.

## Threat model and security review

Trust boundaries: browser -> verified owner/customer sessions -> server services -> PostgreSQL. IDs are selectors, never authority. SQL is parameterized; input objects are strict and bounded. Composite foreign keys prevent attaching versions or approvals across tenants/projects. Immutable triggers and generated audit events prevent ordinary SQL history edits and missing audit writes. Row locks order all mutations by document before request, preventing conflicting decisions and serializing new versions against consent. Active mapping rows are locked during owner operations to prevent concurrent revocation races.

Database credentials and schema-owner privileges remain trusted, as in existing authorization. A database administrator can disable triggers or forge transaction-local actor context; these are integrity controls against application mistakes, not cryptographic tamper evidence against a DBA. No RLS claim: server sessions and scoped queries are the access boundary. No raw database capability is exported to browser components. Internal comments/metadata can still contain operator-entered confidential text: access remains owner-only, payloads allowlisted and audit excludes them. No secrets, session tokens, passwords or file contents are recorded.

## Non-goals and rollback

No uploads, storage, download URLs, public/customer writes, login enablement, invitations, publication, production data/configuration, manual deployments or merges. No Adorned dependency. Rollback application changes first and leave additive tables/history intact. Do not reverse migration or delete historical evidence; a future destructive rollback needs backup/recovery review and explicit authorization. No backfill, existing-table rewrite or changes to existing auth grants. New-table indexes/constraints only; migration is transactional.
