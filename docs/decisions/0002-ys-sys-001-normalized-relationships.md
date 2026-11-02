# Decision 0002: Normalize typed Systems Registry relationships

- Status: Proposed for PR 1 review
- Date: 2026-11-02
- Owner: Yorkstead

## Context

YS-SYS-001 extends the CC-023 `system_directory_entries` table as the sole registry identity. The legacy `relationships` JSON field is part of the existing DTO and must remain unchanged for compatibility. New dependency and ownership edges need database-enforced references to the canonical entries, provenance, revision tracking, and audit history.

## Decision

Add an additive `system_directory_relationships` table in migration 0023. Both endpoints reference `system_directory_entries(id)` with `ON DELETE RESTRICT`; relationship kinds and owner tenant are constrained. Relationship changes use owner audit context, revision generation, and an append-only relationship audit table. Physical relationship deletion is rejected; archiving is represented as a revisioned update. No relationships are seeded, and no typed API is activated by this migration.

The relationship-audit table intentionally has no foreign key to the live relationship row, matching the existing retention principle for legacy audit events. It preserves history if future, separately reviewed retention work removes a live relationship.

## Alternatives considered

- Put new relationship types only in the legacy JSON field: rejected for new data because PostgreSQL cannot enforce endpoint references or relation-kind constraints there.
- Create a parallel registry for relationship endpoints: rejected because it would split identity and reconciliation authority.
- Add subtype tables before a verified candidate inventory exists: deferred; migration 0023 provides common typed identity/provenance only.

## Consequences

- Existing IDs, legacy fields, routes, DTOs, entry audit events, and `relationships` JSON remain intact.
- New links are referentially valid and have a separate immutable history stream; a later API slice must present legacy and relationship history coherently.
- Production migration remains blocked pending private row-level parity, recovery readiness, and separate owner authorization.
