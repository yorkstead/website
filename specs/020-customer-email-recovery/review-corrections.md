# PR #63 review corrections

Reviewed head: `691487aeaec7c24a2da6237849f09f3f976114d7`, verified against the PR API and fetched GitHub branch. Existing feature branch retained; no replacement PR, historical migration edits or production activation.

Owner: platform/security operator.

## Findings and fixes

- P2, recovery admission rollback (`PRRT_kwDOUJPn1c6v7rWz`): account and network increments plus `recovery_requested` now commit atomically in an admission transaction. Only admitted requests start a second transaction for eligibility, challenge revocation/creation, ciphertext custody and queue intent. Downstream failure rolls back that second transaction while preserving admission. Failure to commit admission returns the same generic response and never starts delivery. Both budgets are charged and each request audited even when another budget is exhausted. No token/secret is created in the admission transaction.
- P2, incomplete audit pagination (`PRRT_kwDOUJPn1c6v7rW1` and duplicate `PRRT_kwDOUJPn1c6v7sCV`): retain shared page navigation, fetch 26 jobs and 51 audit records, return at most 25/50, and expose Next while either history has another row. Numeric audit ordering, bounded selection, owner verification and private/no-store/no-referrer headers remain unchanged.

## Regression coverage

- Real disposable PostgreSQL: suppressed recipients, queue enqueue failure, key custody failure and challenge insertion failure, eight repeated failed requests, admission counts/audit after every attempt, five-attempt account exhaustion and twenty-attempt shared source exhaustion across accounts. No challenges or jobs survive failed delivery transactions.
- Admission audit failure: both increments roll back and no downstream work occurs; generic response matches unknown-account behavior.
- Seven concurrent failed enqueue attempts: all seven account/source charges and audit records persist, while at most five requests enter delivery.
- Isolated PostgreSQL history schemas: 0 jobs/51 audit, 0/101, 1/151 (many events for one job), 52/1, 26/101 and exact 25/50 boundaries. Enumerate all pages, verify no missing/duplicate IDs, DTO page limits and private HTTP headers.
- Actual owner browsers at 390px/1440px: extend retained fictional audit history beyond all job pages; traverse every Next page, compare UI job/event counts with real API responses, check distinct IDs reach total history counts, verify final disabled Next and Previous/Next round trip, and check no-store/private/no-referrer on actual responses.

## Verification and delivery

- Focused CC-012 suite: **38 passed**, no skips/failures, **471 assertions** (four test files).
- Complete `bun test`: **447 passed**, no skips/failures, **4,866 assertions**, 99 files.
- `bun run yorkstead:check`, `bun run db:migrate:check`, lint and typecheck pass. One pre-existing login-panel lint warning remains; no new warnings.
- All **17 migrations** apply fresh and repeat successfully in disposable PostgreSQL **16**. Prepared historical upgrade and retained readiness/history tests pass within the full suite. No migration source changes are required or made.
- Existing isolated CC-007/009/010/011 browsers **8/8 pass**; expanded CC-012 history workflow **2/2 passes** at mobile/desktop widths. Standard suite against the local production build: **30/30 pass in one run**, no retries, unchanged timeouts/assertions (`bun run test:e2e --workers=1`). Total **40/40** browser scenarios pass.
- Unchanged `bun run build` passes in managed Docker with inherited proxy/CA trust, as used for the baseline head. Local production-mode negative/private-header smoke: **29 requests, zero failures**, with fictional configuration and no email credentials.
- Worktree/migration diff checks pass. Exact final commit, GitHub Actions and Vercel results, and resolution of the three reviewed threads are recorded on the existing PR #63 after verification. This binds external checks to the commit without self-referential evidence-only commits.

Production delivery/recovery/enrollment/customer access and webhook ingestion remain disabled. No live mail, real provisioning, production secrets/configuration/migration, manual deployment or merge is authorized.
