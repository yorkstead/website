# YS-SYS-001 — Systems Registry Upgrade

## User value

Give the Yorkstead owner one reliable, evidence-backed registry of the systems the business operates, what each system depends on, who owns its recovery, what subscriptions cost, and which operational facts are known or unknown.

## Authority and compatibility

Upgrade the existing CC-023 Systems Directory. The authoritative persistence remains the existing `system_directory_entries` and `system_directory_audit` model, extended additively. Preserve all seven original records, IDs, account labels, costs, URLs, notes, renewal dates, audit histories, owner scoping, page/API routes and existing response contracts. Never create a parallel registry or delete/rekey/migrate legacy entries without a separately reviewed, evidence-backed mapping.

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

1. CC-023 remains the sole authoritative directory, retaining its page, APIs, DTO compatibility, authorization and audit stream.
2. All seven production legacy records retain their exact IDs and material values; existing immutable audit history remains queryable and unchanged. A redacted before/after reconciliation proves this.
3. Six registry classes and typed, bounded relationships are represented without conflating provider, account, subscription, workload, infrastructure and component.
4. New candidates remain staged/unverified until explicit owner review; duplicates are surfaced without silently merging records.
5. Ownership, recovery responsibility, provenance and evidence state are explicit; unknown is never converted to a positive assertion.
6. Costs separate actual/estimated/unknown, show evidence and period, and avoid duplicate shared entitlements or false zero totals.
7. Dependency impact views are bounded, accessible and explain edge provenance; links do not imply health or failure.
8. Health distinguishes monitoring configuration and observation status, retains timestamps/source, and does not add arbitrary probes or polling.
9. Every material mutation is owner-authorized, revision-safe, transactionally audited and compatible with immutable audit constraints.
10. Ordered additive migration checks, disposable database preservation/integration tests, relevant browser flows and repository verification pass; each slice has independent review/rollback notes.
11. Roadmap and handoff keep Automation Hub recovery, CC-026 activation/migration evidence and MKT-QR-001 print readiness coordinated as separate dependencies/workstreams.

## Non-goals

- Replacing CC-023 or introducing a second source of truth.
- Editing legacy rows to make the seven-record count or $76.40/month figure appear true.
- Production migration/data/configuration changes, deployment, merge, paid service purchase, provider mutation, alert delivery or automated remediation.
- Coupling the feature to Hub capture recovery, CC-026 activation, marketing attribution, or PWA changes.
