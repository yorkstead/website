# CC-022 verification

## Hub
- Route tests: independent write bearer, bounds/schema/action/state validation, constant-time token compare, private/no-store headers, idempotency replay and conflict.
- Disposable PostgreSQL: migration fresh/repeat/upgrade; concurrent approve claims; duplicate command key and capture; task/CRM uniqueness; audit rows and no secrets/content.
- Mock Google token/task provider: success, pre-write failure retry safety, request timeout after POST start, malformed provider result and partial database completion.
- Run `git diff --check`, `bun run test`, `bun run typecheck`, `bun run build`, and available disposable schema checks. Never call production APIs.

## Website
- Verify Better Auth owner denial occurs before any Hub request; Hub write BFF fixed URL, no browser credential relay, body size/schema, CSRF and private/no-store.
- Unit tests cover disabled write credential, read credential compatibility, action results/conflicts/retry safety and safe error mapping.
- Playwright synthetic owner flows at desktop/mobile include details, confirmation, action destination/outcome, pending/failure/conflict/retry and lead staged review.
- Run `bun run yorkstead:check`, `bun run db:migrate:check`, lint, typecheck, all unit/integration/browser suites and build.

No live records, Google actions, production env modifications, manual deployments or merges. Record skipped checks and tested SHAs exactly.

## Local evidence — 2026-10-29

- Revision under test: `feat/cc-022-automation-capture-management`, based on verified Website `main` `94fc79aaa294532987526e9a50f82aff335cf1ec`. `bun run yorkstead:check` passed; `bun run db:migrate:check` validated all 19 existing Website migrations (CC-022 adds no Website migration).
- `bun run typecheck` passed. Focused CC-021/CC-022 tests passed 8/8; full `bun test` passed 391, with 110 existing database-dependent tests skipped because `TEST_DATABASE_URL` is not configured. `bun run lint` passed with the existing warning in `components/login-panel.tsx:62`. `git diff --check` passed.
- The new Playwright owner flow is discovered in `playwright.cc017.config.ts`; `--list` reports 6 tests. Local browser execution is blocked by missing disposable `TEST_DATABASE_URL` and `next dev` `listen EPERM` on loopback. No DB fixture could be provisioned because Docker daemon access is denied and PostgreSQL server binaries are absent. Exact execution is delegated to Website PR CI, which has its disposable PostgreSQL service.
- `bun run build` is blocked locally by Turbopack's `creating new process / binding to a port / Operation not permitted`, including an elevated retry. `bunx next build --webpack` was also attempted and Next failed to parse TypeScript `--showConfig`; regular CI build remains required. TypeScript, lint and route tests passed independently.
- No Website migration, production credential, record, route call, Google task, capture action, deployment or merge was performed. CC-021 reads remain version-1 compatible; added `captureActions` is optional in the parser.
