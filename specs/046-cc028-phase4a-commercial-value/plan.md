# CC-028 Phase 4a — implementation plan

**Specification:** [`spec.md`](spec.md)

## Approach

Rename for meaning, then adjust the two surfaces that display money.

1. `components/marketing/marketing-metrics.ts` — `bookedRevenue` becomes `attributedValue`, with a comment stating that the accepted CRM proposal is the commercial figure.
2. `components/marketing-operations.tsx` — the twelve-week aggregation follows the rename.
3. `components/marketing/marketing-views.tsx` — the panel reads "Marketing-attributed" with a caption distinguishing attribution from the commercial figure.
4. `components/marketing/marketing-dialogs.tsx` — the activity field reads "Attributed value".
5. `components/dashboard/command-center-overview.tsx` — the CRM card reads "Proposal value · commercial" with a caption naming CRM draft/sent amounts as commercial truth.

## Boundaries

- No schema, migration, API, or calculation change. The numbers are unchanged; only their names and captions are.
- Marketing activity persistence and CRM proposal lifecycle are untouched.
- T104b (accepted proposal → explicit project action) deliberately excluded.

## Rollback

Revert the five files. Nothing persisted depends on the field name, so rollback is complete.
