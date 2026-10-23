# Customer portal security foundation

**Status:** Ready for review  
**Date:** 2026-10-22

## User value

Yorkstead can provision customer identities and explicitly scope each identity to a tenant and individual project before any customer portal is exposed, preventing one customer's authenticated subject from reading another customer's project data.

## Authorization audit of PR #49

PR #49 changes only the Issue #47 specification and handoff documentation. It introduces no route or authentication regression by itself. The client-delivery workspace it documents remains reachable only through the existing owner session, but the merged application has no customer identity, tenant membership, or project-grant model. Reusing the owner session or exposing the existing whole-workspace endpoint to customers would therefore cross tenant boundaries.

## Boundaries

- Preserve the existing owner session and every internal CRM, lead, workspace, marketing, push, and briefing authorization path.
- Add customer security records without changing or backfilling existing records.
- Treat a verified authentication provider and subject pair as identity input; do not store passwords, tokens, session secrets, or other customer credentials.
- Deny access unless the identity, tenant membership, tenant project, and identity-specific project grant are all active and tenant-consistent.
- Keep customer login, invitation delivery, published updates, and document sharing disabled.
- Add no customer-facing page, route, cookie, email, or API response.
- Do not modify production data as part of implementation or verification.

## Requirements

1. Add an additive migration for customer identities, tenants, tenant memberships, tenant projects, and project grants.
2. Enforce uniqueness and tenant consistency with database keys, foreign keys, checks, and indexes.
3. Resolve project access from a verified provider/subject pair and a project ID in one deny-by-default database query.
4. Return only the authorization context needed by a future customer endpoint; never return workspace or CRM data.
5. Reject empty credentials/project IDs before querying storage.
6. Keep all customer-facing capabilities explicitly disabled in code.
7. Test same-tenant permitted access and cross-customer, cross-tenant, disabled-identity, disabled-membership, inactive-project, and revoked-grant denial.
8. Preserve all owner-only route tests and application behavior.

## Acceptance criteria

- Customer A's provider/subject pair can resolve only a project for which Customer A has an active tenant membership and active project grant.
- Customer A's provider/subject pair cannot resolve Customer B's project, including when both customers are valid.
- A project cannot be assigned to more than one tenant.
- A project grant cannot combine a membership and project from different tenants.
- Unknown, disabled, suspended, archived, or revoked records fail closed.
- Login, invitations, published updates, and document sharing remain disabled and no customer endpoint exists.
- Existing internal CRM and owner workspace checks continue to pass.
- The migration plan, lint, typecheck, tests, and production build pass.

## Verification

- The nine-file application migration plan validates, and migration 0009 applied successfully to disposable PostgreSQL twice (apply, then idempotent no-op).
- 268 unit and PostgreSQL integration tests pass, including same-customer access, cross-customer denial, inactive/revoked denial, unique project ownership, and cross-tenant foreign-key rejection.
- Existing owner-only API and Server Action authorization tests pass unchanged.
- Yorkstead scaffold check, migration check, typecheck, and production build pass; the build generated 76 routes and no customer portal route.
- Lint passes with zero errors and one unrelated pre-existing warning in `components/login-panel.tsx`.
- The local parallel Playwright run passed 15 of 20 scenarios; five unrelated public-page scenarios timed out or missed navigation under sandbox resource contention. CI remains the authoritative browser run.

## Non-goals

- Customer account registration or login.
- Invitation creation or delivery.
- Customer sessions, cookies, password reset, passkeys, or OAuth callbacks.
- Publishing client updates.
- Uploading, downloading, or sharing documents.
- Migrating or associating existing clients/projects without an explicit future data operation.
- Replacing or relaxing the owner-only workspace and CRM authorization model.
