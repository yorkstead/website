# CC-016 — Command Center Operational Validation

## User value

Give the owner reliable evidence that a real website inquiry can move through the existing Command Center from submission to a project workspace, including useful failure and recovery behavior.

## Scope

Audit and validate the existing public inquiry, persistence, CRM, follow-up, conversion, and project workspace paths end to end. Add disposable PostgreSQL integration coverage and owner browser workflows for persistence, lifecycle, navigation, repeat actions, and failures. Fix only defects demonstrated by code review and regression tests; preserve the current Yorkstead design and storage models.

## Acceptance criteria

- A1: A synthetic website inquiry is submitted through the public form, persisted once, visible with the submitted details in the owner CRM, and remains visible after refresh.
- A2: The owner can change status, save a private note and follow-up date, see matching open follow-up counts/buckets, reschedule it, and complete it. Stale, unauthorized, missing, invalid, retired, archived, closed, or database-failure cases fail safely without unintended writes.
- A3: The owner can convert an eligible inquiry repeatedly without creating duplicate projects or activities; the inquiry links to the resulting exact project workspace.
- A4: The workspace exposes its existing project tasks, milestones, decisions, activity, and note. Project/source links resolve to exact records; missing or expired IDs offer a useful return path.
- A5: Navigation, error, empty, partial-source, refresh, repeat-submission, and retry states are understandable and retain Yorkstead visual patterns.
- A6: Disposable PostgreSQL tests cover successful persistence/lifecycle/conversion and failures. Browser tests exercise the public submission through CRM and project conversion, plus important error and repeated-action paths.
- A7: Owner-only authorization, tenant isolation, retirement protections, and customer publication gates remain unchanged and are covered by regression evidence.
- A8: No real production inquiry, production schema/data, external CRM record, or customer publication/access state is modified. Test writes use synthetic disposable data only.
- A9: Scaffold, migration validation, lint, typecheck, unit/integration, browser, and build checks are recorded with revision/environment. A validation matrix lists workflow, expected, actual, evidence, remaining manual check, and pass/fail.
- A10: Rollback and a production smoke-test checklist are documented. Open `CC-016: Command Center Operational Validation`; do not merge or manually deploy.

## Constraints and non-goals

- Reuse the Next.js App Router, Bun, existing `contact_inquiries`, `workspaces.primary`, project delivery models, and owner authorization.
- Do not rebuild CRM or project features, create duplicate storage, add public intake fields for sensitive operational data, expose data to the browser beyond existing owner DTOs, weaken tenant isolation, or change portal publication gates.
- Do not run browser/database checks against production or use the known production inquiry as a fixture.
- Preserve the existing visual design; make only narrow, test-backed usability changes.
- No merge, manual deployment, production data operation, or schema change is in scope unless discovery proves a migration is necessary; stop for separate review before any schema expansion.
