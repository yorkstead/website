# Implementation plan

1. Audit existing authentication, invitation/proof, access and readiness; specify boundaries.
2. Add 0017 immutable delivery queue, custody, recovery, suppression, event and audit persistence; retain old migration bytes.
3. Implement safe templates, keyring custody, fake and gated Resend, transactional integrations, fenced dispatcher and compatible recovery rehearsal.
4. Verify documented SDK signatures and implement disabled customer-only webhook ingestion; retain contact webhook behavior.
5. Add read-only owner communications and blocked production readiness facts; preserve evidence invalidation/history.
6. Exercise disposable PostgreSQL 16, negative/security/concurrency and actual owner browsers; full regressions, production negatives and CI. Record results and limits, update handoff, open unmerged PR.

## PR #63 automated review corrections

Commit request account/network budgets and `recovery_requested` audit together before the separate challenge/custody/enqueue transaction. Failure to record admission denies delivery; downstream rollback never refunds budgets or removes request history. Keep generic responses for unknown, suppressed, throttled and failing dependencies, and keep challenge/intent/custody atomic. Verify repeated suppressed/enqueue/custody failures, account and shared network exhaustion, and retained audit using disposable PostgreSQL.

Keep the shared page control, using one lookahead row from both jobs (26/25) and audit (51/50), trimming both DTO collections. Next stays available while either collection has another page. Verify audit-only histories, many events for one job, mixed job/audit lengths, no duplicates/missing rows, actual browser Next/Previous navigation and private/no-store/no-referrer HTTP headers. Historical migration bytes and production gates remain unchanged. Review threads are resolved only after verified corrections; exact-head CI/Vercel evidence remains on PR #63.
