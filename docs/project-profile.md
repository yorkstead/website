# Project profile

## Purpose

- What the project does: Public Yorkstead Systems website, qualified inquiry funnel, owner command center, and operational project showcase.
- Primary users: Prospective small-business clients and the Yorkstead owner/operator.
- Success measure: Qualified inquiries reach the private pipeline reliably, public claims remain evidence-backed, and owner workflows remain secure and recoverable.

## Stack

- Runtime/framework: Next.js 16 App Router, React 19, TypeScript.
- Package manager: Bun 1.3.14.
- Database/storage: Neon PostgreSQL through server-only access and ordered SQL migrations.
- Deployment target: Vercel at yorkstead.com.

## Verification

- `bun run yorkstead:check`
- `bun run db:migrate:check`
- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run build`

## Important boundaries

- Existing behavior to preserve: Public routes, service attribution, first-party analytics, inquiry storage, owner authentication, and the private dashboard.
- Security/data constraints: No secrets or database credentials in the browser; all public input is untrusted, bounded, validated, rate limited, and stored only for its stated purpose.
- Operational risks: Public copy must not imply unverified customer results; deploys must preserve migrations and environment contracts; action failures need direct recovery paths.
