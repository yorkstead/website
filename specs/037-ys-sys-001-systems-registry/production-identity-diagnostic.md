# YS-SYS-001 Production database identity diagnostic

**Status:** Implementation prepared for review only. No Production request, configuration change, merge, or deployment is authorized by this document.

## Purpose and boundaries

Provide a temporary, owner-authenticated way to compare the effective runtime `DATABASE_URL` target with one exact, privately supplied Neon endpoint hostname and database name. This unblocks identity verification without inspecting application records.

- Reuse the existing Better Auth `getOwnerSession()` owner boundary. Its ordinary session lookup may use the existing `DATABASE_URL`; this is the only database activity authorized for the diagnostic.
- After owner authentication, the handler reads `process.env.DATABASE_URL`, parses it in memory, and performs no other database access or SQL.
- Do not import the application database, Better Auth, Neon, `pg`, or any record service into the comparison helper or diagnostic handler. Better Auth is only reached through `getOwnerSession()`.
- The expected target is provided in a bounded private POST body from metadata the owner has independently verified in Neon. The diagnostic does not call Neon or determine the correctness of that metadata source.
- Return only `result` (`MATCH`, `MISMATCH`, or `UNVERIFIED`) and a UTC capture timestamp. Never return or log either target, a connection string, or credentials.
- Fail closed for authentication errors, missing/malformed configuration, malformed or ambiguous expected metadata, unsupported body format, or query parameters.
- This check proves hostname/database equality with the submitted expected pair. It does not verify network connectivity, credentials, permissions, schema, migration state, deployment environment labels, Neon project membership, or data state.

## Request contract

`POST /api/dashboard/leads/diagnostic/identity`, authenticated by the existing owner session, with `Content-Type: application/json` and a body containing exactly one hostname and one database name. The request is limited to 1 KiB. The strict canonical form is `{"database":"<private database name>","hostname":"<private Neon endpoint hostname>"}`. Query strings, extra fields, arrays, duplicate keys, invalid DNS names, and invalid database names return `UNVERIFIED`.

Every handled response uses `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex`. Authentication failure returns HTTP 401 and `UNVERIFIED`; malformed requests return HTTP 400 and `UNVERIFIED`; authentication service failure returns HTTP 503 and `UNVERIFIED`. No outcome contains diagnostic details beyond the result and capture time.

## Implementation and verification plan

1. Add a pure URL parser/comparator with no database or provider imports.
2. Add an owner-authenticated POST Route Handler alongside, not inside, the lead-count diagnostic. Do not change the existing GET behavior.
3. Authenticate before reading the request body or runtime database configuration. Bound and strictly validate the body, then compare the parsed hostname and database name.
4. Test synthetic matching, mismatching, missing/malformed values, ambiguous metadata, oversized requests, authentication failure, no-store responses, secret non-disclosure, and zero application-data query calls.
5. Run focused tests, repository checks, and exact-head CI. Review imports and the full diff for query-capable clients, environment output, response leakage, and unrelated changes.

## Private owner verification instructions (after a separately authorized release)

1. In a private owner session, independently confirm the intended Neon project, production branch, endpoint, and database. Copy only that endpoint's hostname and database name into the local request body; do not send them in an issue, PR, chat, query string, screenshot, or log.
2. Confirm the Production deployment SHA is the authorized build containing this handler and sign in to Yorkstead through the normal owner login.
3. From the authenticated Production origin, issue the POST request from the browser console with `credentials: "same-origin"`, `Content-Type: application/json`, and the two values as the body. Do not save the request body or share the Network panel.
4. Read only `result` and `capturedAtUtc`. Record the redacted result and timestamp in issue #86. If the result is `MISMATCH` or `UNVERIFIED`, stop; do not inspect application records or run migrations.

Example request shape (replace placeholders locally and keep the command private):

```js
const response = await fetch("/api/dashboard/leads/diagnostic/identity", {
  method: "POST",
  credentials: "same-origin",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ database: "<private database>", hostname: "<private Neon endpoint hostname>" }),
});
await response.json();
```

## Removal procedure

After identity verification, remove the identity Route Handler, its pure comparison helper and tests, and this temporary diagnostic procedure in a focused cleanup PR. Review and approve that PR and its automatic Production deployment separately. No database, environment, authentication, or Neon configuration cleanup is needed. Until removal is separately released, keep use limited to owner-authenticated identity checks.

## Security review notes

- Trust boundary: the owner session and the expected target metadata supplied from Neon. Owner authentication is checked before body/config inspection.
- Information flow: `DATABASE_URL` and submitted expected metadata remain server-side; responses contain only the enumerated result and UTC time; the handler emits no logs.
- Database boundary: authentication is the sole authorized DB-backed operation. The diagnostic helper and route body contain no database client, data service, or SQL path.
- Availability boundary: request body is capped at 1 KiB and the route is force-dynamic and non-cacheable.
- Residual risk: an owner can submit an incorrect expected target; the service compares inputs and cannot independently attest the Neon metadata or production deployment mapping. A successful result is not proof of schema/migration readiness.

## Local verification status

- Focused identity tests: 12 passed, 0 failed, 50 assertions.
- Scaffold check and migration check: passed; current repository migration plan validates 0001–0024.
- Lint: passed with one existing warning in `components/login-panel.tsx`; typecheck: passed.
- Full unit suite: 470 passed, 121 PostgreSQL-dependent tests skipped, 0 failed. Skipped database tests are not counted as integration verification.
- Production build: passed and includes the new dynamic route.
- Full local Playwright run: 26 passed, 9 failed because no disposable PostgreSQL service is available for existing owner-session authenticated flows. Exact-head GitHub Actions with disposable PostgreSQL remains required.
- No Production database, configuration, migration, backup, or Registry flag was accessed or changed. No merge, PR, or deployment has occurred.
