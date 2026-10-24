# CC-010 — Client Access

Base: freshly fetched main `6be30814c6a62e6b9efe8327ee4984596211f799` (CC-009). Owner-only organization-first access inspection and preparation. Production administration is read-only; all writes require explicitly selected disposable loopback configuration outside production. No issuance, delivery, enrollment, impersonation, grant issuance, reactivation or customer-route activation.

## Requirements

Inspect authoritative tenants, mappings, identities, memberships, view grants, invitations and retained audits with bounded pagination. Show lifecycle states, orphaned/inactive records, per-project objective blockers and never declare launch readiness while customer gates are disabled. Prepare invitation configuration independently of CC-006 issuance; never generate a token in this service. Require exact-scope confirmation and CAS revision for revocation. Add strict owner page/API/service authorization, configured origin checks, bounded JSON, private/no-store and no-referrer. Integrate dashboard, sidebar and command palette; preserve publishing and CRM.

## Acceptance

See acceptance.md. Fictional/disposable verification only. Deliver an unmerged PR; no deployment, production migration/configuration/data access or customer activity.
