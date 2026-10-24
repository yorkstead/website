# Authoritative infrastructure and administration boundary

| Foundation | Authority and constraints | CC-010 integration |
| --- | --- | --- |
| CC-002 / 0009 | customer_tenants; tenant/project composite mapping plus globally unique project_id; memberships tied to identity/tenant; grants tied to both membership and mapping; roles member/admin, permission view | Explicit scoped read projections; disabled tenant/mapping creation; mapping archival; rename; no tenant inference, reassignment, activation or grants |
| CC-003 / 0010 | customer_auth schema, independent provider/cookie/session, customer_identities provider/subject uniqueness; per-request active identity/tenant/membership/mapping/grant joins | Expose associated identity ID/email/status only; no auth subject or credential table access; revocation changes future authorization without impersonation/session issuance |
| CC-006 / 0012 | customer_invitations, customer_invitation_projects, customer_provisioning_audit; immutable recipient/scope/verifier; pending uniqueness; terminal transitions; tenant-first locks and trusted provisioning actor | Bounded explicit-column inspection. Revocation enters the same database guard/provisioning audit with scoped CAS and owner actor. Never call issue from administration |
| CC-007 / 0013 | verified independent email-proof enrollment, existing-user restrictions and hard production route gates | Unchanged. Prepared configuration is not email proof and cannot enroll/redeem a customer |
| CC-008 / 0014 | safe publication snapshots; explicit approval, source digest, source invalidation, per-record revisions and append-only publication audit | Read only current approved overview existence for readiness; no automatic publication; source-first locks before mapping administration |
| CC-009 | owner session; persisted workspaces.primary; owner-publishing service/transport/preview | Existing owner verifier, same dashboard links/palette, same persisted source parser; publishing code and service untouched |

## Server architecture

ClientAccessPage authenticates the owner. ClientAccess requests a strictly bounded DTO from /api/client-access. Runtime authenticates before constructing the private pool; getAuthConfiguration supplies trusted database/origin, never browser input. HTTP authenticates again, checks schemas, origin/Fetch Metadata/content type and stream bound, then invokes the domain service. Domain authenticates each read/mutation independently and derives the audit actor from the verified session. A readonly repeatable-read transaction consistently inspects one organization; only the safe organization selector is global. A 25-row page bounds each collection; the 26th row only indicates another page. Invitation project scopes are bounded to the existing maximum 100.

Only trusted construction can select disposable writes. The production runtime always selects false. Disposable selection requires NODE_ENV != production, CLIENT_ACCESS_DISPOSABLE=enabled, matching DATABASE_URL and TEST_DATABASE_URL, loopback PostgreSQL, and test/disposable database name. This does not authorize anyone to point the application at production or to read production records during verification.

Migration 0015 adds admin_revision to the five mutable authoritative access tables, never resets statuses, creates no identity/grant/invitation, and does not touch historical migration SQL. Revision triggers advance on all subsequent changes, including existing trusted lifecycle changes, to prevent stale admin writes. Preparation configurations are immutable and keyed for exact safe retries. Trigger-generated append-only administrative audit records only scope, status/revision, verified actor and server time. The existing provisioning audit additionally records original invitation events.

## Explicit operation support

| Operation | Production | Disposable contract |
| --- | --- | --- |
| Inspection/readiness | Owner-only readonly | Owner-only readonly |
| Tenant create/rename | Denied | Disabled creation; revision-checked rename |
| Project mapping create/archive | Denied | Existing source project only, unique disabled creation; confirmed CAS archival |
| Invitation preparation | Denied | Immutable configuration, exact retry key, active tenant and explicit active mappings |
| Invitation revoke | Denied | Confirmed CAS pending→revoked; original lifecycle guard and provisioning/admin audit |
| View-grant revoke | Denied | Confirmed CAS active/disabled→revoked; exact tenant/project/identity predicates |
| Membership suspend | Denied | Confirmed CAS active/disabled→suspended; exact tenant/identity predicates |
| Tenant/mapping activation, grant issuance, privilege change, reactivation, identity suspension/impersonation, issue/send/redeem | Denied | Unsupported by admin schema/service |

## Concurrency, audit and sessions

Source-changing mapping operations lock persisted source before tenant then mapping, compatible with existing publication source-first locking. Other mutations take tenant then target row, compatible with invitation issue/redeem/revoke. All scope validation, target update, revision advancement and audit occur in one transaction. Stale revisions and terminal states conflict; failed transactions roll back history as well as state. No retry can reactivate any lifecycle. Exact preparation retries preserve one record/event; conflicting keys fail.

Authorization checks every active lifecycle on each customer request. Membership suspension denies all projects in that organization; grant revocation denies only that identity/project; mapping archival denies the mapped project; invitation revocation blocks future redemption without changing established grants. Customer cookies can remain valid for other authorized scopes. Separate session invalidation is unnecessary for those scopes; an in-flight response already authorized cannot be recalled. Identity-wide session/credential administration remains outside the contract.

## Preparation versus issuance

Preparation stores recipient, sorted project scope and intended post-issuance lifetime. It generates no token/verifier, changes no CC-006 invitation and performs no delivery. The issued list contains only authoritative CC-006 rows. Expired is derived from pending status and database time; supersession/revocation/redemption remain original lifecycle events. Delivery cannot be inferred and is always unknown/unavailable here. Redemption indicates the existing verified lifecycle, never mere preparation. Readiness always reports customer production enrollment/access disabled and never launch-ready.
