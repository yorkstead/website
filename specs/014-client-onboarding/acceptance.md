# Acceptance matrix

| Criterion | Evidence |
| --- | --- |
| Secure tokens and strict owner boundary | `tests/client-onboarding.test.ts`: entropy/format, strict forged-field rejection and denied owners; database inspection excludes raw tokens/verifiers |
| Immutable tenant/project scope and audit | `tests/client-onboarding-database.test.ts`: immutable scope, composite tenant integrity, terminal transitions and audit tampering |
| Atomic single-use redemption and retries | Database tests: concurrent redemption, one identity/membership/grant/audit, cross-subject denial, revoke race and injected mid-write rollback |
| Authenticated verified recipient | Database tests using `createCustomerAuthOptions` and actual Better Auth: password, verified recipient, cookies and expired/revoked sessions |
| Authorization revocation | Database test reuses actual established session after every inactive lifecycle transition and removed grant; retries never restore grants |
| Safe migration | Disposable fresh/repeat runner; existing prepared-protocol suite includes 0012; populated 0012 upgrade preservation test |
| Disabled external surface | Unit frozen-capability assertions and seven passing affected Playwright tests including added registration/redemption 404 checks |
| Reviewable delivery | `verification.md` records checks/limitations; synchronized handoff and local commit. Unmerged PR: https://github.com/yorkstead/website/pull/57; CI is tracked on its checks tab. |

First-account authentication bootstrap is intentionally deferred: no user-create bypass or invented proof of email ownership.
