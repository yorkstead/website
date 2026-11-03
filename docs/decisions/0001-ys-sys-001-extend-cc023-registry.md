# Decision 0001: Extend CC-023 as the sole Systems Registry

- Status: Accepted — PR #87; owner clarification 2026-11-03
- Date: 2026-11-01
- Owner: Yorkstead

## Context

CC-023 already provides an owner-scoped Systems Directory, two persistence tables, compatibility routes, revision-safe mutations and database-generated immutable audit. Replacing it or creating a parallel registry would split ownership and risk losing existing records and their histories. Initial database contents may be empty, partial, or populated.

## Decision

Extend the existing CC-023 tables, server service, routes, UI and audit stream additively. Preserve record IDs, legacy fields, responses and audit rows. New classes/candidates remain unverified and default-off until separately authorized.

## Alternatives considered

- Create a second normalized registry and later synchronize it: rejected because it duplicates authority and creates reconciliation risk.
- Replace the existing tables/routes in one migration: rejected because compatibility and preservation of present records/audit history cannot be established safely as a single cutover.
- Treat repository fixtures or the historical `$76.40/month` subtotal as production truth: rejected because migration `0020` contains no seed and the production DB is unverified.

## Consequences

- Benefits: one authority, preserved compatibility and append-only history, small independently reviewable changes.
- Tradeoffs: staged schema and adapter work may temporarily duplicate fields; implementation must work with the current empty, partial, or populated state.
- Follow-up: see the owner clarification below. Production migration requires separate authorization.

## Owner clarification — 2026-11-03

The owner has since selected the currently configured Production and Preview databases and explicitly stopped former-database recovery and historical seven-entry/eleven-event parity work. Treat the database's present state as the starting point; support empty, partially populated, and populated states, preserving any existing records and append-only audit history. Reconstruct only Systems Directory and original Opportunity Discovery records from documented evidence, and label them as reconstructed. CC-023 remains authoritative. Migration 0023 is unapplied to Production until separately authorized.

This clarification supersedes the earlier pre-migration historical-baseline gate. It does not change the additive/single-authority decision or authorize Production access, writes, migration, activation, or deployment.
