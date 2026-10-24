# Threat model
- Invitation theft: possession only initiates delivery to the stored recipient; an independent random email proof is required. No typed recipient overrides.
- Account takeover: existing credential hashes never overwritten; unverified preexisting accounts fail closed and require separately reviewed recovery. Existing verified users must sign in with their password.
- Forged verification/replay: SHA-256 verifiers of high-entropy secrets, ten-minute expiry, invitation binding, row locks, atomic consumption. No boolean verification input or production test adapter.
- CSRF/session fixation: same configured origin required for JSON mutations; provider creates fresh isolated sessions. No arbitrary callback URLs; sign-out uses actual provider revocation.
- Leakage: invitation/proof fields only in POST bodies and transient form memory; no URL query, persistent storage, analytics, audit payload or exception echo. Pages/API use no-referrer and no-store.
- Abuse: database-shared limits for operation and recipient/invitation keys; no trust in arbitrary forwarded IP headers. Global operation limit intentionally trades availability for safe bounded load.
- Cross-tenant access: reuse full active identity/tenant/membership/project/grant join each request; synthetic data only, no unscoped real-data query.
- Partial failure: account/proof/identity transaction atomic; subsequent authentication/redemption can be retried with existing password. No access exists before CC-006 completes. Delivery failure invalidates the challenge and never reports proof success.
- Concurrency: tenant then invitation locks match CC-006; recipient advisory lock prevents duplicate first accounts across invitations. Single proof consumer wins. Revocation after proof is still enforced at redemption.

## Review findings and mitigations
- React streaming can turn a late `notFound()` into HTTP 200. A narrowly matched Next proxy now denies disabled customer pages and endpoints before rendering; server components/handlers retain independent checks. Owner/public paths are outside the matcher.
- Bound JSON bodies to 4096 bytes while streaming before parsing; reject cross-site, missing/wrong origin and non-JSON mutation requests before database work.
- Database connection setup has a ten-second timeout and enrollment runtime queries a fifteen-second timeout; preserve TLS verification through the existing URL helper.
- Distributed rate limiting intentionally includes operation-wide limits to avoid trusting arbitrary client IP headers. Production activation requires reviewing expected traffic/capacity and retention cleanup for expired challenge and rate-limit rows. This is an availability/release concern; no current production exposure exists.
- Account creation uses a narrowly scoped transactional repository write with Better Auth's configured password hasher after independent email proof. It does not enable Better Auth signup or relax either provider hook. An identity without membership/grants is not portal authority. Tests prove intermediate state has no project grant and can resume through actual sign-in/redemption.
