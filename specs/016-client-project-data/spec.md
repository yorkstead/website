# CC-008 — Secure client project data

## Requirements and discovery

Project and nested ClientDelivery remain authoritative. The owner workspace lives in browser storage and the owner-only `workspaces.data` JSONB row (`primary`); snapshots are recovery history, not a customer source. There are no relational project versions, customer publication flags, external descriptions, or dedicated updates. Project.note, ProjectNote content, milestone acceptanceCriteria, delivery.activity and decisions are owner-authored internal material. Dates live on milestones; status/progress on Project and delivery children. CRM, links and payment references are separate internal concerns.

Only cloud-persisted records can be prepared. Browser-only changes cannot be observed until saved; the publication service never accepts a caller-provided workspace. Customer-safe snapshots use reviewed, selected source fields: project name/description/status/progress; milestone title/status with optional separately approved date; deliverable title/status with optional description; Update-type ProjectNote content only through an explicit update decision. No acceptance criteria, general notes, decisions, activity, credentials, repository/deployment URLs, pricing or documents are eligible.

## Disclosure policy

All absent records are private. Explicit owner preparation creates a draft snapshot, never visibility. Owner review approves a specific revision; withdrawal retains history and hides content. Approving the project snapshot publishes its overview and permits independently approved children. Dates are independent records, never inherited from milestone approval. No tenant ID is accepted from a customer. Mapping is resolved from the existing active identity, membership, tenant, project and view grant joins on every read. The customer query selects only safe columns and never reads workspace JSON.

Published updates are ordered oldest first by the timestamp instant, with ordinal source-ID order for equal instants. The CustomerPortalView adapter preserves this order. Withdrawing an update removes only that update from the visible chronology.

No automatic legacy backfill, customer route, customer activation or new source editor. Production read capability is hard-coded false. Trusted integration tests exercise the same query with an isolated provider session; owner-only preview uses deterministic fictional source data and the same adapter.

## Synchronization

A draft records the digest of persisted workspace data. Prepare and approve lock that workspace row before mapping/publication rows. Approvals use compare-and-swap revisions and fail if content or source changed. An additive database trigger invalidates every snapshot on any workspace data change or deletion, increments revisions and emits system audit events in the source transaction. This intentionally invalidates unrelated projects too. Restoration never resurrects approval. Deleted sources cannot be approved; archived mappings cannot be published or read. Retained withdrawn snapshots are owner-only history, not authoritative project data.

## Non-goals and launch blockers

No real customer data inspection, email, external approvals, documents, downloads, payments, production migration/configuration changes, deployment or merge. Future activation requires separate review of least-privilege database roles, finer-grained invalidation if needed, provider/session route integration, caching and operational publication UX. Owner services are server dependencies without HTTP/Server Action adapters.
