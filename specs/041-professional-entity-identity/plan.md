# Plan

1. Reuse `lib/brand.ts` and `lib/founder.ts` as the only entity data sources; do not introduce another SEO abstraction.
2. Publish a dedicated professional ProfilePage at `/brandon-york` while retaining the company About page.
3. Reuse Organization and Person `@id` references across schema output. Keep the original `founderStructuredData` export for compatibility with existing tests/consumers.
4. Point relevant founder links and root author metadata to the new route; preserve service/project ownership semantics.
5. Extend existing Bun tests, run required verification and check rendered routes in CI.
6. Submit a draft PR; do not merge, release, or modify Vercel hostname redirects.

## Deferred decisions
- Canonical host decision: use `https://www.yorkstead.com` across the existing centralized brand base, canonical tags, sitemap and JSON-LD. This matches the already-configured Vercel non-www → www redirect; no Vercel setting change is part of this PR.
- Personal LinkedIn/GitHub: add verified URLs to Person `sameAs` only after account ownership is confirmed.
