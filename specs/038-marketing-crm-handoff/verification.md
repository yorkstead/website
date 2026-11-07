# Verification record

## Local verification — 2026-11-07

- Revision under test: branch `feat/112-marketing-crm-link`, based on verified live `main` `d92ecf1459ff09a620bebc4144262daf15f4a3e6`.
- `bun test lib/marketing-plan.test.ts lib/data-retention.test.ts tests/private-authorization.test.ts` — 20 passed, 0 failed.
- `bun run yorkstead:check` — passed (40 active spec directories).
- `bun run db:migrate:check` — passed (24 ordered migrations; no migration added).
- `bun run typecheck` — passed.
- `bun test` — 500 passed, 121 skipped, 0 failed. Skips are database-backed tests; `TEST_DATABASE_URL` is not configured.
- `bun run lint` — passed with one existing warning in `components/login-panel.tsx:62`.
- `git diff --check` — passed.
- `bun run test:e2e` — 25 passed, 10 failed. The unauthenticated owner-route scenarios failed because the local PostgreSQL/Better Auth connection is unavailable (`ECONNREFUSED 127.0.0.1:5432`); portfolio JSON parse and public navigation cases also failed in this broad run. No Marketing owner browser scenario is exercised by the default suite.
- `bun run build` — passed; production compilation, TypeScript, and static page generation completed.

## Acceptance evidence

- A1/A5: `marketingCrmLinkShapeError` and `validateMarketingCrmLinks`; owner-only `PUT /api/marketing-workspace`; route tests reject missing, invalid, and duplicate relationships.
- A2: Marketing pipeline cards and prospect editor render CRM status, `next_step`, follow-up date, and the canonical lead URL.
- A3/A4: normalized prospects retain only `crmLeadId`; unit coverage confirms existing outreach activity and campaign content survive linking.
- A6: `archivedInquiryPurgeQuery` excludes CRM IDs referenced by Marketing; retention test checks the guard.
- A7: no Opportunity Discovery files changed.
- A8: focused route, validation, duplicate-link, unauthorized-access, retention, and history tests above.
- A9: no CRM creation, field synchronization, new migration/service/event system, production operation, merge, or deployment.
