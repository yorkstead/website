# CC-003: Customer authentication foundation

**Status:** Ready for review  
**Date:** 2026-10-23

## User value

Yorkstead can later authenticate approved customers without allowing customer credentials, sessions, or accounts to enter the owner-only Better Auth boundary or Command Center.

## Boundaries

- Preserve the existing owner Better Auth instance, cookie, tables, bootstrap, passkeys, session checks, and owner-only routes unchanged.
- Add a second Better Auth instance with a distinct API base path, cookie prefix, secret, and table names.
- Keep public customer login, registration, invitations, customer routes, document sharing, and publishing disabled.
- Do not create customer accounts, link live Adorned records, modify production secrets, or deploy production configuration.
- Use Better Auth for credential verification, session creation, expiration, and revocation; do not implement custom cryptography or session tokens.
- Resolve projects only from the server-verified customer session subject and the existing tenant-scoped grant query.

## Architecture decision

The customer authenticator is an independent Better Auth configuration mounted at `/api/customer-auth`. It uses:

- `CUSTOMER_AUTH_SECRET`, never the owner `BETTER_AUTH_SECRET`;
- the `yorkstead-customer` cookie prefix, never the owner `better-auth` prefix;
- a dedicated `customer_auth` PostgreSQL schema containing Better Auth's user, session, account, and verification tables;
- an eight-hour database session lifetime with normal Better Auth validation and revocation;
- email/password provider support with public signup disabled, as a vetted session foundation for a later invitation/passwordless flow.

The route returns a non-cacheable 404 while `customerPortalCapabilities.login` is false, so no public authentication endpoint is reachable. Better Auth user creation is also rejected by a database hook. A future onboarding change must introduce an authenticated provisioning service and explicitly change both controls.

The verified Better Auth user ID maps to `customer_identities(auth_provider, auth_subject)` as `('yorkstead-customer-auth', session.user.id)`. Email, tenant, membership, role, project, and permission claims are never accepted from the client or copied from the session.

## Security implications

- Owner and customer cookies cannot collide, and the separate secrets prevent either authenticator from verifying the other's signed state.
- Dedicated tables prevent customer accounts or sessions from becoming owner accounts.
- Owner authorization continues to require an owner-instance session plus the configured owner email.
- A valid customer session is necessary but insufficient: identity, tenant, membership, tenant project, and explicit project grant must all remain active.
- Expired or revoked sessions are rejected by Better Auth before identity resolution.
- The capability gate denies access before session verification or database authorization.

## Requirements

1. Add the isolated Better Auth configuration and additive customer-auth tables.
2. Disable public signup and all customer-auth routes by default.
3. Resolve a customer project only after server-side session validation.
4. Preserve active identity, tenant, membership, tenant-project, and explicit grant enforcement.
5. Add unit and PostgreSQL coverage for authentication, provisioning, and authorization boundaries.
6. Run migration validation, disposable PostgreSQL tests, full unit/integration tests, lint, typecheck, Playwright, production build, and clean-worktree verification.

## Acceptance criteria

- Owner credentials and cookies cannot authenticate through customer auth.
- Customer credentials and cookies cannot authorize owner routes.
- A verified customer cannot select or impersonate another subject.
- Missing, expired, or revoked sessions deny before project lookup.
- Disabled identities, suspended tenants or memberships, missing/revoked grants, and cross-tenant/project attempts fail.
- Public customer auth and provisioning remain unavailable while the capability is disabled.
- Existing owner authentication and internal CRM behavior remain unchanged.

## Non-goals

- Enabling login or adding customer-facing pages.
- Sending invitations or passwordless email.
- Creating or modifying live customer or Adorned records.
- Changing owner authentication or production configuration.
