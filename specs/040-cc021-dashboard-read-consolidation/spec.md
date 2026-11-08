# CC-021 Dashboard Read Consolidation

## Goal

Serve the existing Command Center Google Tasks and Calendar display from one authenticated Website read of the established Automation Hub CC-021 projection. Ordinary Dashboard rendering must not call Hub `/api/briefing` or write briefing execution events.

## Shared contract

The canonical additive contract is maintained in Automation Hub `specs/002-website-automations-read-contract/spec.md` and synchronized with `docs/website-automations-read-contract.md`. It keeps v1 and adds optional Denver date context, bounded Calendar summaries, and at most 100 due Dashboard Tasks while preserving the existing 20-item `tasks` section.

## Acceptance criteria

- Dashboard owner authentication succeeds before the CC-021 projection is read; the read secret remains server-only.
- The server page obtains one CC-021 projection and passes its sanitized result to both the existing Dashboard task/calendar widgets and Unified Attention View.
- A current v1 response supplies the existing task list and CalendarTimeline with their current source data, formats, and limits. Existing task completion continues through `/api/dashboard/google-task` only after the owner explicitly completes a task.
- A v1 response from an older Hub without optional fields remains compatible; Calendar/Dashboard Tasks appear unsupported or unavailable, never available-empty.
- Calendar and Dashboard Tasks retain independent available-empty, unavailable, and truncated states. No stale value is shown without source freshness evidence.
- `priority` is not calculated or fabricated. The unreferenced `DashboardOperationsBriefing` remains unmounted and unchanged.
- Ordinary Dashboard rendering makes no call to Hub `/api/briefing`; intentional Hub briefing generation, Tasker-only playback tracking, and Website scheduled/plain-text briefings remain unchanged.
- No task/calendar business records, copied task records, credentials, migrations, schedules, CRM records, or Opportunity Discovery records are created or modified by the read path.

## Non-goals

- No Tasker, briefing-generation, reminder, Calendar write, OAuth, credential, schedule, CRM, Opportunity Discovery, Recovery, Registry, or production changes.
- No activation of `DashboardOperationsBriefing` and no new priority algorithm.
