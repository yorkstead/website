# CC-022B implementation plan

1. Audit the merged CC-021/CC-022 capture dispatch, migrations, read DTO, command lease/idempotency, owner auth, briefing and navigation contracts. Record exact routes and provider dispatch boundaries.
2. Add deterministic purchase intent/extraction helpers and focused unit/provider-dispatch tests. Put the explicit shopping path before classifier/Calendar/CRM dispatch; keep uncertain parses in review.
3. Add ordered Hub migrations for purchase items, ingestion identities, payday configuration/receipts/reserves and append-only shopping audit. Add bounded CAS/idempotent domain operations and guarded PostgreSQL verification/rollback notes.
4. Add a distinct versioned Hub shopping command route and extend the optional sanitized CC-021 v1 shopping section. Do not reuse read credentials or CC-022 capture approval actions.
5. Add owner-only Hub read/review surface and concise briefing integration while preserving existing audio contract and failure behavior.
6. Add Website shopping DTO/BFF client and authenticated owner BFF using Better Auth, same-origin/body/schema checks, dedicated server credential and same-key recovery.
7. Add responsive owner planner under existing Automations navigation; cover filtering, review/edit/split, state actions, history/audit, payday summary, unavailable/partial states and optional Sunday surface.
8. Add unit, disposable PostgreSQL, provider mock, BFF and desktop/mobile browser tests. Run task checks then each repository's full verification commands.
9. Deliver Hub PR first with migrations and backend contract; Website PR second cross-linked to Hub. Record exact CI and screenshots where browser tooling supports them. No merge/deploy/production operation.
