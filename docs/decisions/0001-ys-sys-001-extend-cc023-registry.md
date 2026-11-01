# Decision 0001: Extend CC-023 as the sole Systems Registry

- Status: Proposed for PR 0 review
- Date: 2026-11-01
- Owner: Yorkstead

## Context

CC-023 already provides an owner-scoped Systems Directory, two persistence tables, compatibility routes, revision-safe mutations and database-generated immutable audit. Replacing it or creating a parallel registry would split ownership and risk losing seven reported original records and their histories. Production database identity and the exact seven-row/audit baseline are not verified in this discovery session.

## Decision

Extend the existing CC-023 tables, server service, routes, UI and audit stream additively. Preserve record IDs, legacy fields, responses and audit rows. Capture and review a redacted read-only production baseline before designing any migration or backfill. New classes/candidates remain unverified and default-off until separately authorized.

## Alternatives considered

- Create a second normalized registry and later synchronize it: rejected because it duplicates authority and creates reconciliation risk.
- Replace the existing tables/routes in one migration: rejected because compatibility and seven-record/audit preservation cannot be established safely as a single cutover.
- Treat repository fixtures or the historical `$76.40/month` subtotal as production truth: rejected because migration `0020` contains no seed and the production DB is unverified.

## Consequences

- Benefits: one authority, preserved compatibility and append-only history, small independently reviewable changes.
- Tradeoffs: staged schema and adapter work may temporarily duplicate fields; production baseline must be obtained before implementation PR 1.
- Follow-up: review this proposed decision in PR 0; capture redacted baseline through approved read-only access; update status to Accepted only after review.
