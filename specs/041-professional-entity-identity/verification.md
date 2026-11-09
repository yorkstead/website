# Verification

## Implementation
- Branch: `feat/seo-brandon-york-entity`.
- Repository: `yorkstead/website`.
- No database or infrastructure change.
- The canonical base is now `https://www.yorkstead.com`, matching the pre-existing Vercel non-www → www redirect. No Vercel settings were changed.
- Rendered profile metadata, JSON-LD graph, and editorial link assertions are covered by `tests/e2e/founder-profile.e2e.ts`.

## Required checks
- `bun run yorkstead:check`
- `bun run db:migrate:check`
- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run build`
- `bun run test:e2e` when the CI environment supports browser tests.

## Follow-up
Record exact-head CI results and any failure or blocker here before requesting merge approval. Live HTTP and Search Console checks require deployment authorization.
