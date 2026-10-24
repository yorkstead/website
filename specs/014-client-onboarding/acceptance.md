# Acceptance matrix

| Criterion | Required evidence |
| --- | --- |
| Secure tokens and strict owner boundary | Unit tests for entropy/format, no raw persistence, forged fields and denied owner |
| Immutable tenant/project scope and audit | PostgreSQL constraints, transition guards, audit tampering tests |
| Atomic single-use redemption and retries | Concurrent redemption; one identity/membership/grant/audit; same-subject retry; other-subject denial |
| Authenticated verified recipient | Actual Better Auth password sign-in, unverified/incorrect recipient denial, cookie isolation, expired/revoked sessions |
| Authorization revocation | Established session reused after identity/tenant/membership/project/grant changes and grant removal |
| Safe migration | Fresh/repeat, prepared protocol, 0012 upgrade preservation tests |
| Disabled external surface | Immutable capabilities, existing route tests and Playwright 404 coverage |
| Reviewable delivery | Full checks, explicit limitations, synchronized handoff, unmerged PR |

First-account authentication bootstrap is intentionally deferred: no user-create bypass or invented proof of email ownership.
