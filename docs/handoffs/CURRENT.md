# Current handoff

- Active feature: CC-002A — active tenant authorization enforcement.
- Active spec: `specs/010-cc-002a-active-tenant-authorization/`.
- Branch: `fix/cc-002a-active-tenant-check`; implemented and fully verified; PR #52 is open for review and remains unmerged.
- Finding: The merged customer project authorization query required active identity, membership, tenant project, and grant, but did not join `customer_tenants` or require an active tenant. A suspended or disabled tenant could therefore authorize access.
- Implementation: Join `customer_tenants` through the membership tenant ID and require `tenant.status = 'active'`. No schema or data change is needed.
- Coverage: Unit coverage requires the tenant join/status predicate and rejects suspended/disabled fixtures. PostgreSQL integration coverage holds all downstream records active while proving suspended and disabled tenants cannot access the granted project.
- Disabled scope and internal compatibility: Customer login, invitations, published updates, document sharing, and customer routes remain disabled. Existing owner session and internal CRM/workspace authorization remain unchanged.
- Production data access: Not required and not attempted. No production record was read or changed.
- Rollback: Revert this code-only patch. No schema or data rollback is required.
- Verification: CI run #202 passed scaffold, migration-plan/application, unit/PostgreSQL integration, lint, typecheck, Playwright, production build, and clean-worktree checks.
- Pull request: #52 is open; no merge or deployment was initiated.
- Prior foundation: Customer portal security foundation merged through PR #50.
