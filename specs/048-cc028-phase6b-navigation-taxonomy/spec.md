# CC-028 Phase 6b — Navigation taxonomy

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Parent:** [`specs/042-cc-028-command-center-consolidation/`](../042-cc-028-command-center-consolidation/spec.md) (task T106b)
**Owner acceptance, 2026-11-11:** the four-group mapping below.

## Problem

The navigation labels hid record ownership. "CRM" covered inquiry management, consultations, *and* opportunity research; "Insights" mixed Marketing and Operations with Analytics; Automations sat at the top level while Systems Directory, its counterpart, was buried in Settings & Tools. An operator had to know the data model to guess where a record lived.

## Decision — four workflow groups

| Group | Members |
|---|---|
| **Pipeline** | Marketing, Opportunity Discovery, Account overlap review, follow-up queues, Consultations |
| **Delivery** | Projects, Tasks (anchors on the overview, unchanged) |
| **Systems** | Systems Directory, Automations, Operations, Automation Hub |
| **Insights** | Analytics |

## Requirements

- R1: "CRM" as a top-level label is replaced by "Pipeline", which owns the marketing-to-sales surfaces.
- R2: Marketing moves out of "Insights" and under "Pipeline"; Operations moves under "Systems".
- R3: "Systems" becomes a top-level group containing the directory, automations, operations, and the external Hub console.
- R4: "Insights" contains Analytics only.
- R5: Every existing route and anchor is preserved; no destination is removed.
- R6: Active-state highlighting follows the new groups, including query-string follow-up views.

## Acceptance

- A1: Primary navigation reads Overview, Pipeline, Projects, Tasks, Systems, Insights.
- A2: Pipeline is active on leads, consultations, opportunities, overlap review, and marketing.
- A3: Systems is active on systems, automations, and operations.
- A4: Automation Hub appears as an external link; no external navigation is forced into the app shell.
- A5: Keyboard, mobile drawer, and print behaviors are unchanged.
- A6: No route, page, or record ownership changes.

## Non-goals

- Renaming pages, routes, or data owners.
- Moving Client Access, Client Publishing, portal previews, or account settings out of Settings & Tools.
- Changing what any page does.
