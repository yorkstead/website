# Decision 0001: Extend CC-023 as the sole Systems Registry

- Status: Proposed; production-specific preservation and recovery gates remain open
- Date: 2026-11-01
- Owner: Yorkstead

## Context

CC-023 already provides an owner-scoped Systems Directory, two persistence tables, compatibility routes, revision-safe mutations and database-generated immutable audit. Replacing it or creating a parallel registry would split ownership and risk losing seven reported original records and their histories. The owner-reported production diagnostic has been matched by exact endpoint metadata to the Neon `website` project's production branch and database, and reported seven entries/eleven audits with matching migrations. However, exact row-level IDs/revisions/fingerprints remain private and unreviewed in this workspace; recovery has not been tested.

## Decision

Extend the existing CC-023 tables, server service, routes, UI and audit stream additively. Preserve record IDs, legacy fields, responses and audit rows. Before a production migration, independently review the private seven-row baseline and verify a usable recovery point. New classes/candidates remain unverified and default-off until separately authorized. Schema implementation may be prepared only on disposable data until those gates close.

## Alternatives considered

- Create a second normalized registry and later synchronize it: rejected because it duplicates authority and creates reconciliation risk.
- Replace the existing tables/routes in one migration: rejected because compatibility and seven-record/audit preservation cannot be established safely as a single cutover.
- Treat repository fixtures or the historical `$76.40/month` subtotal as production truth: rejected because migration `0020` contains no seed and the production DB is unverified.

## Consequences

- Benefits: one authority, preserved compatibility and append-only history, small independently reviewable changes.
- Tradeoffs: staged schema and adapter work may temporarily duplicate fields; production baseline must be obtained before implementation PR 1.
- Follow-up: review this decision and private preservation baseline; test the additive migration/restore path on disposable PostgreSQL; accept only after review and recovery prerequisites are documented.
