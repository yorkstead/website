# CC-026 implementation plan

1. Add migration `0022_opportunity-discovery.sql` with separate opportunity, evidence, interview, and append-only event records. Use UUIDs, bounded/check-constrained statuses, FK integrity, owner-managed timestamps, CRM lead linkage, optional existing consultation linkage, and indexes for status/industry/date/next action/search.
2. Implement strict domain schemas and pure qualification, URL-safety, duplicate matching, and report-normalization helpers. Preserve `unknown` as a first-class value and separate manual ordering from computed signals.
3. Implement owner-only server reads and mutations. Use parameterized SQL, bounded DTOs, optimistic/current-state checks for status transitions, audit writes in the same transaction, safe archive and list filtering/search/pagination, and source-link validation.
4. Implement explicit promotion through a transaction-aware PostgreSQL service. Lock the opportunity, reject archived/unvalidated/research-only cases, link an owner-selected duplicate or create a CRM inquiry only with validated consent-backed contact details, preserve existing follow-up/status, maintain unique link and idempotent retry, and append promotion history.
5. Add the `/dashboard/opportunities` owner workspace and CRM nav entry using CC-025 tokens/components. Build compact create/detail/edit/evidence/interview/qualification/report/queue flows with accessible confirmation and linkouts to consultations/leads/projects. Keep research status visibly separate from CRM sales status.
6. Add unit and disposable PostgreSQL tests for boundaries, state/events, qualification/unknowns, duplicate/link/promotion retries/concurrency, reporting separation, retention, and customer-route isolation; add owner Playwright coverage at phone/desktop sizes and capture screenshots.
7. Record operational and verification docs; run focused tests, all commands from `docs/verification.md`, full/focused Playwright, migration validation and build. Complete security review and criterion-by-criterion convergence, update `CURRENT.md`, then publish one PR without merge/deploy.

## File-level approach

- Domain/service: `lib/opportunity-discovery.ts`, `lib/opportunity-discovery.test.ts`, transaction/DB adapter as required by the existing `pg`/Neon boundary.
- Persistence: `migrations/0022_opportunity-discovery.sql`; dedicated tests in `tests/opportunity-discovery-database.test.ts` plus disposable test fixture.
- UI: `app/dashboard/opportunities/page.tsx`, owner server actions and focused components under `components/dashboard/opportunities/`; `components/dashboard/dashboard-navigation.tsx`.
- Documentation: this folder (`discovery.md`, `spec.md`, `plan.md`, `tasks.md`, `threat-model.md`, `operations.md`, `verification.md`, screenshots) and `docs/handoffs/CURRENT.md`.

## Rollout and recovery

Migration is additive; application rollout follows existing reviewed main/Vercel flow. No production migration or config change is performed here. Keep the schema and research records on application rollback; disable the route through code rollback and retain provenance. Promotion retries resolve to the linked CRM lead via the unique opportunity link.
