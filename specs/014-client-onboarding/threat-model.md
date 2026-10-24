# Threat model

| Boundary / threat | Control |
| --- | --- |
| Forged owner/customer identifiers or role | Existing owner verifier; Better Auth customer session; actor/subject never input fields; fixed member/view provisioning |
| Token guessing / database disclosure | 32 random bytes, canonical base64url, SHA-256 verifier only; no raw tokens in audit/history; indexed fixed-size verifier lookup |
| Replay / concurrent redemption / lost response | Tenant/invitation locks, subject serialization, atomic writes and terminal transition; same subject retry only with current active access |
| Cross-tenant/project access | Composite foreign keys, immutable scope, validation against existing active mapping and authoritative membership/grant joins |
| Email impersonation | Recheck database emailVerified and normalized recipient against actual authenticated subject; never select identity by email |
| Expired/revoked session / stale cookie | Better Auth verification plus database session expiry/existence lock; no cookie-cache authentication shortcut |
| Disabled identity/tenant/membership/project/grant | Locked status checks; never upsert inactive state back to active; request authorization rechecks joins |
| Audit tampering / actor forgery | Server-attributed transaction actor, trigger-generated events, update/delete/truncate guards; DB admin is trusted |
| CSRF / credential stuffing / sensitive logs | No HTTP/Server Action adapter or delivery; existing auth unchanged. Future adapter requires origin/CSRF/rate limits and token redaction. Service errors do not embed input or token values |
| Privilege escalation via dependency injection | Service construction is trusted server code, never request configuration; no exported public route |

Residual: email is personal data in owner inspection; limit to owner access. DB admin can bypass triggers. Historical hashes must be retained for replay detection. No claim of production auth/bootstrap readiness. No live deployment or secrets inspected.
