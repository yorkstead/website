# CC-007 Secure customer enrollment and authentication

Base: verified PR #57 merge 40428915677364b023d747ca052e968dc7da1f39; branch feat/cc-007-customer-enrollment. The user explicitly authorizes this base despite unavailable remote fetch.

## Scope and architecture
An invitation token alone cannot create an account. A server validates the pending invitation and active tenant/project scope, then delivers a separate 256-bit email challenge to the invitation's stored recipient. Only its verifier is persisted. A ten-minute, single-use challenge binds the invitation and recipient; completion revalidates lifecycle under locks. Passwords use the isolated Better Auth password hasher and credential table. Verified state is established only by successful challenge proof. Existing accounts must already be verified and authenticate with their existing password; enrollment never changes existing credentials. An active identity may be created after proof solely to pass the unchanged Better Auth session gate; no membership/project grant is created until CC-006 redemption verifies the actual Better Auth session. Interrupted provisioning resumes through sign-in and explicit redemption, never by restoring revoked grants.

Underlying public Better Auth signup and user-create hooks stay blocked. Customer HTTP operations use a narrow allowlist rather than exposing the provider's entire API. Production activation is unconditionally disabled in this milestone; isolated development/testing requires explicit loopback disposable database configuration. Production delivery has no implementation and fails closed. A trusted delivery interface is exercised with fictional mailbox tests; no real mail is sent.

## Acceptance criteria
1. Pending eligible invitations only; active tenant and every explicit project rechecked at challenge issue and completion.
2. Cryptographic email proof binds exact stored recipient and invitation; expiration, replay, revocation, supersession, concurrency and partial failure deny safely.
3. Actual isolated Better Auth sign-in/session/sign-out; no owner auth changes, global signup bypass, password reset or unverified-account takeover.
4. Every protected project request uses server-verified session and the existing full authorization join; selectors are never authority. Shell exposes synthetic, explicitly labeled content only, no actual workspace/documents/payments/history.
5. Accessible responsive acceptance, verification, sign-in, sign-out, recovery-unavailable and generic invalid/expired/revoked states. No account/recipient enumeration.
6. Default-disabled pages/endpoints; same-origin JSON mutations, bounded input, distributed database rate limits, no-store/no-referrer, no analytics or persistent browser token storage, no arbitrary redirect.
7. Additive ordered prepared-query-compatible migration; historical checksums unchanged; disposable fresh/repeat/upgrade and concurrency tests.
8. Full repository verification recorded honestly, including unavailable network/CI/PR operations.

## Non-goals
Real customers or Adorned, production configuration/secrets/data/migrations, live delivery, recovery delivery, live-data adapter, documents/downloads/approvals, merge or deploy.

## PR #58 review corrections
The customer shell must call a dedicated parameterized authorization-list function, without rewriting another SQL query. Listing and selected-project checks require active identity, tenant, membership, tenant project and explicit identity/project grant, with tenant-consistent joins. An explicit unauthorized selector must deny rather than fall back to an authorized project. Regression coverage must exercise one identity across multiple tenants, removed grants, suspended memberships and unauthorized project selection against disposable PostgreSQL. Document the existing rate-limit capacity and operational tradeoffs without changing limits or activation gates.
