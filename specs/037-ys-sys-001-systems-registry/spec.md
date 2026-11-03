# YS-SYS-001 — Systems Registry Upgrade

## Owner direction — 2026-11-03

- Retain the currently configured Production and Preview databases. Do not pursue former-database recovery or historical row-level parity.
- Accept empty, partially populated, or populated initial Systems Directory states. Preserve the records and append-only audit history that are present when implementation is released.
- Reconstruct Systems Directory and original Opportunity Discovery records only from documented source evidence. Reconstructed records must be identified as reconstructed, never as recovered historical rows.
- CC-023 remains the Registry's authoritative architectural foundation; do not create a parallel registry.
- Migration 0023 remains unapplied to Production until separately authorized.

These owner decisions supersede the earlier seven-row/eleven-event historical-preservation gate and former-database recovery plan below. They do not authorize production queries, data entry, migration, configuration changes, or deployment.

## User value

Give the Yorkstead owner one reliable, evidence-backed registry of the systems the business operates, what each system depends on, who owns its recovery, what subscriptions cost, and which operational facts are known or unknown.

## Authority and compatibility

Upgrade the existing CC-023 Systems Directory. The authoritative persistence remains the existing `system_directory_entries` and `system_directory_audit` model, extended additively. Preserve every record and audit event present in the retained database, along with its IDs, account labels, costs, URLs, notes, renewal dates, owner scoping, page/API routes, and existing response contracts. Do not assume a record count or create a parallel registry. Never delete/rekey/migrate existing entries without a separately reviewed, evidence-backed mapping.

## Registry classes

Represent six distinct concepts with explicit types and links:

1. Providers and services.
2. Provider accounts and ownership.
3. Subscriptions, billing periods, evidence and entitlement sharing.
4. Applications and workloads.
5. Infrastructure and assets.
6. Stack components and runtime/tooling dependencies.

Every candidate or imported fact carries source/provenance, observed/confirmed time, confidence or evidence state, and an owner/responsible role where known. Unknown values remain unknown.

## Scope

- Extend the existing owner-only directory with typed inventory, relationships and evidence, preserving the current entry model and compatibility routes.
- Preserve each pre-existing Directory entry's immutable legacy identity independently of editable provenance; old Directory rows stay in its compatibility list, and their `legacy` provenance round-trips through Registry edits.
- Serialize PostgreSQL renewal dates as calendar-date strings (`YYYY-MM-DD`) so reads can be submitted unchanged in date inputs and later edits.
- Historical preflight work used the existing owner diagnostic route and was retired in PR #90. It is not an active Registry feature or prerequisite for this implementation slice.
- Stage newly discovered candidates as unverified; detect duplicates against existing records and require owner review before they become authoritative.
- Represent account ownership and recovery responsibility without storing credentials, recovery codes, payment data or customer operational records.
- Represent subscription cost evidence as actual, estimated or unknown, with currency, period, source/evidence reference and shared-entitlement allocation. Totals must not count one shared entitlement multiple times or turn missing evidence into zero.
- Represent typed dependency edges and allow an owner to inspect direct/transitive impact with clear graph bounds and source records.
- Distinguish monitored, not configured, unknown, stale and failed observations. Keep health monitoring separate from directory assertions and show provenance/time.
- Preserve append-only audit for each material change and support reviewing legacy and new history together.
- Keep the existing feature usable while new data is staged. Any activation control defaults off and is owner/server scoped.

## Trust, privacy and operational boundaries

- Existing owner authorization applies independently to each page/API operation. Server fixes tenant and actor; client input cannot choose either.
- Preserve strict schemas, same-origin mutation protections, bounded bodies, safe generic errors, private/no-store headers and database-only server access.
- No advertising identifiers, browser database access, external probe URL, provider token, customer data in public intake, provider mutation, purchase, or automatic health claim.
- No new paid service or provider integration is implied by catalog presence.
- Production remains read-only until a separate explicit release/migration authorization. No production migration, write, configuration change, merge or deployment is authorized by this feature request.

## Acceptance criteria

1. CC-023 remains the sole authoritative directory, retaining its page, APIs, DTO compatibility, authorization and audit stream. Existing rows carry an immutable legacy marker that cannot be changed or reclassified out of the legacy Directory view.
2. Any records and immutable audit history present in the retained database remain intact. Fresh, empty, partially populated, and populated states are supported; tests use synthetic records and do not assume historical counts.
3. Six registry classes and typed, bounded relationships are represented without conflating provider, account, subscription, workload, infrastructure and component.
4. New candidates remain staged/unverified until explicit owner review; duplicates are surfaced without silently merging records.
5. Ownership, recovery responsibility, provenance and evidence state are explicit; unknown is never converted to a positive assertion.
6. Costs separate actual/estimated/unknown, show evidence and period, and avoid duplicate shared entitlements or false zero totals.
7. Dependency impact views are bounded, accessible and explain edge provenance; links do not imply health or failure.
8. Health distinguishes monitoring configuration and observation status, retains timestamps/source, and does not add arbitrary probes or polling.
9. Every material mutation is owner-authorized, revision-safe, transactionally audited and compatible with immutable audit constraints.
10. Ordered additive migration checks, disposable database preservation/integration tests, relevant browser flows and repository verification pass; each slice has independent review/rollback notes.
11. Roadmap and handoff keep Automation Hub recovery, CC-026 activation/migration evidence and MKT-QR-001 print readiness coordinated as separate dependencies/workstreams.
12. Cleanup PR #90 removed the temporary preflight from source and is merged/deployed; the owner reported both flags disabled and the authenticated retired mode returning 404. Before any future Production migration, use a new prospective preservation/recovery baseline of the retained database, without historical seven-entry/eleven-audit assumptions or public row-level evidence.

### Dependency impact and activation readiness continuation

The owner-facing dependency and activation-readiness surface is specified in [`dependency-impact-readiness/spec.md`](dependency-impact-readiness/spec.md). It consumes only explicit, non-archived relationships and existing evidence; it never invents a dependency, confirms an inferred relationship, runs probes, or interprets missing links as proof of independence. Relationship kinds `depends_on`, `runs_on`, `uses`, and `integrates_with` participate in dependency traversal. `owns` and `billed_through` remain visible as ownership/billing context but do not expand outage impact. A recorded integration is traversed in its stored direction and is labeled accordingly.

Activation readiness is an evidence summary, not an automatic approval. It reports verification, ownership/recovery responsibility, billing, monitoring, relationship completeness, cycles and bounded/truncated analysis. It distinguishes critical blockers from informational unknowns and provides an explicit count/meaning for each. Empty inventory is supported and is not represented as healthy or ready. The typed interfaces remain owner-only and default-off; no Production flag or migration is changed by this work.

## Non-goals

- Replacing CC-023 or introducing a second source of truth.
- Editing legacy rows to make the seven-record count or $76.40/month figure appear true.
- Production migration/data/configuration changes, deployment, merge, paid service purchase, provider mutation, alert delivery or automated remediation.
- Coupling the feature to Hub capture recovery, CC-026 activation, marketing attribution, or PWA changes.
