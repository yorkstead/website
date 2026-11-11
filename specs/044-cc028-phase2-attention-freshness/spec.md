# CC-028 Phase 2 — Attention source and freshness clarity

Tracking issue [#119](https://github.com/yorkstead/website/issues/119). Architectural references: the merged Command Center audit and [`specs/042-cc-028-command-center-consolidation/`](../042-cc-028-command-center-consolidation/), with existing CC-021 and CC-027 contracts.

## User value

The owner can tell which system owns each attention queue, where to review it, whether results are incomplete, and when this page last read the source.

## Acceptance criteria

- A1. CRM and Opportunity Discovery source summaries say when this dashboard request read them; unavailable reads show no fabricated timestamp.
- A2. Existing source links, source labels, available-empty, unavailable, and limit states remain distinct.
- A3. A read timestamp is explicitly a read time, not the source record's update time or a freshness guarantee.
- A4. Attention remains read-only for external records and all actions stay on existing source workflows.
- A5. Focused tests cover timestamp display, missing timestamps on failures, source destinations and bounded/incomplete states.
- A6. No migration, copied data, new aggregator store, provider write, Recovery/Registry change, or production operation.
