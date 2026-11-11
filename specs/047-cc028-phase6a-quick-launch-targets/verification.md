# CC-028 Phase 6a — verification

**Updated:** 2026-11-11. Local disposable PostgreSQL 18.6 (`scripts/local-db.sh`, database `website_test`) for the suite; the link changes themselves need no database.

## Results

- Focused: `bun test components/dashboard/quick-launch.test.ts` — 4 pass, 0 fail, including the new explicit-override case.
- `bun run yorkstead:check` — PASS, 47 spec directories.
- `bun run db:migrate:check` — 24 application migrations validated.
- `bun test` — 650 pass, 0 fail, 0 skip (6,026 assertions, 32s).
- `bun run lint` — 0 errors; one pre-existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — clean.
- `bun run build` — success.

## Remaining `4twentydev` references

- `lib/case-studies.ts` links the sic-pizza case study to `https://github.com/4twentydev/sic-pizza`. That is published content, not a default, so it was **not** changed here. If that account no longer hosts the repository, the public link is broken and needs an owner decision about the replacement source.
- `components/dashboard/quick-launch.test.ts` still uses `4twentydev` nowhere; the remaining test values are `yorkstead` or explicit overrides.

## Limits

- A saved workspace that already contains literal `4twentydev` settings keeps them. Editing Settings is an owner action; silently rewriting preferences would hide the change.
- Navigation regrouping (T106b) is not implemented; it requires owner acceptance of the proposed taxonomy.
