# CC-015 — CRM & Project Workflow Completion

## User value

Help the owner move a real inquiry from first response through follow-up and into an actionable project, with reliable links between the existing records.

## Current-state audit

- Lead conversion and project deep-link handling from PR #48 already exist. `convertLeadRecord` conditionally claims an unretired inquiry and writes the project to the existing `workspaces.primary` row in one PostgreSQL statement; duplicate calls return the original project ID. Keep this path and its storage.
- Follow-up dates already use `contact_inquiries.follow_up_at`; the lead list exposes only a combined due-or-overdue filter and summary count. There is no completion action. The dashboard queue’s due count combines overdue and today.
- Project detail already reads the website inquiry/CRM linkage and displays the existing delivery milestones, decisions, activity, and project note. The website inquiry link targets the generic lead list, and website queue rows do not deep-link to their inquiry.
- Project tasks, delivery records, and journal notes already live in the existing workspace. Do not add duplicate project storage.

## Requirements

1. Preserve atomic, idempotent conversion, clear failures for invalid/missing/retired inquiries, and navigation to the confirmed existing project. Archived inquiries may not be converted through a hidden restore; the owner must explicitly restore them in the lead pipeline first. Existing projects and active inquiries are never duplicated.
2. Provide exact follow-up views for overdue, due today, and future dates in the owner’s America/Denver calendar. Keep counts derived from the same active, non-retired inquiry predicate as their lists.
3. Support rescheduling through the existing date field and completion by clearing the open follow-up date. Completed, won, lost, archived, expired/deleted, and retired inquiries are excluded from open follow-up views and cannot be completed through a stale form.
4. Link project detail to its exact originating website inquiry when one exists. Continue to show supported milestones, decisions, delivery activity, and the project’s current next-action note from the existing workspace models.
5. Make Command Center queue navigation land on the specific website inquiry. Unknown or expired IDs show a useful return path rather than a blank page.
6. Preserve owner-only authorization, existing tenant boundaries, privacy-first public intake, and retired-engagement exclusion. No customer/demo data, new duplicate source of truth, external CRM write, production mutation, or manual deployment.

## Acceptance criteria

- A1: First conversion persists one project and one activity in the existing workspace and marks the inquiry won with its project ID atomically; repeat submission returns the same project and creates no duplicate.
- A2: Invalid, missing, retired, and archived conversion attempts fail with an actionable safe error and create no project.
- A3: A valid lead queue link opens the exact lead record. A missing, invalid, expired, or retired lead ID explains that the record is unavailable and offers the full lead list.
- A4: Overdue, due-today, and future lists and dashboard counts agree in America/Denver; rescheduling moves a record between the correct buckets; completion clears it from all open buckets.
- A5: Stale, closed, archived, retired, and unauthorized completion attempts do not mutate records. Owner-only route/service checks and tenant-isolation regressions remain intact.
- A6: Project detail links back to its exact source inquiry and exposes existing milestones, decisions, delivery activity, and an actionable next step without persisting duplicate data.
- A7: Empty database and no linked source are clear states. No fabricated data, production operation, schema migration, or customer access change is introduced.

## Non-goals

- Rebuilding PR #48 conversion or deep-link behavior.
- New CRM/customer/project tables, follow-up history storage, or external CRM mutations.
- Any customer-facing route, access grant, automated email, public intake change, or production data operation.
