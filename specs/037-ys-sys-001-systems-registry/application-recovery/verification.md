# Application-recovery rehearsal verification

## Local checks before exact-head CI

- `bun run yorkstead:check`: PASS (39 active specifications).
- `bun run db:migrate:check`: PASS (ordered repository plan contains migrations 0001–0024; this command validates only and applies none).
- `bun run typecheck`: PASS.
- `bun run lint`: PASS with one existing warning in `components/login-panel.tsx:62`.
- `bun test`: PASS, 495 passed / 121 skipped / 0 failed. PostgreSQL integration cases were skipped locally because no disposable PostgreSQL service was started in this worktree; the exact-head CI job is responsible for running the restored-database checks.
- Focused Playwright discovery: PASS (one recovery browser test found). `bash -n` and workflow YAML syntax: PASS.
- Local production build: BLOCKED because this environment cannot reach Google Fonts required by existing `next/font` imports. The dedicated CI job builds the production app image in its isolated job; the normal CI build also runs. This is an environment limitation, not a passing build result.
- Exact-head Docker-backed recovery job and Vercel Preview: PENDING.

| Requirement | Evidence | Status |
|---|---|---|
| Disposable PostgreSQL 18 source and restored target | Exact-head `application-recovery` Actions job | PENDING |
| Only migration ledger 0001–0022; canonical checksums | Pre/post sanitized DB verifier | PENDING |
| Migration 0023/0024 unapplied | Ledger and schema-column/table checks | PENDING |
| Directory integrity and triggers before/after | Pre/post sanitized DB verifier | PENDING |
| App runs against restored target | Production image startup through internal HTTPS proxy | PENDING |
| Synthetic Better Auth sign-up/sign-in and owner authorization | Recovery Playwright workflow | PENDING |
| Dashboard and empty legacy Directory read workflows | Recovery Playwright workflow | PENDING |
| Anonymous denial and tenant query injection denial | Recovery Playwright workflow | PENDING |
| Cross-tenant denial using actual synthetic sessions | Existing `tests/client-project-data-database.test.ts` against restored DB | PENDING |
| Runtime egress blocked independently | Docker `Internal=true`, exact container membership, and failed outbound TCP probe | PENDING |
| Email/payment/webhook/queue/analytics/provider effects disabled | Allowlisted app runtime environment plus isolated network | PENDING |
| Sanitized output only | JSON schema/field allowlist and Actions artifact inspection | PENDING |
| Complete Production-derived 60-minute RTO | Requires separately authorized end-to-end Production-derived recovery | NOT RUN; NOT CLAIMED |

Record current exact branch/commit and all job URLs. The Actions report must include UTC phase timestamps and synthetic elapsed seconds only, with no environment values or row-level content. A failed Docker probe or test is a failure; do not mark skipped tests as passed.
