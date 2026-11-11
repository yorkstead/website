# CC-028 Phase 3 — verification

**Updated:** 2026-11-11. Local disposable PostgreSQL 18.6 (`scripts/local-db.sh`, database `website_test`); CI runs PostgreSQL 16. No production database, customer record, or provider account was used.

## Focused coverage

`bun test lib/consultation-model.test.ts` — 4 pass, 0 fail (12 assertions):

- linked consultation keeps the stored name/business/email when the request edits them;
- linked consultation still accepts status, date, and response edits;
- a linked consultation cannot be repointed at a different `lead_id`;
- unlinked consultations keep editable identity behavior.

## Repository baseline

- `bun run yorkstead:check` — PASS, 47 spec directories.
- `bun run db:migrate:check` — 24 application migrations validated (`0001`–`0024`).
- `bun run db:migrate` — applied/skipped with no changes on the second pass; `bun run auth:migrate` reported no migrations needed.
- `bun test` — 653 pass, 0 fail, 0 skip (6,036 assertions, 26s).
- `bun run lint` — 0 errors; one pre-existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — clean.
- `bun run build` — success; 89 static pages generated.

## Not covered

- Browser coverage for the linked snapshot panel was not added. The panel is presentation-only and reuses an existing owner-authenticated route; the enforced invariant is covered by unit tests and by the server-side merge.
- Local Playwright was not run for this slice; earlier local runs of the default and feature suites passed against the same database.
- Historical consultations that already drifted from their CRM inquiry are unchanged by design; no backfill was performed.

## Result

The snapshot invariant is enforced on the write path, not only in the UI: an API caller that submits different identity values for a linked record receives the stored values back.
