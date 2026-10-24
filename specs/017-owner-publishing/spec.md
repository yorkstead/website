# CC-009 — Owner publishing workflow

## Discovery

The Command Center uses authenticated dashboard pages with shared workspace navigation and command-palette entries. Browser workspace changes synchronize through `/api/workspace`; publication must read only `workspaces.primary`, never browser state. CC-008 owns preparation, approval, withdrawal, digest invalidation, revision checks and generated audit (0014). Approved overview gates the whole projection; child/date approvals are independent. Update chronology is timestamp/ID ordered. No additional persistence or migration is necessary.

## Requirements

Add Client Publishing to existing dashboard navigation and command palette, with a project selector populated from the persisted workspace and retained publication history. List eligible source candidates using the existing allowlist; optional descriptions require explicit selection. Show exact prepared snapshots before per-record approval, reviewed actor/time/revision, invalidated/withdrawn states, summary and audit history. No bulk publishing, source editor, tenant provisioning or customer activation.

All owner operations use the existing verifier and CC-008 transactions. Strict discriminated request schemas reject actor/tenant/role/status/payload injection. Mutations require the configured same origin, JSON content type, bounded streaming bodies, no-store responses and safe errors. GETs and every service method also verify owner. Browser stale responses must not replace a newer selection; mutation conflicts clear stale preview and require refresh. Source changes globally invalidate publication as in CC-008, including unrelated edits; do not relax this policy.

An owner-only approved preview is assembled using the same ClientProjectProjection assembler and adapter as the customer path. Load only approved snapshots in the correct active mapping/tenant, require an approved overview, and never combine drafts with approved preview. Missing/inactive source/mapping means no eligible preview; retained audit and withdrawal remain available where scope exists. Source saves are performed in the existing workspace UI, not here.

## Scope and release

Customer production routes, provider/enrollment gates, uploads/downloads, external reads and approvals remain disabled. No historical migration edits, production configuration/secrets/data operations, manual deployment or merge. Deliver feature branch, complete local/CI evidence, and unmerged PR. The supplied request ends at “No bulk publish”; no bulk action is implemented.
