# Terminated engagement retirement preparation

Status: **review only; production execution blocked**. Dated 2026-10-26 America/Denver; live database observations were 2026-10-27 03:11–03:17 UTC. This extends, and does not replace, [the termination audit](2026-10-25-adorned.md). No production mutation, deletion, QuickBooks access, configuration change, merge or manual deployment was performed or authorized.

## Authority, source and scope

Website live main: `51a52abc676c575dc46b2e06b82f4d3cd2bf43bb`. [PR #65](https://github.com/yorkstead/website/pull/65) is MERGED at `2026-10-25T18:44:48Z`, with that merge SHA. Hub live main: `f501fe26e474ab1be62a6bef0a1dbee7456981e8` (PR #86 merge). Both were fetched and matched live remote tips before branching. Hub had no open PRs; issues #57 and #69 remain open and outside this scope. These repository facts do not establish deployed revisions.

Branches/worktrees: `chore/terminated-engagement-retirement` at `/tmp/yorkstead-retirement-website`; Hub `chore/terminated-engagement-references` at `/tmp/yorkstead-retirement-hub`. Original website `.gitignore` work and original Hub checkout are preserved.

This is operational documentation and removal of obsolete repository references, not a material product feature. Existing specs remain authoritative. A durable retirement/hold capability would require a separate spec, plan, tasks, migration review and disposable validation before implementation. No migration or production-write script is included here.

Read repository instructions, constitution, startup/handoffs, release/verification guidance, code-change-verification, spec-convergence, security-review and production-hardening skills; used Neon/Postgres guidance for read-only inspection. Read installed Next.js 16.4.2 route/page documentation before Hub edits. No secrets, contact addresses, intake messages, notes, update bodies or document URLs were exported to this report.

## Production inventory custody

Fresh read-only inventory, exact record IDs, production project/branch identity and field observations are retained in a restricted local artifact supplied to the owner, outside both repositories. The website repository is public. Do not copy fresh private CRM evidence, addresses, intake, notes, update bodies, credentials or backup data into a PR, issue, build log or source file. The prior published termination audit is retained unchanged as requested.

Explicit project/branch SELECT queries revalidated the inquiry, company, opportunity, project and exact child sets against the prior audit. Schema CHECK constraints and lifecycle trigger metadata were inspected separately. These are separate snapshots, not a cross-database atomic snapshot. Requery and reconcile the protected inventory before any future operation. Repository main is not proof of the deployed runtime.

The broader external-system/name searches from the original audit were not rerun. Google Tasks/Calendar/Gmail, Drive, provider mail, Tasker, caches, backups, alternate identities and QuickBooks were not inspected. No live authenticated UI or complete production forecast was tested. Missing linked records do not establish absence of financial evidence elsewhere.

## Supported lifecycle operations and decision gates

Live CHECK constraints were inspected independently of source. No lifecycle/audit triggers were returned by `information_schema.triggers` for these six tables; do not assume automatic audit retention. Existing routes do not provide a coordinated, audited, compare-and-swap retirement transaction.

| Object | Supported now | Proposed operation after separate authorization | Blocker / qualification |
| --- | --- | --- | --- |
| Audited inquiry | `new/contacted/qualified/proposal/won/lost/archived`; owner `updateLeadStatus` supports these. Constraint requires archived timestamp iff archived. | Prefer a durable retired classification preserving historical `won` after a separately specified feature. Existing-state fallback is `won → lost`, `archived_at=NULL`, only if owner explicitly accepts the semantic reclassification and immutable before-image records the prior win. | **Do not archive yet:** cron permanently deletes archived inquiries older than 365 days; no hold exception found. `lost` avoids that purge predicate but is not a true termination state. No fallback is approved here. |
| Company | `prospect/qualified/demo/proposal/won/lost/client` | Candidate `client → lost`, preserve ID/name/notes and append a termination reason to retained audit. | No generic company stage-update API found; onboarding creates client/prospect and must not be used. `lost` semantics require owner approval; proper retired state needs new work. |
| Opportunity | `prospect/qualified/demo/proposal/won/lost`; pipeline PATCH supports stage changes | **Default preserve `won` and the original estimate as historical evidence**; require durable retirement exclusion before declaring full retirement. Optional `won → lost` only with explicit owner agreement, preserved before-image/history and unchanged estimate. | No archive/termination field. Changing `won` rewrites sales history. Leaving `won` permits project conversion retry to promote company back to `client`, even when project already exists. Preventing that reactivation requires a lifecycle guard or a separately approved fallback. |
| Project | `active/on_hold/completed/cancelled` in live schema | `active → cancelled`; retain company/opportunity links and all children. | No project status PATCH found; needs separately reviewed guarded operator transaction or lifecycle API. `on_hold` is not permanent termination; `completed` would be false. |
| Eight milestones | Only `open/completed` in DB and PATCH | Leave all eight `open` as preserved unfinished history until an additive `cancelled`/retired lifecycle is implemented; then change only this exact ID set. | **Cannot cancel/archive now. Never mark completed to hide them.** Parent cancellation prevents new milestone creation, but existing PATCH and project listing are not cancellation-gated. |
| Three portal updates | `draft/ready_for_review/approved/changes_requested` | Preserve all three `draft`, kind/title/body/timestamps intact; no approval/publication. Add a retirement guard before claiming they cannot be reused. | No archive state. PATCH can change review state by ID without checking company/project lifecycle. Company `lost` blocks current preview lookup and new update creation, but is not a durable mutation/publication lock. |

Evidence: website `app/actions/leads.ts`, `lib/data-retention.ts`, `app/api/cron/retention/route.ts`; Hub `app/api/crm/projects/route.ts`, `projects/milestones/route.ts`, `pipeline/route.ts`, `onboard/route.ts`, `portal-preview/route.ts`, `portal-updates/route.ts`, and live constraints. Hub project listing includes cancelled projects and all associated milestones. Historical records may remain visible to authorized administrators; active-work lists must distinguish history before full retirement is accepted.

Hub website-summary, action-queue and briefing queries exclude both `won` and `lost` opportunities. Website lead priority/follow-up queries exclude won/lost/archived. Thus the observed win is already excluded from these prospective queues by source logic. This is not a complete revenue-accounting/UI audit, and no financial values should be zeroed to make a dashboard look inactive.

**Decision:** full safe retirement is not supported by the current lifecycle model. Ship repository reference cleanup for review; hold all production operations. Do not silently implement new lifecycle features or substitute completion/deletion for cancellation.

## Backup and audit-retention procedure — not executed

1. Assign an owner/operator, independent reviewer, retention custodian, incident contact and maintenance window. Obtain written retention/legal-hold disposition from the owner; no legal duration is inferred here. Record authorized ID sets, fields and desired states, plus rollback authorization.
2. Reverify deployed code/schema and exact production project/branch/database identities. Inspect applicable scheduled purge jobs and configured recovery history at that time. Do not change schedules/configuration to work around retention without separate authorization.
3. Capture a consistent, encrypted before-image per database using a least-privilege read-only session and approved private storage. Include full selected records, foreign-key-related evidence, schema/constraints and any existing audit/history; include existing notes/intake/update bodies only in the restricted backup, never Git, chat or normal logs. Use a reviewed direct connection for any dump, with credentials supplied securely rather than command-line values. No full production export or backup branch was created in this session.
4. Manifest: UTC snapshot time, database/branch identity, exact IDs/counts, schema/code versions, cryptographic checksums, storage location, access controls, custodian, retention/hold and expiry policy. Keep recovery credentials separately. Validate decryption and restore of the backup in an isolated, access-restricted environment without email/provider/network side effects. Confirm all 15 records and relationships and the original estimate survive the rehearsal.
5. Preserve original financial documents, correspondence and audit history in their existing systems. Store append-only operation evidence separately from mutable CRM notes. A note is context, not an immutable audit. Record actor, approval, reason `terminated engagement`, request ID, before/after field values, exact affected IDs/counts and transaction result. Never overwrite previous notes or audit events.
6. Do not authorize website archival unless the hold/retention design ensures required evidence survives the 365-day purge. Provider recovery history is not a substitute for durable financial/audit retention. Backup/restore capability and configured recovery window remain **unverified**, not assumed from Neon availability.

## Future execution contract — no executable mutation included

- Resolve the lifecycle decisions above first. A future implementation must have a reviewed plan/spec where material, exact update allowlist and synthetic disposable rehearsal covering conflict, rollback, retry and unauthorized access.
- Reread exact IDs, state, links, timestamps and child sets immediately before execution. Stop on missing/extra children, changed estimates, newly linked members/shares/tasks/records, or concurrent edits. Never select mutation targets by name or fuzzy match.
- Within each database use a transaction, bounded lock/statement timeouts, deterministic parent/child locking and compare-and-swap predicates for every expected state/version. Assert exact affected counts before commit. Only explicitly approved lifecycle fields and necessary update timestamps may change; preserve amounts, intake, notes, bodies, dates, links and financial references. No triggers/jobs/provider integrations may be assumed harmless; qualify side effects first.
- Neither existing UI actions nor independent PATCH calls provide the required cross-record atomicity/history. Do not use them as a substitute for the approved execution mechanism. Never call project conversion as a retirement operation.
- The databases cannot share one atomic transaction. Once prerequisites are met, prefer retiring the Hub group first, verify it, then the website inquiry; record the checkpoint between them. On partial failure, stop and obtain the approved compensation decision rather than blindly retrying or automatically reactivating the engagement.

## Rollback procedure — separately authorized

Before commit, any mismatch/error rolls back that database transaction. After commit, stop further work, retain failure/operation audit and compare current target fields to the just-written after-image. Restore only fields changed by this operation using the protected before-image and a new guarded transaction; never overwrite intervening edits, unrelated rows or financial evidence. Record a new compensating audit event rather than erasing the original event. Restoring `client`/`active` can reactivate work, so the owner must explicitly approve that consequence.

If restoration is uncertain, restore backups into an isolated environment for comparison first. Do not reset a whole production branch/database to roll back these few rows; that would risk unrelated work. Database rollback does not roll back external tasks/messages—none are authorized here. Repository rollback is a revert of the reviewed cleanup commits through new PRs; it changes no production records and requires separate merge/deployment authorization.

## Post-change verification checklist — future execution only

- Rerun the exact inventory/constraint queries under read-only transactions; compare approved field deltas, all 15 IDs and relationship sets against the manifest. Verify the original estimate, all preserved content checksums, financial records and original audit history unchanged.
- Assert expected changed-row counts and unchanged non-target row fingerprints from the controlled execution window. Stop on unexpected concurrent changes; do not claim whole-database immutability from aggregate counts alone.
- Check owner-only active leads/client counts, pipeline/forecast, project/milestone work queues, onboarding readiness, briefing and connected website summary. Confirm terminated work is excluded while retained history remains accessible only to authorized users. Test unrelated fictional records in isolation for regression.
- Verify update approval, publication, project conversion and member/share access cannot reactivate this engagement; portal drafts remain drafts and gates stay closed. Current code does not yet satisfy all these checks.
- Verify retention/hold protections, append-only operator audit and recoverable backups; monitor the next scheduled queue/retention cycle without contacting the former client. External systems not inspected here require their own read-only audit and authorization, never inferred deletion permission.

## Explicit production-authorization checkpoint

**STOP. No production action is authorized by this report, either PR, passing tests or a future merge.** Before a later operation the owner must approve: exact IDs/fields/states; historical-win treatment; milestone/draft retirement design; retention/hold and tested backup/restore evidence; audit destination; operator/window; cross-database order; post-change criteria; and scoped rollback. Approval must separately cover any lifecycle feature, migration, configuration change, merge/deployment or external-system operation. QuickBooks remains excluded. Until these blockers are resolved, leave all 15 production records unchanged.

## Repository acceptance and verification

Acceptance: preserve the original audit; retain exact fresh record evidence outside source control; distinguish supported transitions from schema/API gaps; document recovery/retention and explicit authorization; remove only obsolete Hub active references; preserve unrelated work and all production prohibitions. Hub removes the terminated onboarding target, replaces client-specific project guidance with neutral instructions, and marks roadmap work historical/superseded. Other prospect behavior is preserved. Details and current test evidence are recorded in each repository's handoff and PR.

### Current local results

Bun 1.4.2 / Node 26.10.0, worktree based on the website SHA above; production credentials absent. Frozen install passed with no lockfile changes; local Bun differs from packageManager 1.3.14. Focused retention/lead tests 6/6; scaffold, migration-plan check (17), lint and typecheck passed. Lint retains one pre-existing login navigation warning. Full suite: 342 pass, 105 skip, 0 fail, 3,839 assertions. Database integration skipped because no disposable TEST_DATABASE_URL is configured. No migrations applied. Browser checks not applicable to documentation-only changes.

`bun run build` did not pass: sandbox font fetch failed; escalated retry reached Turbopack but failed worker port binding (`Operation not permitted`). `bun run build --webpack` also failed on the unchanged `node:crypto` import via `lib/workflow-lead.ts` and `components/workflow-lead-form.tsx`. No source/configuration workaround was introduced. Hub tests/typecheck/build passed; see its handoff. These results apply to the delivered source changes; final documentation/PR links do not change application code. GitHub exact-head results are separate evidence.
