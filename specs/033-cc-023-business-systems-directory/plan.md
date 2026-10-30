# CC-023 implementation plan

1. Preserve the existing App Router, owner-session checks, Command Center navigation, Operations checks, and Automation Hub health contract.
2. Add an ordered additive PostgreSQL migration for owner-scoped service records, manually maintained dependency links, and append-only audit events. Do not seed subscriptions or operational states.
3. Implement strict schemas and a server-only repository/service layer. Mutations use transactions, expected revisions, uniqueness constraints, and immutable audit history. Scope is fixed server-side to Yorkstead's owner workspace.
4. Add independently authenticated, bounded private GET/POST/PATCH routes; reject client tenant/actor fields, secret-like values, unsafe URLs, oversized bodies, and stale revisions.
5. Build a responsive directory page in Settings & Tools with search, provider/category filters, favorite/archive controls, edit form, costs, links, provenance, and audit details.
6. Add a pure exception/cost classifier. Overview composes current operations observations with the currently supported Automation Hub static health check and manually linked directory records. It must not infer provider-wide or dependent-project health.
7. Add the compact exception panel to the existing Command Center and preserve existing CRM/shopping interactions.
8. Test service logic with fakes, routes with owner denial, disposable PostgreSQL migration/integration, browser access/navigation/responsive interactions, and no-secret guarantees.
9. Run the required verification commands, converge spec/tasks/verification/runbook, update handoff, commit, push, and open one Website PR. Do not merge or deploy.

## Rollout and rollback

Existing build-time migration workflow applies ordered SQL on the normal deployment path; production activation remains subject to the owner's normal merge/release gates. The directory starts empty. No secrets or provider setup are needed. New server routes fail closed without owner auth and database access. Rollback by reverting the application commit while retaining the additive directory/audit tables; do not drop tables or erase audit evidence. No provider mutation or background job needs reversal.

## Provider and monitoring limits

Existing checks: `/api/operations` observes the website database/auth schema and safe briefing status; Automation Hub check uses its documented static health endpoint. Existing project intelligence can query GitHub/Vercel for explicitly linked projects but is a separate project-refresh workflow, not proof that all services or applications are healthy. CC-023 will not reuse provider marketing data, broaden credentials, query arbitrary URLs, or create new provider connections. Unconfigured catalog suggestions stay `not_monitored`.
