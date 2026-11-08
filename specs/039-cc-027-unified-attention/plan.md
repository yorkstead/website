# CC-027 implementation plan

1. Add an overview-local source-aware attention panel using existing Workspace, CRM, Opportunity Discovery, project-intelligence, and Automation Hub read contracts.
2. Keep external rows display-only and link them to existing same-origin or validated source destinations. Keep current Workspace task controls and all dedicated source workflows intact.
3. Represent retrieval state, freshness, and query limits explicitly; do not turn errors into empty queues or infer urgency.
4. Add focused unit/component and authenticated browser regression coverage. No schema, integration, OAuth, migration, production, or external-write changes.
5. Run focused tests and repository-required checks, record limits and results, update `CURRENT.md`, and open one draft PR against verified `main`.

## Security and data integrity

- Dashboard route and Automation Hub endpoint retain their existing owner-session checks.
- Provider credentials remain server-side in existing adapters. Browser receives only bounded validated data returned by the owner-gated endpoint.
- External links are either fixed same-origin routes or parsed GitHub URLs restricted to `github.com` over HTTPS.
- No attention item is stored or sent to an external provider; no source lifecycle mutation is introduced.

## Rollback

Revert the UI/model/spec changes; there are no persistent or external side effects to reverse.
