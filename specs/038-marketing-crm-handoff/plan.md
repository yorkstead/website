# Marketing → CRM handoff implementation plan

1. Extend the existing Marketing prospect JSON contract with an optional CRM inquiry ID and validate the relationship on the existing owner-only workspace write.
2. Read safe, current CRM status/next-step/follow-up summaries for owner Marketing views and link navigation to the existing CRM lead page.
3. Keep Marketing outreach/campaign JSON intact and prevent the retention job from purging inquiries still linked by Marketing.
4. Add focused unit, route authorization, and disposable PostgreSQL coverage for relationship validation, retention, duplicate handling, and history preservation.
5. Add an isolated owner-authenticated Playwright workflow for linking, CRM status/action display and navigation, duplicate rejection, field ownership, and preserved Marketing history.
6. Prove with disposable PostgreSQL that the retention SQL protects only linked CRM IDs, still purges unrelated expired archives, and restores normal purge eligibility after unlinking.
7. Update the verification record and `docs/handoffs/CURRENT.md`, run repository checks, then publish one focused PR without merge/deploy.

## File boundaries

- `lib/marketing-workspace.ts`, `lib/marketing-storage.ts`, `app/api/marketing-workspace/route.ts`, `app/dashboard/marketing/page.tsx`, and `components/marketing*`: Marketing owner workflow and safe CRM summary.
- `lib/data-retention.ts`: preserve linked CRM records under the existing archive retention policy.
- Existing specs/tests and a focused new spec directory: acceptance and evidence.
- No changes to `migrations/0023*`, `migrations/0024*`, Registry, backup/recovery code, or Opportunity Discovery integration.
