# CC-028 Phase 6b — implementation plan

**Specification:** [`spec.md`](spec.md)

## Approach

The navigation renders primary links plus one indented secondary list. Keep that structure, relabel the groups, and reorder members.

1. `components/dashboard/dashboard-navigation.tsx`
   - `primaryLinks`: Overview, Pipeline, Projects, Tasks, Systems, Insights.
   - `crmLinks` → `pipelineLinks`, gaining Marketing at the top.
   - `insightLinks` → `systemsLinks`: Systems Directory, Automations, Operations, and an external Automation Hub link.
   - Systems Directory leaves `toolLinks`; Client Access and the rest stay.
2. `tests/e2e-cc017/navigation.e2e.ts`
   - Route matrix and active-state branches follow Pipeline/Systems.
   - Adds Systems as an asserted destination.

## Boundaries

- No route, page, component, or data-ownership change.
- The Automation Hub entry is external (`https://cal.yorkstead.com/command`) and reuses the existing external-link rendering.
- No change to keyboard focus, drawer, collapse persistence, or print CSS.

## Rollback

Revert the two files. Labels and ordering are presentation only; no state depends on them.
