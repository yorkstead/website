# Application-recovery rehearsal verification

## Local checks

- `bun run yorkstead:check`: PASS (39 active specifications).
- `bun run db:migrate:check`: PASS (validates all 24 ordered repository migrations; applies none).
- `bun run typecheck`: PASS.
- `bun run lint`: PASS with one pre-existing warning in `components/login-panel.tsx:62`.
- `bun test`: PASS, 495 passed / 121 PostgreSQL-backed tests skipped / 0 failed. Skipped local PostgreSQL checks are not treated as passing; the dedicated CI jobs below execute disposable database coverage.
- Recovery Playwright discovery: PASS (one test). Shell syntax and `git diff --check`: PASS.
- Local production build: BLOCKED because the environment cannot reach existing Google Fonts. The exact-head CI production application build passed.

## Exact-head CI evidence

- PR #111 implementation head: `290e058a818456d02156aa113ed8c358066e39a5`.
- GitHub Actions [run #42353868907](https://github.com/yorkstead/website/actions/runs/42353868907) (run 673): all four jobs PASS, including the isolated PostgreSQL 18 restore/recovery, application verification, read-only role verification, and restored-app readiness.
- Vercel Preview for that head: Ready.
- Sanitized artifact: aggregate readiness report only; no records, credentials, hostnames, or logs. Its reported total synthetic rehearsal duration was 147 seconds.

| Requirement | Evidence | Status |
|---|---|---|
| Disposable PostgreSQL 18 source and restored target | Dedicated exact-head CI job | PASS |
| Migration ledger through 0022 with canonical checksums | Read-only before/after verifier | PASS |
| Migrations 0023/0024 absent | Ledger and schema-object checks | PASS |
| Directory integrity and protection triggers | Before/after summaries match | PASS |
| Production application starts against restored target | Isolated runtime HTTPS proxy, standard port 443 | PASS |
| Synthetic Better Auth sign-up/sign-in and owner authorization | Recovery Playwright test | PASS |
| Dashboard and empty legacy Directory reads | Recovery Playwright test | PASS |
| Anonymous denial and tenant selector rejection | Recovery Playwright test | PASS |
| Actual-session cross-tenant denial | Existing database integration suite against restored target | PASS |
| Runtime egress block | Docker internal network, exact membership, app-container TCP probe | PASS |
| External side effects disabled | No integration credentials or workers; isolated network | PASS |
| Full Production-derived 60-minute RTO | Requires separate authorized end-to-end recovery exercise | NOT RUN / NOT DEMONSTRATED |

The source schema-preparation failure occurred once before safe phase diagnostics existed. It did not recur on later runs; its original cause remains unconfirmed. Other CI corrections normalized Docker's extra blank line in membership output while preserving exact membership, and changed the synthetic HTTPS proxy to standard port 443 because the production authentication configuration correctly rejects custom ports. The proxy has only the `NET_BIND_SERVICE` capability; production auth behavior was not relaxed.

## Interpretation

The 147-second measurement covers the synthetic CI rehearsal only. It is not a Production-derived RTO result and does not establish readiness of the owner-reported restored Production-derived database. No Production or R2 access, Production migration, or Registry activation occurred.
