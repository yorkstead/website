# ADR 0002: Separate verification evidence, billing sources, and monitoring observations

- **Status:** Accepted for Issue #98 implementation
- **Date:** 2026-11-03

## Decision

Retain CC-023 as the canonical Systems Directory. Store verification subject/source/date separately from the existing candidate/owner-review workflow. Record each billing source once and attach explicit allocations to subscription records so shared invoices are not double counted. Represent monitoring configuration independently from manual observations. Compute stale display state from due dates without scheduled polling.

All typed operations remain owner-authorized and exact-flag gated. Migration 0024 is additive and Production migration/activation remains separately authorized.

## Consequences

Unknown amounts remain null; actual and estimated totals stay separate and group by currency and period. Billing evidence cannot create subscriptions. Existing records and audit behavior remain compatible. Manual monitoring claims remain attributed to a source and owner review; configuration does not imply health.
