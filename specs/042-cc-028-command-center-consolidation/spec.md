# CC-028 — Command Center workflow consolidation

**Tracking:** GitHub issue [#119](https://github.com/yorkstead/website/issues/119)
**Architectural reference:** [`docs/audits/2026-11-09-command-center-consolidation.md`](../../docs/audits/2026-11-09-command-center-consolidation.md), reviewed on the `main` snapshot that includes merged PR #121.
**Status:** Proposed for owner review. This specification authorizes no implementation or operational change.

## User value

Give the owner a clear, low-friction path from prospect research through a CRM decision and project delivery. Show relevant work across existing systems without creating a second source of truth, hiding incomplete reads, or asking the owner to re-enter information that already has an authoritative record.

## Scope

This is a phased consolidation program for the existing Marketing → Opportunity Discovery → Website CRM → consultations/proposals → workspace projects path, plus the existing source-aware Command Center attention and navigation surfaces. It defines ownership and handoff rules, then allows small follow-up slices after owner review. It does not replace the underlying systems or authorize all slices as a single release.

## Product requirements and acceptance criteria

- **A1 — Preserve record ownership.** Marketing retains campaign, outreach, and attribution history; Opportunity Discovery retains research, evidence, interview, and permission history; `contact_inquiries` remains the Website CRM sales authority; consultations retain meeting/playbook history; `crm_proposals` retains proposal-specific value, state, and next action; `workspaces.primary` remains the project/task/delivery authority. Hub, Google, GitHub, and Vercel continue to own their provider records.
- **A2 — Keep handoffs explicit and traceable.** Existing stable IDs and owner-confirmed actions connect records. A presentation view may link or summarize source records but must not silently create, merge, or synchronize records across owners.
- **A3 — Make overlap review safe.** Any cross-source Marketing/Discovery/CRM candidate review is owner-only, bounded, source-labeled, and reviewable. Candidate similarity is not identity proof. Linking requires explicit owner selection; no automatic merge, deduplication, permission inference, or write-through is allowed.
- **A4 — Keep attention source-aware.** A consolidated attention surface identifies the source owner, exact destination, record/action type, freshness or observation time, partial/unavailable state, and only the mutation supported by that source's existing authorized workflow. A failed or partial read must not appear as an empty queue.
- **A5 — Clarify duplicated identity and value.** A linked consultation's identity fields must have documented snapshot/projection semantics before UI or persistence behavior changes. Accepted CRM proposal amount is the commercial amount authority; Marketing value/activity remains attribution/reporting unless the owner approves a different definition. Do not copy totals between these records.
- **A6 — Keep proposal and project transitions deliberate.** Proposal acceptance remains distinct from project creation unless the owner explicitly approves a separate, traceable project-creation action. Any conversion continues to use the existing idempotent CRM-to-workspace conversion path and preserves inquiry/proposal/project links.
- **A7 — Remove disconnected UI only with evidence.** An unreferenced or unmounted component can be archived or removed only after an exact-branch static search and review for dynamic/external consumers. Active source-labeled Hub CRM presentation remains intact.
- **A8 — Respect existing navigation and contracts.** Navigation work reuses the current App Router, route protections, and design/navigation conventions. It does not duplicate or silently supersede the existing CC-017/CC-021/CC-027 work.
- **A9 — Protect privacy and boundaries.** No client-side database access, advertising identifiers, sensitive operational data in public intake, customer activation, provider-account mutation, Registry/Operations/recovery change, production query, or new prospecting platform. Owner-only records remain behind existing server-side authorization.
- **A10 — Make each change independently reviewable.** Each implementation slice has its own owner decision, existing or updated spec/tasks, narrow acceptance evidence, rollback note, and PR. This program's approval does not authorize implementation, merge, deployment, data migration, or production operations.

## Explicit non-goals

- Replacing Website CRM, Marketing, Opportunity Discovery, consultations, proposals, the workspace, Automation Hub, Google Tasks/Calendar, GitHub, or Vercel.
- Building a universal writable task store or copying provider tasks/issues into workspace tasks.
- Automatic contact matching, deduplication, CRM synchronization, proposal-to-project creation, or booked-revenue reconciliation.
- Customer portal activation or changes to customer access, publishing, communications, onboarding, or release gates.
- Changes to Systems Registry, Operations, Infrastructure & Recovery, YS-SYS-001, migrations `0023`/`0024`, production data/configuration, or existing evidence/retention policies.
- Recreating or operating the external scheduled ChatGPT prospecting queue or paused app-prospect monitor.

## Owner decisions required before affected implementation

1. Define consultation identity as a historical meeting snapshot or a live CRM projection; identify which meeting-specific fields remain editable.
2. Confirm CRM accepted proposal amount as commercial value and Marketing value as attribution/reporting, including dashboard labels.
3. Decide whether proposal acceptance should offer an explicit project-creation action; no automatic creation is proposed by default.
4. Confirm the intended GitHub/Vercel owners for Quick Launch when workspace overrides are unset.
5. Confirm the status and owner of the external prospecting schedule and paused monitor. Review their contracts through their owning platforms only under separate authorization.
6. Confirm whether the two disconnected attention/briefing components have any dynamic or external consumers before cleanup.
7. Select and prioritize follow-up slices after reviewing this spec; client portal activation and Registry/recovery remain separate workstreams.

## Risks and controls

| Risk | Control |
|---|---|
| Similar companies are incorrectly merged | Surface source, candidate rationale, and direct records; require owner selection; never auto-merge. |
| A multi-source view hides stale/partial results | Show source freshness and unavailable/partial state; keep provider-specific errors distinct from empty results. |
| Consultation snapshots drift from CRM | Resolve snapshot semantics before changing edit behavior; preserve meeting history and `lead_id`. |
| Proposal value or acceptance creates duplicate revenue/projects | Keep proposal amount and Marketing attribution separately labeled; preserve idempotent conversion and require an owner decision for any new action. |
| Cleanup removes a still-used component | Repeat static and dynamic consumer checks on the implementation branch; remove only the isolated dead surface. |
| Consolidation crosses into protected workstreams | Keep customer activation, Registry/Operations, and infrastructure/recovery outside this spec; require separate scope and authorization. |

## Rollback and compatibility

Prefer UI/read-model changes over schema changes. If a later slice adds a relationship or persistence field, it must be additive, ordered, reversible or safely inert on rollback, and separately reviewed under the database migration workflow. Revert presentation/adapters before considering stored-data removal. Preserve all source records and historical evidence; never cascade deletion across CRM, research, consultation, proposal, workspace, or customer records.

## Architectural references

- Audit: [`docs/audits/2026-11-09-command-center-consolidation.md`](../../docs/audits/2026-11-09-command-center-consolidation.md)
- Marketing → CRM: [`specs/038-marketing-crm-handoff/`](../038-marketing-crm-handoff/)
- Opportunity Discovery: [`specs/036-cc-026-opportunity-discovery/`](../036-cc-026-opportunity-discovery/)
- CRM project workflow: [`specs/023-cc-015-crm-project-workflow/`](../023-cc-015-crm-project-workflow/)
- CRM sales/proposals: [`specs/028-cc-019-crm-sales-workflow/`](../028-cc-019-crm-sales-workflow/)
- Command Center attention and Hub reads: [`specs/039-cc-027-unified-attention/`](../039-cc-027-unified-attention/) and [`specs/040-cc021-dashboard-read-consolidation/`](../040-cc021-dashboard-read-consolidation/)
- Navigation: [`specs/026-cc-017-command-center-navigation/`](../026-cc-017-command-center-navigation/) and [`specs/035-cc-025-unified-design-navigation/`](../035-cc-025-unified-design-navigation/)
- Systems Registry / Recovery boundaries: [`specs/037-ys-sys-001-systems-registry/`](../037-ys-sys-001-systems-registry/) and issue [#112](https://github.com/yorkstead/website/issues/112)
