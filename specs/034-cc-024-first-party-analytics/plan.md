# CC-024 implementation plan

1. Create strict acceptance/verification artifacts and inspect installed Next.js 16.4 guides before implementation.
2. Add an ordered additive migration for `conversion_events.contact_inquiry_id` referencing existing `contact_inquiries`, a safe uniqueness/index strategy and retention/query support. Preserve unlinked historical rows; verify fresh, repeat and prepared-upgrade paths.
3. Harden shared analytics contracts and attribution normalization; remove sensitive `qualified_lead` metadata and introduce precise server outcome types.
4. Harden the public ingestion route: stream byte cap, JSON content type, strict object/field schema, same-origin/Fetch Metadata, consistent private path exclusion, query-free public paths and explicit no-store responses. Keep the server writer allowlisted and bounded.
5. Make browser tracking deduplicate page views across effect replay and remount per navigation entry while keeping later visits/clicks distinct. Keep same-body retries on one idempotency key.
6. Link successful contact, workflow audit, workflow lead and restaurant trial outcomes to inserted inquiry IDs server-side; do not link validation errors, duplicate/spam/failed writes, or client-provided IDs.
7. Rebuild dashboard aggregates around safe definitions: observed page-view sessions, page-view counts, CTA intent, unique persisted inquiries, sequential/clearly labeled funnel, attribution coverage, equal prior periods, safe campaign labels, top content and freshness/partial states.
8. Add the compact 7-day snapshot to the existing owner Command Center Overview and link to Insights.
9. Add focused unit/API/database/owner/browser regressions and update privacy, analytics architecture, spec, operations, verification and `CURRENT.md`.
10. Run focused checks, then `docs/verification.md`, applicable Playwright and disposable PostgreSQL checks; inspect diff, commit, push to the current feature branch and open one PR. No merge/deploy/production write.

## Rollout and rollback

The only database change is additive and nullable. Existing event rows remain valid and unlinked. Standard ordered migration workflow applies it after review/merge; no production migration is run in this feature branch. If application rollout is reverted, keep the additive column/index and all retained events; do not delete or rewrite historical analytics. Disable public collection through the existing `NEXT_PUBLIC_FIRST_PARTY_ANALYTICS=disabled` gate only under separate production configuration authorization.
