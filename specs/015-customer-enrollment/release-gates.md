# Release gates
Production is hard-disabled in code. No environment variable can enable this milestone in production. Existing customer capability flags and raw Better Auth route remain false. Only explicit loopback disposable development/test configuration may exercise the new adapter.

Before any separate approved activation: security review of this implementation and delivery adapter, verified sender/domain and email delivery infrastructure, abuse capacity/monitoring, production secret readiness, reviewed migration application through normal runner, a scoped real-data adapter (currently synthetic only), account-recovery policy, CI evidence, and explicit release configuration approval. No real invitation or Adorned activation is authorized.

Rollback: disable isolated test opt-in immediately; production already fails closed. Revert application changes if needed; retain additive challenge records until retention cleanup and audit review. Never restore revoked grants or destructively roll back prior migrations.

## Isolated reproduction
Use only a disposable PostgreSQL database on loopback whose name contains a `test` or `disposable` underscore-delimited segment. Set `DATABASE_URL` and `TEST_DATABASE_URL` to the identical URL, `NODE_ENV=development`, and `CUSTOMER_ENROLLMENT_DISPOSABLE=enabled`. Connection query/fragment overrides are rejected. Run `bunx playwright test -c playwright.cc007.config.ts` after migrations. The dedicated loopback fixture server installs the synthetic mailbox adapter only in the browser test process; application runtime always uses unavailable delivery. No test mailbox endpoint is shipped in Next routes. The underlying `/api/customer-auth` remains closed even in the isolated test mode; only the narrow enrollment controller's operations are exposed.

The new CI step enables this configuration only for the isolated browser step against the workflow's disposable PostgreSQL service. It changes no production configuration or secrets. Production builds unconditionally deny this gate.
