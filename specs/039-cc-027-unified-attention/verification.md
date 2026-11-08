# CC-027 verification and review record

## Current result

Implementation source commit: `7216b64a5ddf0c751f86c1f4baf622f9c7ea75ec`, based on verified `main` SHA `4b8fa4714ad865ef7bf066d815ca6b14d5a8d542`. Browser-test corrections are in commits `bbf9df6efa25cfdd9b76846bc30d9b30d09a7e0e` and `5a41caea5dee1e073ef6a15f0ab6587caa6226b0`. Exact-head GitHub Actions run [42429982621](https://github.com/yorkstead/website/actions/runs/42429982621) passed all jobs on `5a41caea5dee1e073ef6a15f0ab6587caa6226b0`, including disposable PostgreSQL, all browser workflows, the authenticated Marketing-to-CRM workflow, production build, Registry synthetic role verification, and isolated Recovery rehearsal. GitHub's Vercel check is successful on this SHA. The Vercel deployment list contained no matching record and lookup by the status target returned 404, so the preview's deployment URL/readiness could not be independently confirmed through the available Vercel API scope. A documentation-only follow-up will change the PR head; its checks must be verified separately.

## Acceptance evidence

| Criterion | Evidence / state |
|---|---|
| A1 | `UnifiedAttentionView` is rendered inside existing `CommandCenterOverview`; no new workspace route or task persistence. |
| A2 | Workspace tasks and active project context are read from the existing Workspace model; internal links target the existing `#tasks` and project deep link. Existing edit/complete UI remains unchanged. |
| A3 | CRM follow-ups, stalled opportunities, and proposal actions use the existing CRM snapshot and link to exact lead IDs. Canonical status/action/date are rendered without editable duplicate fields. |
| A4 | `opportunityStore.attentionActions()` reads active actions due today or overdue, selects source status/date/action, probes one beyond the 25-item display bound, and excludes archived records. Existing report behavior is otherwise unchanged. |
| A5 | Existing per-project intelligence is reused. GitHub links must be HTTPS, use exact `github.com` host, and contain no userinfo. Open issue/PR status is from existing source reads; last-known timestamps are shown only from `fetchedAt`. |
| A6 | Existing `/api/dashboard/automation-hub` owner gate and bounded DTO are reused. The view calls GET only, displays section availability/truncation/checked time, and includes only open Google Tasks, review queue items, and captures requiring confirmation. No token is sent to the browser. |
| A7 | Calendar commitments remain in the existing `CalendarTimeline`; the view links to it and does not infer that arbitrary events require action. |
| A8 | Attention component contains no write controls, mutation fetches, task persistence, automation command, or external API call other than the existing owner-gated read endpoint. Existing dedicated Google Task completion and Workspace editor interfaces remain intact. |
| A9 | Unit coverage checks populated/empty/unavailable/truncated source states, status/date/navigation, URL validation, and display-only behavior. Retrieval timestamp is shown only for Hub and last-known GitHub data where evidence is provided. |
| A10 | Dashboard page verifies owner session before source reads; Hub BFF verifies owner again. Links use encoded same-origin IDs, fixed Hub URL, or validated GitHub HTTPS URLs. |
| A11 | Added component tests and authenticated Playwright coverage for CRM and Hub records, anonymous Hub denial, no Hub writes, mobile width, and existing Workspace task editability. The exact-head browser workflows passed in CI, including the existing Workspace project-task editability and authenticated Marketing-to-CRM test. |
| A12 | Local checks and exact-head CI passed on the code head documented above. Handoff and this record are updated. PR #114 remains a draft and unmerged; documentation follow-up exact-head checks remain to be verified. |

## Local checks

- `bun run yorkstead:check` — PASS.
- `bun run db:migrate:check` — PASS; all 24 existing migrations validate. No migration added.
- `bun run lint` — PASS with one pre-existing warning at `components/login-panel.tsx:62` (`no-location-assign-relative-destination`).
- `bun run typecheck` — PASS.
- `bun test` — PASS: 509 passed, 123 skipped, 0 failed. Skips are database-gated tests; local PostgreSQL is unavailable.
- Focused tests `components/dashboard/command-center-overview.test.tsx` and `components/dashboard/unified-attention-view.test.tsx` — 10 passed, 0 failed. The database integration file currently has 5 database-gated tests, including bounded-query coverage.
- `bun run build` — PASS; Next.js 16.4.2 production build completed including page-data/static generation.
- `git diff --check` — PASS.
- `bun run test:e2e` targeted CC-018 Playwright test — NOT RUN successfully. The default config does not include `tests/e2e-cc018`; its CC-018 config was then used. The test server was denied loopback binding (`listen EPERM`); `pg_isready` found no local PostgreSQL. Docker could not be started: the installed Snap refused its confinement state. This is an environment limitation, not evidence that the browser regression passes.
- `bun audit --audit-level=critical` — NOT COMPLETED; npm advisory endpoint DNS resolution failed (`DNSResolveFailed`).
- Disposable PostgreSQL integration and browser tests — passed in exact-head GitHub Actions run 42429982621 on code head `5a41caea5dee1e073ef6a15f0ab6587caa6226b0` (see exact-head evidence below).

### Exact-head GitHub Actions evidence

- Run [42429982621](https://github.com/yorkstead/website/actions/runs/42429982621) passed all 3 jobs on code head `5a41caea5dee1e073ef6a15f0ab6587caa6226b0`.
- Disposable PostgreSQL migration validation and database integration tests passed. Lint, typecheck, full browser suite, all focused browser workflows, and build without production secrets passed. Synthetic Registry least-privilege verification and isolated synthetic Recovery rehearsal passed; no Recovery-owned files were changed.
- The first run found one test expectation inconsistent with the Opportunity Discovery model's `hypothesis` default, plus ambiguous Playwright selectors (including an existing project-link selector made non-unique by the new overview link). These assertions were corrected; the full workflow passed on the subsequent code head.
- GitHub's Vercel status context reports success for this code SHA. The available Vercel deployment list returned no matching deployment, and direct lookup using the check target returned 404. Therefore a specific Preview deployment URL/readiness is not independently confirmed; no deployment was initiated manually.

## Security, ownership, and data integrity review

- Owner authentication is checked before CRM, research, analytics, and Automation Hub reads are initiated on the dashboard page. The existing Hub BFF performs an independent owner check.
- Existing source DTOs are used; no source credentials, cookies, integration secrets, CRM message bodies, or raw Workspace JSON are added to the browser payload by this feature.
- The only external attention destinations are fixed `https://cal.yorkstead.com/command` and exact-host validated GitHub HTTPS URLs. CRM and research identifiers are URL-encoded into same-origin paths.
- This feature has no writes, localStorage/sessionStorage copy, schema change, migration, archive/delete lifecycle change, or automation trigger.
- The new Opportunity Discovery read makes one bounded query rather than invoking the multi-query reports method on every dashboard request.
- The existing top-level dashboard still calls its pre-existing `/api/briefing` integration path; this PR does not change its semantics. Its read/logging side effects remain a separate review item.

## Known limitations and deferred work

- CRM and Opportunity Discovery snapshots do not include a checked-at field; the view explicitly discloses that freshness cannot be determined.
- CRM lists use existing fixed query limits. An exact-limit result is marked as potentially incomplete. GitHub issue/PR lists likewise mark the known existing display limit. Automation Hub uses its explicit truncation markers.
- Calendar records are not copied into this panel. The existing CalendarTimeline and month API remain the authority and destination; this panel does not claim live calendar availability.
- This view does not change duplicate reminders, push subscriptions, cron schedules, Tasker, OAuth paths, or Workspace lifecycle behavior.
- General Workspace versus Google Tasks ownership remains undecided. Existing records and editors are preserved.

## Rollback

Revert the overview component/call site and the bounded Opportunity Discovery read method. No database or external-source restoration is required.
