# CC-006 Secure client invitation and provisioning foundation

## Value and boundaries
Owners prepare auditable, expiring invitations for explicit existing tenant/project mappings. An authenticated, email-verified customer can redeem once to obtain a member membership and view grants. Multiple independent organizations share no implicit access. Reuse 0009 identity/provider mapping, memberships and grants, 0010 isolated Better Auth, and existing per-request authorization. Project/ClientDelivery and document registries remain authoritative and unchanged.

No HTTP routes, Server Actions, registration, email, real customer fixtures, customer login activation, document access, publishing, approvals, production data/configuration or deployment. Adorned is never provisioned or contacted.

## Requirements
- 256-bit random opaque tokens; SHA-256 verifiers only in storage. Entropy makes unkeyed hashing appropriate without a new production secret. Return raw token once only to a trusted server caller; never persist/log it or include it in inspection/history.
- Normalized recipient, immutable tenant and explicit nonempty project set, server-issued actors/timestamps; bounded expiration, single-use, revoke and supersede with atomic audit.
- Owner session verification on every administrative invocation, strict inputs without actor/role/identity fields. No caller-supplied identity during redemption.
- Customer subject and session ID come from actual isolated Better Auth verification, with DB session/user revalidation and verified email ownership under lock. Never link by email alone.
- Atomic identity, membership and explicit view grants. Existing inactive records fail closed; retries never reactivate revoked access. Successful same-subject replay returns the existing result only while all authorization remains active; other replays fail.
- Concurrent issue/revoke/redeem serialize by tenant and invitation; absent identity creation serializes by provider subject. Lock lifecycle rows through commit.
- Current authorization joins on every request immediately deny inactive identity, tenant, project, membership or grant, even with a previously valid session.

## Bootstrap limitation
The production Better Auth user-create hook and public signup stay blocked. This milestone supports existing authenticated, verified customer_auth subjects only. It deliberately does not manufacture verified email, credentials or sessions. Creating the first customer account requires a separate reviewed private authentication/email-ownership bootstrap ceremony. Disposable tests seed fictional credentials and use actual Better Auth to exercise the supported path. No production enablement is required.

## Acceptance criteria
See acceptance.md and verification.md for evidence and limitations.
