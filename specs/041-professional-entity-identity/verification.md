# Verification

## Implementation
- Branch: `feat/seo-brandon-york-entity`.
- Repository: `yorkstead/website`.
- No database or infrastructure change.
- Production non-www/www redirect discrepancy remains intentionally untouched.

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
