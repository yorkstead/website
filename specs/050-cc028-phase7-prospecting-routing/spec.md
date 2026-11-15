# CC-028 Phase 7 — External prospecting output routing

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Parent:** [`specs/042-cc-028-command-center-consolidation/`](../042-cc-028-command-center-consolidation/spec.md) (task T107)
**Status:** Specced (2026-11-15); **owner-gated** — no implementation, secret provisioning, or production routing is authorized without explicit owner approval.

## Problem

`yorkstead-automation-hub` now implements a weekly Denver prospecting pipeline (`specs/005-prospecting-process-signal/`, `GET /api/prospecting/candidates`, `POST /api/prospecting/candidates/:id/review`) where owner approval marks a candidate `approved` only — intentionally creating no dossier and no Website CRM record. Meanwhile, `yorkstead/website` owns Opportunity Discovery (`crm_prospect_dossiers` and `import_qualified_prospect()`). Without a defined, owner-gated routing contract, approved prospecting candidates remain isolated in Hub or risk ad-hoc manual re-entry.

## Decision & owner gates

Implementation is blocked until the owner confirms:
1. **Trigger model:** Whether approved Hub prospecting candidates are pulled/imported into Website Opportunity Discovery on explicit owner action from Command Center, or pushed via a dedicated authenticated Hub → Website handoff after owner approval.
2. **Target record:** Confirm approved candidates enter Opportunity Discovery (`crm_prospect_dossiers` via `import_qualified_prospect()`) as unverified leads/dossiers rather than directly creating `contact_inquiries` CRM records.
3. **Deduplication & suppression:** Confirm how company/domain overlap with existing Discovery dossiers, CRM inquiries, or Hub suppression keys is handled (surface candidate conflict vs skip).

## Requirements

- **R1 — Preserve system boundaries:** Hub continues to own raw job-posting ingestion, deterministic scoring, candidate queue, and review state; Website continues to own `crm_prospect_dossiers`, `import_qualified_prospect()`, and `contact_inquiries`. No second CRM or duplicate prospecting store is created in Website.
- **R2 — Owner-approved only:** Only candidates explicitly marked `approved` by the owner may be routed into Discovery. Queued, unreviewed, or rejected candidates are never imported.
- **R3 — Idempotent handoff:** Each routed candidate carries a stable external candidate ID / source key so retries or repeated imports cannot create duplicate dossiers.
- **R4 — Evidence & attribution preserved:** Routed dossiers retain source provenance (job posting title, company, Denver signal excerpts, score, Hub candidate ID) clearly labelled as source-reported signals, not independently verified operational facts.
- **R5 — Failure isolation:** If Hub or the routing endpoint is unavailable, Website Discovery and Command Center continue operating normally and surface a clear unavailable/retryable state rather than failing silently.

## Acceptance criteria

- **A1:** Unreviewed or rejected Hub candidates cannot be routed into Website Discovery.
- **A2:** Routing an owner-approved candidate creates (or returns) exactly one `crm_prospect_dossiers` record via `import_qualified_prospect()` with Hub provenance preserved.
- **A3:** Re-running or retrying the handoff for the same candidate ID is idempotent and creates zero duplicate dossiers.
- **A4:** Server-side owner authorization (and service-to-service token verification if push-based) is enforced; no client-side secrets or direct cross-database access.
- **A5:** Failed or unavailable Hub reads/writes degrade gracefully without blocking Discovery or CRM workflows.

## Non-goals

- Recreating the legacy external ChatGPT prospecting queue or paused app-prospect monitor.
- Auto-importing unreviewed postings or auto-creating `contact_inquiries` CRM sales records.
- Enabling production Hub prospecting schedules, OpenRouter keys, or Adzuna credentials (governed separately in `yorkstead-automation-hub`).

## Risks and controls

| Risk | Control |
|---|---|
| Unvetted job-posting noise floods Discovery/CRM | Gate routing strictly on `status = 'approved'` and land in Discovery dossiers (`import_qualified_prospect()`), never directly in CRM inquiries. |
| Duplicate dossiers created on retry | Key handoff on stable Hub candidate ID and enforce idempotent lookup/upsert in `import_qualified_prospect()`. |
| Cross-repo contract drift | Document exact payload and auth contract in both `website` and `yorkstead-automation-hub` specs before coding. |

## Rollback

Disable the routing action/adapter in Website; existing `crm_prospect_dossiers` and Hub `prospecting_candidates` remain intact and independent.
