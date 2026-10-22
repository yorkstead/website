# Client delivery workspace

**Issue:** #47  
**Status:** Implementing  
**Date:** 2026-10-22

## User value

An owner can open a converted client project from the lead pipeline, see the original lead and CRM handoff without creating a second CRM source of truth, and manage structured delivery information that survives reloads and other devices.

## Boundaries

- Preserve current project fields, tasks, repositories, deployments, undo history, snapshots, and optimistic concurrency.
- Store delivery data additively inside the existing primary workspace JSON document.
- Treat website inquiries and CRM records as read-only linkage sources in the project workspace.
- Do not create, merge, relink, or otherwise alter production Adorned records.
- Store payment status and an external reference only; never store card, bank, secret, or payment credential data.
- Do not change Morning Command audio behavior.

## Production audit

Read-only audit on 2026-10-22 found:
- Current website database: one Adorned inquiry (ID 8), status `won`, with no `converted_project_id`.
- Primary workspace: no Adorned project.
- CRM: one Adorned company, one won opportunity, one active project, eight open milestones, and no project/payment records.
- A legacy website database has no Adorned match and is behind the current migration set.

Production records remain unchanged. Linking or creating the Adorned workspace project requires explicit confirmation and a backup in a separate production operation.

## Requirements

1. Resolve `/dashboard?project=<id>` only after workspace hydration and show a recoverable not-found state when the project is missing.
2. Add a Zod-validated, optional client delivery model with scoped deliverables, milestones, client decisions, HTTPS document links, payment status/reference only, and delivery activity.
3. Preserve and load legacy projects that do not contain delivery data.
4. Edit delivery data through the existing ProjectWorkspace design and persist it through the existing versioned workspace endpoint.
5. Show website lead and exact CRM opportunity linkage read-only; never persist a CRM copy in workspace JSON.
6. Preserve optimistic concurrency and undo behavior for delivery edits.
7. Keep conversion atomic and idempotent under repeated calls.
8. Add automated coverage for conversion idempotency, deep-link resolution, serialization, legacy compatibility, and conflicts.

## Acceptance criteria

- A valid converted-project deep link opens its project after hydration.
- An orphaned deep link explains that the project was not found and offers safe recovery actions.
- Delivery scope, milestones, decisions, links, payment status/reference, and activity survive validation, save, reload, and snapshot serialization.
- Existing projects without delivery data continue to load unchanged.
- A second conversion attempt returns the original project ID and does not append another project.
- ProjectWorkspace identifies its website inquiry and exact CRM opportunity when available, while CRM remains authoritative.
- No live Adorned record is created, merged, linked, or assigned a payment state by this change.
- Required repository checks, browser tests, and production build pass in CI.

## Non-goals

- CRM editing or CRM schema changes.
- Invoice processing, payment collection, or payment credentials.
- Automatic fuzzy matching or production record repair.
- Creating an Adorned workspace record without explicit production authorization.
- Morning Command audio changes.
