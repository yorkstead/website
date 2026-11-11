# CC-028 Phase 4a — Commercial value vs marketing attribution

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Parent:** [`specs/042-cc-028-command-center-consolidation/`](../042-cc-028-command-center-consolidation/spec.md) (task T104a)
**Decision owner:** Brandon York, 2026-11-11 — the accepted CRM proposal amount is the commercial figure; Marketing activity values are attribution/reporting only.

## Problem

Two independent numbers described money from the same sales relationship:

- `crm_proposals.amount_cents` (migration `0019`) with draft/sent/accepted/declined state.
- Marketing activity `value` on `audit-paid` and `client-won` rows, surfaced as "Booked".

Nothing declared which was authoritative, and the Marketing panel labelled its figure "Booked", which reads as revenue. That is a structural route to double-counting a single engagement.

## Decision

- CRM proposal amounts are the commercial truth for a sales relationship.
- Marketing `value` is attribution: it records what outreach is credited with, not what was booked.
- The proposal-to-project handoff (T104b) is a separate slice and is not part of this change.

## Requirements

- R1: The Marketing metric is named and described as attribution, not booked revenue.
- R2: The CRM figure is labelled as the commercial value.
- R3: The internal score field reflects the semantics, so future code cannot mistake attribution for revenue.
- R4: No value is recalculated, migrated, or reconciled; only naming and presentation change.

## Acceptance

- A1: No user-facing surface calls the Marketing figure "booked".
- A2: The CRM proposal value is described as commercial truth.
- A3: Marketing metrics return `attributedValue`, and existing aggregation still sums it correctly.
- A4: No schema, data, or API contract change.

## Non-goals

- Changing proposal creation, acceptance, or totals.
- Auto-creating projects on acceptance (T104b).
- Reconciling historic Marketing values against past proposals.
