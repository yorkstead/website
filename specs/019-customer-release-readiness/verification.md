# CC-011 verification

Fresh fetch verified base `4bba15a7a24864bef058e318df45f607b21f280e` (PR #61 merge, 0015) before creating `feat/cc-011-customer-release-readiness`. Historical migration bytes unchanged; additive 0016 only. No production data/configuration/secrets/provider operation, customer activation, sending, publication, manual migration/deploy or merge.

## Completed local evidence

- Bun 1.3.14, disposable PostgreSQL 16 on loopback port 5436. Fresh dedicated cc011_full_test for full tests; separate cc011_test for fictional browsers.
- All 16 migrations validate; fresh/repeat runs pass. Manifest matches every canonical checksum. Prepared-query historic/0016 upgrade preserves prior access/publication/invitation/admin rows and history.
- Full suite: **402 pass, zero failures/skips**, 4,360 assertions, 95 files. New targeted suite: **20/20**, 150 assertions. Covers missing/future/expired/changed evidence, commit/schema/configuration changes, no manual technical bypass, strict owner/HTTP boundaries, unsupported activation, concurrency/CAS, immutable history, readonly production and safe disposable URLs.
- New actual-owner Portal Readiness browsers: **2/2**, 390px/1440px. Navigation/palette, verification, labeled attestation, acknowledgment without bypass, withdrawal, conflicts/refresh, error state, Tab/Escape/focus, privacy headers and no overflow.
- Existing standard browsers: **30/30**, one worker, 90-second local timeout, no retries.
- Scaffold (19 specs), critical dependency audit, lint and typecheck pass; one existing login-panel navigation warning.
- Final isolated browser regressions: enrollment **2/2**, owner publishing **2/2**, Client Access **2/2**, Portal Readiness **2/2**. Together with 30 standard scenarios: **38/38**, no retries. Final focused correction suite **20/20**, including unchanged-status live observation regressions.
- Standard production build passes without runtime secrets. Production-mode negative smoke: **18 customer GET/POST requests return 404**, **4 readonly owner API GET/POST requests fail closed** without owner configuration and retain no-store/no-referrer, **2 nonexistent activation endpoints return 404**. No production database/provider configured.
- Delivery: [unmerged PR #62](https://github.com/yorkstead/website/pull/62). The implementation CI and final evidence-commit CI are tracked in PR checks; final exact head, run URL and conclusion are recorded in the PR delivery summary after this evidence commit to avoid recursive documentation-only CI commits. No merge or manual deployment.

## Security review and boundaries

Owner sessions/actors, transaction/audit patterns and DialogBoundary are reused. Existing tenant/document audits require customer scope and cannot host global release reviews; 0016 supplies a narrow global registry using the same conventions, not another authorization/tenant model. No customer table is queried by readiness. Only allowlisted IDs/enums/digests/actors/times are evidence: no free text, URLs, raw environment, tokens or customer details. Context/digests are preconditions, never authority. Technical results come from trusted adapters and are rechecked against immutable evidence; owner attestations cannot populate technical slots. Evidence changes invalidate decisions; reads independently detect expiry/fact/context changes. Audit and transitions commit together.

Runtime observes code safeguards and disposable schema only. Build/configuration metadata identify a context but never prove production secret validity. Email sender/DNS/provider/proof/bounces, recovery/lost-mailbox verification, production secrets/TLS/cookies/cache/security/load, monitoring/alerts/backup/rollback and named operational ownership remain blocked/unverified. Complete approval is tested only through isolated synthetic trusted adapters; global approval never qualifies a customer and launchReady remains false.

Existing customer gates/auth/enrollment/delivery/owner services and migrations 0001–0015 remain unchanged. Retain 0016 and all evidence/audit on rollback; revert UI/transport first. See architecture.md and release-runbook.md for dependencies, stop conditions and separately authorized pilot work.

## PR review correction

The review identified live observation changes that left the displayed status unchanged, allowing an old acknowledgment/digest precondition to remain current. Assessment digests now bind a deterministic fixed-field hash of each current observation (status, fingerprint, source and justification), including missing/duplicate/blocked/unverified cases. Canonical ordinal ordering avoids order-sensitive hashes. No raw operational metadata is exposed. New model and database regressions prove unchanged blocked/unverified status still stales acknowledgments and rejects old mutation preconditions. Full correction suite: 402 tests, 4,360 assertions; focused 20/20, and actual-owner browser correction 2/2. Final correction lint/typecheck/build and exact-head CI are recorded in the PR delivery summary.
