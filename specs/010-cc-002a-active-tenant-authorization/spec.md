# CC-002A: active tenant authorization

**Status:** Ready for review  
**Date:** 2026-10-23

## User value

A suspended or disabled customer tenant cannot access any project, even if an identity, membership, tenant project, and grant were previously active.

## Boundaries

- Add the tenant status check to the existing customer project authorization query only.
- Preserve the provider/subject identity contract, membership/project/grant checks, owner-only internal CRM routes, and disabled customer-facing capabilities.
- Do not change the schema, migrate data, create customer-facing endpoints, or enable login, invitations, published updates, or document sharing.
- Do not access or modify production data.

## Requirements

1. Join `customer_tenants` by `customer_tenant_memberships.tenant_id`.
2. Require `tenant.status = 'active'` in the deny-by-default query.
3. Add unit coverage for the join/status predicate and tenant suspension behavior.
4. Add PostgreSQL integration coverage proving both `suspended` and `disabled` tenants cannot authorize access while all downstream records stay active.
5. Run the repository verification matrix, including browser tests and production build.

## Acceptance criteria

- An active tenant continues to authorize its explicitly granted project.
- A suspended tenant cannot authorize its project without changing the identity, membership, tenant project, or grant.
- A disabled tenant cannot authorize its project under the same conditions.
- Existing cross-customer isolation, owner authorization, and disabled customer-facing capabilities remain unchanged.

## Non-goals

- Tenant lifecycle UI or provisioning flows.
- Customer login, invitations, publications, or document sharing.
- Schema changes or production data operations.
