# Verification and security review

Base: `196ea52ea6691088bccaafd6fb898620a9736e33`, latest main including merged PR #56. Exact commit and tree verified; subsequent normal Git fetch also confirmed origin/main. Bun 1.3.14 and locked dependencies unchanged.

## Current evidence
- Scaffold and ordered migration validation pass (12 migrations).
- Critical dependency audit passes with network-enabled execution.
- Fresh and repeated migrations pass on a disposable PostgreSQL 18.4 instance installed under scratch, without production credentials. CI supplies PostgreSQL 16.
- All 13 new actual PostgreSQL/Better Auth integration tests pass: verified email/password, blocked signup and unprovisioned sign-in, cookie isolation, expired/revoked actual sessions, wrong recipient, expiry/revoke/supersede, independent tenants, explicit scope, repeated/concurrent redemption, revoke/redemption race, failed-write rollback, inactive authorization, session reuse after revocation, immutable registry/scope/audit, and prepared-protocol upgrade preserving populated existing tables.
- Full unit and PostgreSQL integration suite: 324 pass, zero failures/skips (82 files), including five token/owner boundary tests. All 27 Playwright tests pass across the full run (25 pass) and a targeted single-worker retry (two prior 30-second public-site timeouts pass with a 60-second budget). All seven affected owner/customer boundary tests passed on the first complete browser run. The standard production build passes from a clean generated directory (77 static pages).
- Typecheck passes. Lint has zero errors and the pre-existing login-panel navigation warning.

## Environment limitations and scope
The execution sandbox initially blocked sockets/network; explicit per-command network grants enabled Git, npm audit and disposable PostgreSQL. Initial default build attempts encountered a CSS-worker port-binding EPERM; a clean generated directory plus network-enabled execution resolved it and the standard Turbopack production build passes. A diagnostic webpack fallback encountered an existing `node:crypto` client import through `lib/consultations.ts` / `components/consultation-workspace.tsx`; webpack is not the repository build matrix and no unrelated bundler/application changes were made. Browser runtime and PostgreSQL binaries/data are installed only under scratch. No dependencies or production configuration changed.

GitHub CI retains PostgreSQL 16, the default browser timeout/retry settings, production build and generated-worktree checks. Final branch results are tracked at https://github.com/yorkstead/website/pull/57/checks; local evidence is not presented as a CI result. Local generated files match the tracked tree after the final build; `git diff --check` passes.

The isolated cookie test uses actual Better Auth with the production customer options and a second owner-shaped instance with the owner cookie prefix, base path and independent secret. It does not connect to or reconfigure the live owner auth service or production owner database. Existing owner allowlist/bootstrap behavior remains covered by its repository tests. Test-only fictional credential fixtures establish email verification directly in the disposable database; this is not evidence that production email delivery or first-account bootstrap works.

## Findings / launch blockers
- No known unresolved vulnerability in the implemented dormant service boundary. Trusted DB administrators can bypass triggers and transaction actor settings, as with the existing document foundation; this is not DBA-resistant audit evidence.
- First-account bootstrap remains blocked: user creation is still denied globally and no bypass, credentials, verification email or sessions are manufactured by this service. A separate reviewed private authentication/email-ownership ceremony is required before onboarding real customers.
- No delivery, public redemption/registration, customer login, document reads/approvals/downloads, publishing or external project access is enabled. Future HTTP adapters need CSRF/origin checks, rate limits, token-safe transport and log redaction; they must not serialize the one-time issuance token to the owner preview.
- Inspection/revocation may operate on inactive tenants so owners can investigate/revoke safely; issuance and redemption require active tenants/projects. Consumed-token retries require the same authenticated subject and current active grants; they never add or restore grants, and do not create additional audit events. Invitation expiry is effective at redemption and derived as `expired` during inspection; no expiration background job is required.
- No production/deployed state was inspected or changed. Disabled behavior is verified in source and local/CI routes; no claim of a live production smoke test.
