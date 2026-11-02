# YS-SYS-001 temporary production identity diagnostic

## Mechanism decision

Reuse the existing owner-only `GET /api/dashboard/leads/diagnostic` handler. Repository search found no page/client caller. It already uses `getOwnerSession`, runs server-side, connects through the deployed `DATABASE_URL`, and is dynamic. A special query mode avoids adding a route, UI, Vercel function, Neon credential or production connection. Its normal legacy mode stays unchanged.

The special mode is `?mode=ys-sys-001-preflight` and is available only when the authenticated session belongs to the Yorkstead owner, `VERCEL_ENV=production`, `YS_SYS_001_PREFLIGHT_ENABLED=true`, and `YS_SYS_001_PREFLIGHT_WAF_CONFIRMED=true`. Both flags are absent by default. The WAF confirmation flag is a second operator-set gate; set it only after verifying the shared Vercel rate rule is active. The route returns private `no-store` headers. All SQL is fixed `SELECT`; it does not use a transaction, advisory lock, write, migration, or environment/connection-string response.

## Safe response contract

- Identity: `current_database()`, current schema, numeric PostgreSQL server version, and a server-derived Neon endpoint ID (the `ep-` identifier only, without the hostname). The endpoint ID is resolved through authorized Neon endpoint metadata to the exact `project_id` and `branch_id`; it is not a credential.
- Migration ledger: applied count, version list, missing/unexpected versions, per-version repository checksum-match booleans, and explicit `0020`/`0022` results. Raw checksums, names, and timestamps are not returned.
- Directory preservation: total entry/audit counts, orphan-audit count, stable entry UUIDs, revision, archived boolean, per-entry audit count, and deterministic row/audit fingerprints. Raw entry/audit JSON, account labels, costs, URLs, notes, actors, usernames, and hostnames are not returned.
- Schema: table presence, enabled audit append/immutability/revision trigger booleans, and primary-key/check/entry-FK counts. These are observed metadata, not a claim that the project/branch is production until endpoint identity is cross-checked.
- Error responses are generic and contain no database/provider error string.

Fingerprints use PostgreSQL MD5 of canonical `jsonb` text in stable key order (audit events ordered by audit ID). They are comparison fingerprints, not authentication or tamper-proof signatures. Treat the owner-only result as sensitive operational evidence and do not paste the response into a public issue or PR.

## Rate-limit gate

The handler includes a one-request-per-minute per-process gate. Production serverless instances do not share that in-memory state, so it is not the global control. Before setting the feature flag, a project operator must publish a Vercel Firewall rule for `/api/dashboard/leads/diagnostic` at one request per minute per source IP. That path-level rule also applies to the legacy diagnostic mode. Keep the feature flag off until the platform rule is verified. Vercel documents the rule configuration and usage pricing; no pricing prompt or charge is approved by this PR.

## Separately authorized production verification steps

1. Approve merge and the resulting production deployment separately. Confirm Vercel reports `READY` on the expected `main` SHA.
2. In Vercel Firewall, add and publish the path rate-limit rule above. If a pricing prompt appears, stop and obtain separate purchase approval.
3. Set `YS_SYS_001_PREFLIGHT_ENABLED=true` and `YS_SYS_001_PREFLIGHT_WAF_CONFIRMED=true` for Production only; do not set either for Preview or Development. The WAF confirmation flag may be set only after step 2 is verified. Complete the separately approved deployment so the production function sees both flags.
4. The signed-in owner invokes this same-origin URL once from the authenticated production browser session: `GET /api/dashboard/leads/diagnostic?mode=ys-sys-001-preflight`. Do not export cookies or run it from an unauthenticated CLI. Confirm response status 200 and `Cache-Control: private, no-store`.
5. Match `identity.endpointId` against the Neon Console/API endpoint inventory. The matched endpoint record provides the exact project and branch identity. Confirm its database name against `identity.databaseName`; do not use the recovery variable as identity evidence.
6. Save a redacted evidence report through the approved private evidence channel. Keep the response itself out of logs, public GitHub, and source control. Review stable IDs, archive/revision values, migration checksum flags, audit counts/fingerprints, triggers, constraints and any unexpected records before PR 1 design approval.

Neon describes the endpoint ID as the compute identifier in the connection host and provides project-scoped endpoint inventory through its [List project endpoints API](https://neon.com/docs/reference/api/endpoints/list-project-endpoints). Vercel's [WAF rate-limit documentation](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) describes the separate production rule action; this PR does not apply it.

## Disable and remove

1. After evidence capture, set/remove both preflight flags in Production and separately deploy that change.
2. Verify the special query mode returns 404 while the existing owner diagnostic still functions.
3. Open a cleanup PR removing the query-mode branch, helper, and preflight-only tests. Deploy the cleanup only after its separate approval.
4. Remove the temporary WAF rule after the code path is gone. Retain only the approved redacted evidence record.
