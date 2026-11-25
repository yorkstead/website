# Issue #98 — Evidence, Billing Provenance, and Monitoring

**Parent:** YS-SYS-001, issue #86  
**Acceptance source:** [Issue #98](https://github.com/yorkstead/website/issues/98)

## Objective

Extend the CC-023-based Systems Registry with source-attributed verification, non-duplicating subscription billing evidence, and truthful monitoring observations. Preserve the legacy Systems Directory and all existing record/audit behavior. Support empty, partially populated, and populated installations without assumptions about historical row counts.

## Verification

Each Registry entry has a separate evidence status: `verified`, `unverified`, `stale`, `unknown`, or `unavailable`. The record identifies its subject, method, safe evidence reference, source observation time, server review time, and optional review due date. “Verified” means the owner reviewed the cited source for the stated subject; it does not imply an automated or independent check. Unknown status carries no evidence metadata. Expired review dates render verified evidence as stale without polling.

Verification mutations require owner authorization, the exact `YS_SYS_001_ENABLED=true` gate, same-origin requests, and the expected entry revision. The existing entry audit captures changes.

## Billing provenance

Store each invoice or other charge source once, attributed to provider account when known, reference, source type, observation time, billing period, currency, payer label, amount basis, and evidence status. Model allocations to subscription entries separately. Deduplicate source records by tenant, account, source type, normalized reference, period, and currency. Rollups count sources once, group by currency and period, identify evidence status and unallocated amounts, and never merge actual with estimated or unknown amounts. Unknown amounts are null, never zero. Billing evidence does not create subscriptions or establish an active entitlement.

## Monitoring

Represent configuration (`configured`, `unmonitored`, `unknown`) separately from observation (`healthy`, `degraded`, `down`, `unknown`, `stale`, `unavailable`). An observation includes method, optional safe reference, source time, optional review date, bounded owner note, and server review time. Expired review dates render an otherwise current result as stale. These are owner-entered observations only.

## Security and compatibility

Typed Registry pages and APIs require owner authorization and the default-off feature flag. Mutations are revision-safe, transactionally audited, same-origin, and validated against fixed schemas. Database constraints enforce amount/period rules, source deduplication, provider-account and subscription classification, and immutable audit. No external provider calls, polling, probes, notifications, automation, or secret-bearing evidence content is added. The existing `/api/systems-directory` DTO, route, and page remain compatible.

## Acceptance

- All six existing entity classifications can carry evidence and monitoring state.
- Empty and partial inventory states render and operate correctly.
- Unknown, estimated, actual, stale, unavailable, and unallocated states remain distinct.
- Shared source allocations do not double count; concurrent allocations cannot exceed a known source amount.
- Every mutation is owner-only, flag-gated, revision-safe, and append-only audited.
- Legacy Directory behavior and DTO remain unchanged.
- PostgreSQL integration and browser tests use synthetic data only.
- Migration 0024 remains unapplied to Production; feature flag remains off pending separately authorized release work.
- **Superseded 2026-11-11:** migrations 0023 and 0024 are now applied to Production (ledger `24`, latest `0024`). `YS_SYS_001_ENABLED` remains off, and activation still requires separate authorization.
