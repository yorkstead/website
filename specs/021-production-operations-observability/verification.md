# CC-013 verification and operational limits

## Revision and environment

- Base: current live `main` `51a52abc676c575dc46b2e06b82f4d3cd2bf43bb`, including CC-012 merge `4c5f48749d01600f6382a4425ffaf5c715132c63` as an ancestor.
- Branch: `feat/cc-013-operations-observability`; isolated worktree `/tmp/yorkstead-cc013`.
- Local runtime: Bun 1.4.2, Next.js 16.4.2. Repository CI pins Bun 1.3.14.
- Production observations during this implementation: none. No production URL, provider console, database, deployment, customer account or secret was contacted. The Operations page's health probes are implemented for authenticated owner use after deployment, but were not invoked against production.

## Verified locally

- `bun run yorkstead:check`: pass, 21 active specification directories.
- `bun run db:migrate:check`: pass, 17 migrations (0001–0017); there is no migration in CC-013 and no migration checksum/history changes.
- `bun run lint`: pass with one pre-existing warning in `components/login-panel.tsx` (`window.location.assign` navigation).
- `bun run typecheck`: pass.
- `bun test`: 349 pass, 105 skipped, zero failures (3,868 assertions). Skipped PostgreSQL tests require `TEST_DATABASE_URL`, which is not configured.
- `bun run test:e2e --grep 'CC-013'`: 2 pass. Public health exposes only liveness; anonymous Operations page redirects to login and the Operations API returns 401 with private headers and no health details. Tests ran with local Next dev server and Playwright Chromium; no test authenticated as owner or called the database.
- `bun run build`: pass; `/dashboard/operations` and `/api/operations` are dynamic routes.
- `git diff --check`: pass.
- No database integration transaction, provider API, live alert, customer operation, restore, rollback or deployment was attempted.

## Migration and compatibility

- Database compatibility is additive and schema-neutral: all 17 existing migration plans validate unchanged; no database queries mutate data. The runtime observation transaction is explicitly `READ ONLY` and uses only fixed catalog/status `SELECT`s with bounded connection/query timeouts.
- `/api/health` now returns `{ "status": "ok" }` with HTTP 200 as application liveness, even when a dependency is unavailable. It no longer reports database readiness, timestamp or dependency state. Consumers that used its previous 503/database behavior must use an appropriately private operations view; no such consumer was searched or independently verified.
- The private Operations route and page require owner auth independently. Private/no-store/no-referrer headers are applied by both response helpers and route configuration. Customer and owner authorization policies are unchanged.
- No new dependencies or changes to Vercel schedules, customer routes, delivery, recovery, environment settings or secrets.

## Production monitoring gaps and blockers

- Health is checked only when an owner opens or refreshes the page. There is no independent uptime monitor, continuous poll, durable incident history, acknowledgement workflow, paging, email or push alert delivery.
- The database connectivity/catalog checks and Better Auth configuration check are point-in-time app observations. They do not test a real sign-in, owner passkey, customer auth, external provider API, rate/capacity or actual deployed schema permissions.
- `vercel.json` records intended cron schedules, not proof that the deployed scheduler is enabled. A recent morning-briefing row is the only app-observed cron result; reminder and retention execution have no trusted heartbeat source.
- GitHub Actions, Vercel deployments/functions, Neon control-plane status, email/push providers and customer endpoints are not queried. No arbitrary URL is accepted or probed.
- Backup existence/freshness, restore capability/rehearsal, rollback rehearsal, incident responder, escalation path and recovery time objectives remain `not_verified`. The page supplies evidence needed and related readiness links; it has no recovery controls or incident actions.
- No live alert, rollback, recovery, invitation, email, provisioning or customer activation occurred. No production data, environment, secret, migration or access state changed. No PR merge or manual deployment occurred.

## GitHub CI

Unmerged draft [PR #66](https://github.com/yorkstead/website/pull/66) targets `main`. Its live checks are reported on the PR and apply only to its current head; do not treat historical PR #65 checks as CC-013 validation. Local verification above is tied to the implementation source in this worktree. Merge and deployment remain unauthorized.
