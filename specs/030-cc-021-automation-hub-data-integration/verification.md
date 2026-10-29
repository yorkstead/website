# CC-021 verification

## Contract tests

Verify the Hub route rejects missing, wrong, and insufficiently long credentials; accepts only the dedicated bearer; returns private no-store headers; allows only GET; uses static SQL and bounded limits; maps rows to allowlisted DTO fields; and distinguishes empty data from failed source reads. Assert no raw capture text/device, database errors, provider bodies, or auth values enter the response. The DTO does not expose CRM action records, so CRM retirement filtering is not applicable.

Verify the website Hub client fails closed on missing config, timeout, non-2xx, invalid JSON/schema/version, oversized/unexpected fields, and malformed timestamps. Verify the BFF denies anonymous/non-owner calls before fetch and does not relay client Authorization or Hub cookies. Assert supported DTO records reach only owner-authenticated responses with no-store caching.

## Browser coverage

Using synthetic fixtures only, verify responsive capture/classification, activity, health/configuration, review and read-only Google Tasks sections; source labels, native IDs and explicit timestamps; available empty lists; truncation; per-section errors; full integration unavailable; and retry. Verify no mutation controls appear and the Hub's separate owner UI links remain available.

## Commands

Run in each repository at the exact PR head and record runtime versions, output, skipped tests and constraints:

- Website: focused Bun tests, `bun run yorkstead:check`, `bun run db:migrate:check` (no new migration), lint, typecheck, `bun test`, `bun run test:e2e`, build and `git diff --check`.
- Hub: focused contract/auth tests, repository test suite, typecheck, build, `git diff --check`; no database migration or production rows.
- GitHub CI: disposable CI services only; confirm checks belong to the final PR SHAs.

## Operational boundaries

Do not call protected production Hub record endpoints or inspect/alter production env values during implementation verification. Do not execute a Tasker capture, Google write, morning briefing, playback, LIFX, TV, Bluetooth, customer message, migration, or production data operation. Deployment/env rollout and live synthetic authorization validation require a separately approved production operations step.

## Local results — 2026-10-29

- Website `bun run yorkstead:check`, `bun run db:migrate:check` (19 migrations), `bun run lint`, `bun run typecheck`, and focused Automation Hub tests passed. Lint retains one pre-existing warning in `components/login-panel.tsx:62`.
- Website `bun test`: 386 passed, 110 database-dependent tests skipped, 0 failed. Website `bun run test:e2e`: 32 passed. The focused `playwright.cc017.config.ts` suite requires matching disposable database URLs and could not run locally because they are not configured.
- Website `bun run build` failed in Turbopack when the sandbox denied worker port binding (`EPERM`). `bunx next build --webpack` compiled but could not parse TypeScript `--showConfig` output on host Node 26.10.0, a known environment issue. Exact-head CI build remains pending.
- Hub contract test passed; all 14 Hub Node test files passed, Hub typecheck passed, and `bun run build` passed with Next.js 16.4.2. Contract tests used stubs and did not contact production providers or databases.
- Exact-head Hub CI passed; Website CI run [40912391292](https://github.com/yorkstead/website/actions/runs/40912391292) passed PostgreSQL, unit/integration, lint, typecheck, and general browser checks but caught duplicate-match locators in two CC-017 assertions. The UI now removes duplicate Hub shortcut links and the assertion explicitly selects a source label. Those changes are committed in a follow-up; rerun exact-head CI is pending. No live website-to-production-Hub credential or endpoint check was performed.
