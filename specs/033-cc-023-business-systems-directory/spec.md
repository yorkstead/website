# CC-023 — Business Systems Directory & Control Panel

## User value

Yorkstead's owner can see urgent, evidence-backed operational exceptions at the top of the Command Center, then open a searchable directory of the services, dependencies, accounts, costs, and renewal dates maintained for Yorkstead.

## Scope

- Add a private, owner-only Systems Directory under Settings & Tools.
- Persist manually maintained provider/service entries, safe account identifiers, billing facts, explicit dependency links, favorites, archival state, revisions, and append-only audit history.
- Start with catalog suggestions for GitHub, Vercel, Neon, Google Workspace, Stripe, and other providers evidenced by repository configuration. Suggestions are unconfigured and carry no assumed account, charge, or health.
- Add a compact Exceptions First panel near the top of the existing Command Center. Compose the existing Operations monitor and Automation Hub read-only health check with explicitly linked directory entries. Reuse observations; do not create another monitoring subsystem.
- Show health states `healthy`, `degraded`, `down`, `unknown`, `stale`, and `not_monitored`, with source, affected service/project, and observation time. Lack of evidence remains unknown or not monitored.
- Calculate monthly equivalents and annualized costs from explicitly entered billing cadence and amount; mark estimated/actual and confirmed/unverified separately. Show upcoming renewals only for maintained dates.
- Offer owner-triggered refresh only through existing checks; no polling, provider mutations, alert delivery, or arbitrary URL probes.

## Trust and data rules

- Owner session is required on every page/API read and mutation. The server fixes the Yorkstead owner scope; clients cannot select a tenant or actor.
- Keep data in a dedicated additive PostgreSQL migration. Use strict server validation, revision compare-and-set, duplicate prevention, and immutable audit events.
- Store no credentials, passwords, tokens, recovery codes, payment data, or customer operational data. Account identity is email/username only.
- Official dashboard/documentation URLs must be HTTPS and safe to render as external links.
- Only explicit manually maintained relationships are used for impact mapping. A linked dependency does not itself prove a dependent project has failed.
- No provider is declared connected or healthy without a trusted observation. Existing operations evidence is limited to its documented checks; Automation Hub `/api/health` means only that static endpoint responded.
- Do not derive subscription prices from provider marketing pages or claim accounting reconciliation.

## Acceptance criteria

1. Systems Directory is reachable from Settings & Tools and the command palette; overview shows urgent exceptions before normal workspace content.
2. Directory supports create, edit with optimistic concurrency, archive/unarchive, favorite, search, category/provider filtering, and explicit project/repository/domain/infrastructure links.
3. Invalid schemas, secret-like notes/account values, unsafe URLs, cross-tenant selectors, stale revisions, and duplicates are rejected without leaking submitted values.
4. Every material mutation creates durable actor/time/action audit history. Audit history cannot be updated or deleted through application endpoints.
5. Cost summaries treat unknown/free/usage-based/promotion cases honestly, convert recurring cadences correctly, and distinguish estimate/actual and confirmed/unverified amounts.
6. Overview orders outages/failures, degraded/integration issues, dated renewals, then failed workflow observations; each row shows its source, affected linked records, and checked time. No failures and unavailable monitoring are rendered distinctly.
7. Refresh is bounded and read-only, reuses current Operations and Automation Hub checks, and remains usable when integrations or credentials are missing.
8. Owner-only and cross-tenant denial, validation, URL, archive/favorite, audit, concurrency, dependency, cost, renewal, missing credential, timeout/stale, secret redaction, navigation, and responsive behaviors have tests.
9. CRM, Automation Hub, shopping planner, analytics, customer portal, public intake/privacy, and existing health endpoint behavior remain unchanged.
10. Ordered migration validation, repository checks, production build, and applicable browser verification are recorded. One PR is opened with safe rollout/rollback details; no merge, manual deploy, production secret/data change, or provider subscription mutation occurs.

## Non-goals

- CC-025 public navigation/design-system redesign.
- Provider control-plane integrations or credentials not already approved and wired for the relevant read-only contract.
- Continuous monitoring, guarantees of uptime, alert delivery, remediation, provider writes, billing reconciliation, purchases, cancellations, or production activation.
- A customer-facing system directory or customer tenant access.
