# Plan

1. Audit 0009–0011 and auth/document/owner boundaries; specify before coding.
2. Add 0012 invitation registry, immutable scoped project rows and trigger-generated append-only audit. Do not modify historical migration checksums.
3. Add a server domain service (no `use server`, route or UI) with default owner/customer session verifiers, strict runtime validation and trusted dependency injection for disposable tests. Transactions use the existing PostgreSQL pool interface. SHA-256 token lookups have fixed-size inputs and indexed equality; generic denial avoids detailed enumeration errors.
4. Serialize tenant operations before locking invitation rows; lock authoritative customer session, user, identity and authorization rows. Retry does not overwrite inactive membership/grant records. No broad role escalation or duplicate sources of truth.
5. Disposable PostgreSQL tests use actual Better Auth password/session/cookie implementation; security unit tests run without a database. Extend disabled-route Playwright coverage.
6. Run repository checks, record evidence, synchronize handoff, publish an unmerged PR via GitHub connector if shell transport remains unavailable.

Rollback: revert service/tests/docs; retain additive migration/history. Never drop production audit data. Database administrators and server verifier dependencies remain trusted. Future HTTP adapters must add CSRF, throttling and token-safe transport/log redaction before activation.
