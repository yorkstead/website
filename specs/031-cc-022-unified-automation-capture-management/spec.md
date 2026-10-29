# CC-022 — Unified Automation Actions & Capture Management

## Goal

Provide an owner-only capture inbox at `/dashboard/automations` that reads the Hub's existing CC-021 projection and sends narrowly scoped, confirmed commands through an independent Hub write credential. Hub remains authoritative for captures, CRM, Google Tasks, processing state and audit.

## Verified existing contract and behavior

The Website CC-021 consumer is `GET /api/dashboard/automation-hub`, owner-gated with Better Auth on every request. It calls Hub `GET /api/integrations/website-automations` with `YORKSTEAD_AUTOMATIONS_READ_SECRET`, version 1, private/no-store, bounded sections. The contract intentionally excludes transcript and device, and remains unchanged by CC-022.

Hub capture states observed in source include `pending`, `processing`, `completed`, and `needs_review`; existing CRM review also uses `pending_review`/`rejected` for related records. `/api/google/tasks` atomically claims only pending task/follow_up captures before one Google Tasks POST. Provider failure before the Google POST returns to pending; failure after starting the POST moves to `needs_review` and does not retry. Existing clear scheduled calendar captures may create Google Calendar events during ingestion through `createCalendarEventForCapture`; CC-022 must never re-run that path. `/api/crm/approve` applies Hub CRM intake through an atomic database statement and CRM uniqueness rules. Lead records remain staged for Hub CRM review; no website CRM copy is created.

## Requirements

- The Website keeps Better Auth owner authorization for its page, read BFF and write BFF. Hub independently authenticates each write using a dedicated `YORKSTEAD_AUTOMATIONS_WRITE_SECRET`, distinct from CC-021 read secret, Tasker bearer, CRM cookie/password and Google credentials.
- Hub command request is strict, bounded and versioned; action allowlist is `approve_task`, `reject`, `dismiss`, `reclassify`, and `stage_lead`. Capture UUID, expected state/classification and idempotency key are validated. Illegal kind/state transitions conflict.
- Task approval reuses the existing Hub Google Tasks processing path. Capture claim and idempotency/audit record prevent concurrent and retried requests from creating a second Task. A timeout/ambiguous Google mutation becomes `needs_review`; it is never silently retried. Calendar creation is not repeated.
- Reject/dismiss/reclassify are source-native Hub changes with append-only redacted audit history. Reclassification is limited to supported classifications and pending captures. All `needs_review` captures require manual reconciliation before state changes because legacy Tasker/Calendar writes may predate CC-022 command markers.
- `stage_lead` keeps lead data in Hub's pending CRM review. It does not create or update Website CRM records or auto-approve/create a Hub company/opportunity. If an existing Hub intake draft is missing, the user is told that Hub CRM review setup remains required.
- Website displays classification, created/check timestamps, source, state, safe details and outcomes; controls require explicit confirmation for consequential writes. Pending, conflict, failure, timeout/ambiguous result, retry-safe and disabled/unconfigured states are distinct. Retry-safe and status-check controls retain the original command ID/idempotency key and request body across record refreshes and component remounts; uncertain commands block new actions for that capture.
- Capture lists/details remain bounded and no-store. Transcript remains excluded from the Website browser DTO. No secrets, raw provider errors or private records are logged.
- Preserve Tasker/Pixels, local fallback, briefing, Gemini audio/playback, OAuth/Tasks, device controls, existing Hub routes and jobs. No live capture action, production record, env mutation, migration, deployment, merge, message or endpoint retirement is included.

## Acceptance criteria

1. Hub documents current capture/review/task/CRM/auth/dedup/retry/audit contracts and the new command contract.
2. Hub write route rejects missing/wrong/short credentials, malformed/oversize bodies, invalid actions/state/kind/identity/key, replays payload conflicts safely, and returns private no-store outcomes.
3. State changes use atomic SQL claims/conditional updates and an expiring command lease. Duplicate requests cannot alter an active processing command; stale finalizers cannot overwrite success or append a conflict audit. Only `approve_task` commands durably marked immediately before Google Tasks POST can enter ambiguous recovery. External mutation ambiguity remains `needs_review` without retry.
4. Website owner gate and independent Hub auth both fail closed; missing write credential disables controls and writes without affecting CC-021 reads.
5. Website provides a responsive capture inbox, expanded safe details, confirmed approve/reject/dismiss/reclassify/stage-lead controls, safe destination/outcome, execution audit history, retry/conflict/loading/failure states.
6. Lead routing remains Hub-only and pending review. No automatic customer messages or Website CRM replication.
7. Tests cover owner denial, Hub write denial, invalid transitions, duplicate/concurrent approvals, Google timeout boundary, task/lead dedup, partial failures, classification destination changes, audit safety, and desktop/mobile browser flow using synthetic records and mocked providers.
8. CC-021 read response remains backward compatible; no CC-020 protected routes or voice/device/scheduled behavior regressions.
9. Specs, contract/operations docs, handoffs and rollback/rollout are updated in both repos. Hub PR precedes Website PR; neither is merged/deployed manually.
