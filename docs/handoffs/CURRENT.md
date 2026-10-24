# Current handoff

- Active feature: CC-004 — Customer Portal Interface.
- Active spec: `specs/012-customer-portal-interface/`.
- Branch: `feat/cc-004-customer-portal-interface`; implementation and verification complete; PR #54 is open for technical-lead review and remains unmerged.
- Interface: Reusable overview, timeline, deliverables, activity, and navigation components use Yorkstead's existing tokens and primitives with responsive, accessible, dark-first presentation.
- Preview: `/dashboard/customer-portal-preview` requires the existing server-verified owner session and renders a clearly labeled fictional fixture. Unauthenticated requests redirect to owner login.
- Data architecture: The portal contract is a read-only presentation adapter target for existing Project and ClientDelivery concepts, not a persistence source. The fixture has no database, workspace, CRM, tenant, network, or Adorned dependency.
- Disabled scope: Customer login, invitations, published updates, document sharing, downloads, customer routes, and public document routes remain unavailable.
- Internal compatibility: Existing owner authentication, CRM, workspace persistence, public website, and customer authorization infrastructure are unchanged. No migration is required.
- Production data/configuration: Not accessed or modified. No customer account, invitation, live project link, Adorned record, secret, or production configuration was created.
- Verification: GitHub Actions CI run #215 passed scaffold validation, dependency audit, migration validation and disposable PostgreSQL application, unit/PostgreSQL integration tests, lint, typecheck, Playwright, production build, and clean-worktree verification.
- Preview reference: The repository's Vercel integration reported the branch preview ready at `https://website-git-feat-cc-004-customer-portal-interface-yorkstead.vercel.app/dashboard/customer-portal-preview`. It still requires owner authentication; no deployment was initiated manually.
- Review: The automated handoff finding was addressed by this update. No unresolved implementation limitation changes the disabled customer-facing boundary.
- Rollback: Revert the presentation files, preview route, tests, dashboard link, and documentation. There is no schema or production-data rollback.
- Pull request: https://github.com/yorkstead/website/pull/54
