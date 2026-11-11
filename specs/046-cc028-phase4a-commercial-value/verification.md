# CC-028 Phase 4a — verification

**Updated:** 2026-11-11. Local disposable PostgreSQL 18.6 (`scripts/local-db.sh`, database `website_test`); CI uses PostgreSQL 16. No production data or provider account was used.

## What changed and what did not

Only naming and presentation moved: the Marketing metric field, three labels, and two captions. No value is computed differently, and no stored record is touched.

## Results

- Focused: `bun test components/marketing/marketing-metrics.test.ts` — 2 pass, 0 fail.
- `bun run yorkstead:check` — PASS, 47 spec directories.
- `bun run db:migrate:check` — 24 application migrations validated.
- `bun test` — 649 pass, 0 fail, 0 skip (6,024 assertions, 27s).
- `bun run lint` — 0 errors; one pre-existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — clean.
- `bun run build` — success.

## Limits

- No browser test was added: these surfaces are text changes on existing owner pages, and the aggregation behavior is covered by the metrics test.
- Historic Marketing values were not compared against past proposals; the slice deliberately does not reconcile them.
- T104b, which would create projects on proposal acceptance, is not implemented here.
