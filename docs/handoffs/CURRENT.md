# Current handoff

- Active feature: Customer portal security foundation.
- Active spec: `specs/009-customer-portal-security/`.
- Branch: `feat/customer-portal-security-foundation`; ready for pull-request review and CI.
- PR #49 authorization audit: PR #49 is documentation-only. It introduces no access path, but the client-delivery workspace it documents has only the existing single-owner guard and no safe customer tenant/project boundary.
- Implementation: Additive migration 0009 adds disabled-by-default customer identities, tenants, memberships, tenant projects, and identity-specific project grants. Composite foreign keys prevent cross-tenant grants, and a unique project key prevents multi-tenant assignment.
- Authorization: A provider-neutral server repository resolves only an active provider/subject identity with an active tenant, membership, project, and explicit view grant. It returns authorization context only and does not read workspace or CRM data.
- Disabled scope: Customer login, invitations, published updates, and document sharing remain explicitly false. No customer page, route, cookie, email, or API response was added.
- Internal compatibility: Existing owner session, CRM, leads, workspace, marketing, push, and morning-briefing routes are unchanged; their authorization tests pass.
- Verification: Yorkstead scaffold and nine-migration checks passed; migration 0009 applied twice to disposable PostgreSQL (apply then no-op); lint passed with zero errors and one unrelated existing warning; typecheck passed; 268 unit/integration tests passed; production build passed with 76 routes.
- Browser verification: After installing sandbox browser dependencies, 15/20 parallel Playwright scenarios passed; five unrelated public-page scenarios timed out or missed navigation under sandbox resource contention. CI is the authoritative browser run.
- Production data access: Not required and not attempted for this feature. No production record was read or changed.
- Existing Adorned blocker: Creating or linking the audited Adorned workspace project still requires explicit authorization, a backup, an authorized owner session, and production project/team access. This feature does not alter that data.
- Rollback: Revert the feature commits before migration. After migration, leave the empty additive tables in place; once future customer records exist, preserve them and disable application use before any separately authorized cleanup migration.
- Prior completed feature: Issue #47 was merged through PR #48; PR #49 recorded its completion on `main`.
