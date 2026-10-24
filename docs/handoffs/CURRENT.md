# Current handoff

- Active feature: CC-003 — Customer Authentication Foundation.
- Active spec: `specs/011-customer-authentication/`.
- Branch: `feat/cc-003-customer-authentication`; implemented and fully verified; PR #53 is open for review and remains unmerged.
- Architecture: A second Better Auth instance uses the `customer_auth` PostgreSQL schema, `/api/customer-auth` base path, `yorkstead-customer` cookie prefix, and independent `CUSTOMER_AUTH_SECRET`.
- Provisioning: Public signup and Better Auth user creation are blocked. Session creation requires an already-active `customer_identities` row mapped as `('yorkstead-customer-auth', Better Auth user ID)`.
- Authorization: Request access derives the subject only from a server-verified, unexpired customer session, then requires the existing active identity, tenant, membership, tenant project, and explicit project grant.
- Disabled scope: Customer login, registration, invitations, customer routes, publishing, and document sharing remain unavailable. The customer auth route returns a non-cacheable 404 while the login capability is false.
- Internal compatibility: Existing owner Better Auth configuration, bootstrap, cookie, passkeys, owner session checks, CRM, and workspace routes are unchanged.
- Persistence: Migration 0010 adds only the isolated Better Auth schema and core tables. Existing customer and internal records are unchanged.
- Production data/configuration: Not accessed or modified. No customer account, invitation, Adorned link, secret, or production configuration was created.
- Rollback: Revert application code while preserving the additive schema. Any future destructive cleanup requires a separate data audit and migration.
- Verification: CI run #208 passed scaffold, dependency audit, migration validation/application, unit/PostgreSQL integration, lint, typecheck, Playwright, production build, and clean-worktree checks.
- Pull request: #53 is open; no production configuration, merge, or production deployment was initiated.
- Prior foundation: CC-002A merged through PR #52.
