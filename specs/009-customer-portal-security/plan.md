# Plan

1. Record the PR #49 authorization audit and explicit disabled-capability boundary.
2. Add new customer security tables with composite keys that make cross-tenant grants invalid.
3. Add a provider-neutral authorization repository that accepts only a verified provider/subject pair and project ID.
4. Add pure unit coverage for input validation, returned context, query scoping, and disabled capabilities.
5. Add PostgreSQL integration coverage for same-customer access and cross-customer/cross-tenant denial.
6. Re-run the existing private authorization suite to prove internal CRM and workspace behavior remains owner-only.
7. Update handoff state, run the full verification matrix, and open a pull request with audit findings and evidence.

## Data approach

Migration 0009 creates only new tables. It neither alters nor backfills workspaces, inquiries, Better Auth records, or CRM data. Customer identities store a provider/subject mapping plus normalized email metadata; they do not store credential material. Composite foreign keys bind memberships, tenant projects, and project grants to the same tenant. A unique project constraint prevents a workspace project ID from belonging to multiple tenants.

The authorization query joins every layer and requires active status at each layer. It returns a minimal authorization context and never reads the workspace JSON. Existing owner-only routes remain untouched.

## Disabled capabilities

A server-side capability constant keeps client login, invitations, published updates, and document sharing false. No route or UI consumes the new authorization primitive in this slice.

## Recovery and rollback

Before production migration, rollback is a source revert. After an empty migration, the new tables can remain unused safely. Once future customer records exist, preserve them and reverse application use before considering a separate, explicitly authorized cleanup migration; never drop or rewrite them automatically.
