# Verification evidence

The original-head results below are retained as historical evidence. PR #63 review corrections and current local results (447 tests, 40 browser scenarios, admission-failure and complete-history regressions) are recorded in [review-corrections.md](review-corrections.md); exact final-head CI/check evidence is maintained on the same PR.

Base verified 2026-10-24: authoritative GitHub main `b8e317b408ea8fd1c818d9d43fa15c33e1e49ff8`. First normal Git request failed connecting to configured proxy:8080. Required single retry through runtime escalation succeeded, as did fetch. Branch `feat/cc-012-customer-email-recovery` starts at that exact merge with a clean initial worktree.

## Local evidence

- 17 migrations validated; finalized 0017 applied fresh and repeated in local disposable PostgreSQL **16**. No historical migration bytes changed.
- Final full unit/database regression: **435 passed, zero failures/skips, 4,570 assertions, 98 files**. Focused migration suite **2/2** also passes: prepared 0016→0017 upgrade preserves review/evidence/audit and existing authorization/history; numeric evidence renewal across 99→100 selects the newest observation.
- New actual owner Customer Communications browsers: **2/2** at 390px and 1440px; navigation, command palette, owner authentication, metadata privacy, read-only operation, blocked provider/recovery and disabled webhook.
- Scaffold and migration checks pass. Typecheck passes. Lint passes with the existing `components/login-panel.tsx` navigation warning.
- New security coverage includes ciphertext binding/tampering/key retirement/expiry, no plaintext queue/audit/owner records, atomic issuance and independent-proof rollback, revoked/superseded/expired/disabled dispatch, concurrent claim and stale fencing, uncertain-acceptance idempotency, timeout abort, retry exhaustion/permanent failure, tenant crossing, generic unsupported/unknown accounts, shared account/source budgets, actual Better Auth password recovery and session invalidation, replay/concurrent consumption, disabled production dependencies, SDK signatures/body tampering/timestamp/rotation, duplicate/out-of-order events and complaint/bounce suppression.

## Findings and corrections during verification

- Initial schema assertions expected sixteen migrations and rejected now-supported 0017; assertions now require seventeen and still reject unsupported 0018. Historical 0016 manifest remains explicitly tested.
- Installed the missing pinned Playwright Chromium runtime; initial browser launch failure was environmental. Successful rerun is recorded above.
- Browser fixtures leave a fictional persisted workspace, while the historical lead-conversion test expects an empty workspace. Do not run those fixtures concurrently against one disposable database; clean the fictional workspace or use a fresh database before full database regression. No production code or existing validation was weakened.
- Repeated new recovery cases used a fixed test network source; shared durable rate limits correctly exhausted it. Fixtures now use unique per-case sources while preserving repeated-attempt assertions within each case.
- Repeated readiness verification exposed text-alias sorting of BIGSERIAL evidence IDs. Qualified numeric ordering now selects the newest immutable evidence across digit boundaries; focused isolated-schema regression covers 99→100. Readiness and communications audit ordering likewise uses the numeric source column. Same-status fingerprint/digest invalidation remains intact.

No live provider API/transmission, real invitation issuance/provisioning, production recovery/data mutation/configuration/secret change, manual migration/deployment or merge. All local browser, build and production-negative results are recorded below; exact-head CI is tracked on the unmerged PR. Production qualification is deliberately unresolved; see operations.md and threat-model.md.

## Browser and production checks

- Existing isolated CC-007, CC-009, CC-010 and CC-011 suites: **8/8 pass**, two widths per workflow. CC-008 is exercised through its service/database tests and the CC-009 publishing browser workflow; no separate CC-008 browser configuration exists.
- All thirty standard scenarios executed in development and again against the built production app. Development first run 27/30; one-worker rerun recovered two failures. Production full run 29/30; the full-site public link crawl exceeded its unchanged 30-second test timeout. The unchanged isolated warmed-production retry passed in **16.1 seconds** (17.0 seconds total). All **30/30 standard scenarios** therefore pass across the full run and isolated retry; combined with existing/new isolated workflows, **40/40 unique browser scenarios** pass. No public implementation, assertion or timeout changed.
- Standard **bun run build** succeeded in managed Docker with the same working tree, Bun 1.3.14 and Node 22, inherited proxy and mounted CA trust. Direct executor attempts could not bind Turbopack's internal worker port (and the initial sandbox could not fetch Google Fonts). An exploratory supported webpack build failed on an existing unrelated node:crypto client import; no bundler/build-script change was made. Docker runs the unchanged default Turbopack build.
- Production smoke found Next's global header rule overriding the new API no-referrer policy; the private route rule now includes Customer Communications and descendants, with actual HTTP browser assertions. The corrected actual-owner browsers pass **2/2** and a fresh unchanged Docker production build passes. Final production smoke: **29 requests, zero failures** (disabled customer/recovery/webhook routes; private fail-closed owner GET/POST APIs; absent sending/dispatch/recovery/activation endpoints).

## CI and delivery

The unchanged standard build, full database suite, all existing browser suites, and new CC-012 browser workflow are required by GitHub Actions. Exact-head CI/check URLs and results are tracked on the unmerged feature PR; a build or fake transport does not supply production delivery qualification. No manual deployment or merge is part of verification.
