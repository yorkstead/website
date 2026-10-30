# CC-023 operations and rollback

## Activation

- No environment variables, provider credentials, external connections, or synthetic service rows are required.
- The initial provider catalog is descriptive guidance only. An owner must add and confirm each service, account, amount, renewal, dependency, or manual health observation.
- The application deployment's established ordered migration workflow adds the empty directory/audit schema. Only normal reviewed release authorization may activate production code/schema.
- Overview observations are on-demand and read-only, with a short 15-second server cache and no background polling. `Operations` is limited to its existing database/auth/briefing checks; `Automation Hub` static health is not an ingestion, workflow, or provider health guarantee. The existing read contract supplies a bounded workflow-history summary when its dedicated read secret is configured.
- GitHub Actions and GitHub deployment status use the existing owner-only project intelligence path and server-side `GITHUB_TOKEN`; Vercel deployment status uses its existing server-side `VERCEL_TOKEN` when configured. No token is sent to the browser. Missing scopes, missing credentials, timeouts, rate limits, or malformed responses stay unknown/degraded and preserve the source timestamp.

## Routine use

- Refresh only when needed; inspect `source`, `checked at`, and freshness before acting.
- Record billing amount, cadence, basis, and confirmation only from a trustworthy invoice/account record. Mark unknown/usage-based charges without inventing totals.
- Add only dependencies the owner has verified. Archive entries instead of deleting so historical audit remains.
- Never put passwords, access tokens, API keys, recovery codes, card data, or customer records in account/notes fields.

## Failure response

- Missing credentials or unavailable monitors remain `unknown` or `not_monitored`; consult the linked provider console. HTTP liveness alone does not imply product health.
- Failed/stale writes show generic errors; reload and review the current revision before retrying.
- No action from this view provisions services, changes subscriptions, sends alerts, restarts systems, or mutates providers.

## Rollback

Revert the application change through a reviewed code rollback. Keep `system_directory_*` tables and immutable audit rows. Do not run destructive down migrations, erase operational history, or modify provider accounts. The additive tables are safe to leave unused if the UI is reverted.
