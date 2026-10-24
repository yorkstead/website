# CC-009 verification

## Base and scope

Freshly fetched main `fb1f72bab294eb70bd760fd8f56e02cffbdc7c41` (PR #59 merge), including migrations 0013/0014 and chronological update ordering. Branch: `feat/cc-009-owner-publishing`.

No migration, dependency, customer capability, customer authorization query, enrollment gate, production configuration, source-storage write path or publication transition change. The additive read method shares the CC-008 owner transaction and source-first locks; HTTP writes delegate to its existing preparation/approval/withdrawal methods. The preview uses the existing strict assembler and CustomerPortalView adapter over current approved snapshots, never a fabricated customer fixture.

## Local evidence

- Scaffold validation passes: 17 active specifications.
- Migration validation passes: all 14 historical migrations remain unchanged. Fresh disposable PostgreSQL 16 migration application and the full existing prepared-query/upgrade tests pass. No new schema is required.
- Critical dependency audit passes; dependencies/lockfile unchanged.
- Full Bun suite: **363 pass, 0 fail, 0 skip**, including existing owner/CRM/enrollment/tenant/publication/concurrency tests and ten added CC-009 tests.
- Targeted transport/presentation/database suites: **17 pass**. Actual owner denial, strict field rejection, same-origin/Fetch Metadata/JSON enforcement, declared/streamed body size limits, safe errors/no-store, exact approved-preview parity, independent child/overview withdrawals, invalidation/removed-source history and inactive/unmapped scope behavior pass.
- Lint: zero errors and one pre-existing owner login-panel navigation warning. Typecheck passes.
- Standard browser suite: **30/30 pass** across the full run (27) and three single-worker retries of existing public navigation/journey timeout cases (90-second local timeout, no assertion changes). The new owner page, full preview and API denial cases passed in the full run.
- Existing isolated customer enrollment browser suite: **2/2 pass**.
- New isolated owner publishing browser suite: **2/2 pass**, real Better Auth owner sessions at 390px and 1440px. Covers safe candidates/descriptions, exact revision review, overview gate, independent milestone/date decisions, draft exclusion, individual withdrawal, concurrent-edit conflict with preview suppression, refresh/re-review, source invalidation, full preview privacy/no-store, whole-project withdrawal, audit actor, queue filters, unavailable/empty states and viewport overflow.
- Eighteen local production-mode customer/enrollment/auth/data/document/approval GET/POST requests return 404. Owner publishing GET/POST fail closed without production auth configuration and retain no-store headers.
- Standard production build passes without production runtime secrets. Generated `next-env.d.ts` matches the base afterward; whitespace diff check passes.

Initial verification corrections: Playwright's Node runner required separating the Bun fixture entry point from its imported helper; the shared route announcer required scoping the workflow error assertion to its accessible name. React effect state resets were moved to initiating events. The existing exact dashboard-newline guard remains intact by retaining its original adjacent links. No security assertions or existing tests were disabled or weakened.

## Security/disclosure review

Owner auth is enforced independently by page, controller and domain service. No request can submit tenant, actor, role, source payload, approved state or local workspace data. Writes are individual and revision-specific. API response schemas omit workspace JSON/digests and project/CRM internals. Candidate prose is owner-only and always requires an explicit draft review; descriptions are optional selections. The approved inline/full previews never include audit, drafts, withdrawn records or invalidated snapshots.

CSP/X-Frame-Options are unchanged; preview uses shared portal sections inline and a protected full-page link. Selected-project loads are abortable, pending actions are disabled, superseded/error/conflict views hide prior preview and mutations are not auto-replayed after a network error. All persisted workspace changes still invalidate all publications, including unrelated projects. Repreparing approved content intentionally hides that approval immediately; the interface warns about this. Retained publication projects remain selectable after source deletion; inactive/unmapped projects cannot prepare/approve and explain the blocker. Audit display shows the latest 200 events; underlying history is retained.

## Release and rollback

Customer enrollment/login/data access, uploads/downloads and external approvals remain disabled in production. No real customer data, emails, customer activation, production secrets/settings, manual migration/deployment or merge. Mapping provisioning and finer-grained invalidation remain out of scope. Revert UI/adapters/read method first; retain CC-008 registry and audit. Fresh exact-head CI and unmerged PR delivery will be recorded on the PR checks/verification section after push.


## Automated review correction — date-only Update notes

PR #60 thread `PRRT_kwDOUJPn1c6v5ql5` identified a valid compatibility edge: workspace validation accepts calendar dates in note.createdAt, while publication snapshots intentionally require full datetimes. The shared source adapter now maps date-only values to UTC midnight before strict publication validation, preserves already valid datetime strings, and returns no candidate for unsupported timestamps instead of throwing across the whole workflow. No schema or disclosure policy is weakened.

New unit and PostgreSQL regressions cover date-only candidates, preserved datetime offsets, strict rejection of unnormalized publication timestamps, unsupported-candidate failure, approved owner/customer preview parity, audit history and individual/overview withdrawal. Initial 363-test local evidence above precedes these two regressions. The correction full suite passes 365/365 with zero skips; targeted source/projection/database suites pass 17/17, lint/typecheck and the standard production build pass (existing login warning only), and both mobile/desktop owner browser flows pass with a date-only Update fixture. Final exact-head CI evidence is recorded on PR #60. The managed environment briefly restarted during review, then recovered; no production system was accessed.
