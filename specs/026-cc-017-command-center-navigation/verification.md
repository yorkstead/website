# Verification

No database changes were introduced.

## Required commands

- `bun run yorkstead:check`
- `bun run db:migrate:check`
- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run test:e2e`
- `bunx playwright test -c playwright.cc017.config.ts`
- `bun run build`
- `git diff --check`

Record local environment limitations and exact-head CI evidence after running checks. Do not use production data or deployment operations for verification.

## Local results

- `bun run yorkstead:check` — pass; 27 active spec directories.
- `bun run db:migrate:check` — pass; 18 migrations validated.
- `bun run lint` — pass; one pre-existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — pass.
- `bun test` — 369 passed, 109 PostgreSQL-dependent skipped, 0 failed.
- `bun run test:e2e` — 32/32 passed.
- `bunx playwright test -c playwright.cc017.config.ts` — app started, but authenticated fixture stopped before tests because identical loopback disposable `DATABASE_URL` and `TEST_DATABASE_URL` values are unavailable. The fixture did not connect to a non-disposable database.
- `bun run build` — blocked by Turbopack worker-port `EPERM` in the sandbox; the webpack fallback (`bunx next build --webpack`) fails parsing TypeScript `--showConfig`. Typecheck passes. Exact-head CI is expected to provide build and isolated browser evidence.
- `git diff --check` — pass before the final compatibility adjustment; repeat before commit.

## Remote evidence

- GitHub Actions run [#312](https://github.com/yorkstead/website/actions/runs/40826746490) used merge ref `f251f1fc36ea148858bfb4c22720c4c35fe969aa` (PR head `6e3a7fcffc003ed2b6ffcbc021c942da0bf30aed`). Disposable migrations, deterministic/database tests, lint, typecheck, standard browser tests, isolated enrollment, and owner publishing passed. The job stopped in the existing CC-010 Client Access browser scenario at 390px because it expected a sidebar link visible before opening the new mobile drawer. Later isolated workflows, CC-017 navigation browsers, production build, and clean-worktree check were skipped by CI after that failure.
- Updated `tests/e2e-cc010/client-access.e2e.ts` to open the mobile drawer before checking Client Access and close it before continuing the command-palette workflow. The corrected run is pending on the next pushed head.
- A Vercel preview for code head `6e3a7fcffc003ed2b6ffcbc021c942da0bf30aed` reached `READY`: [preview](https://website-o5fblq8tx-yorkstead.vercel.app), [deployment inspector](https://vercel.com/yorkstead/website/JssFRVvCgGxcaaEQfbetv1R6PdoM). The deployment is access-protected; direct visual inspection was unavailable without creating a broadly shareable temporary URL, so this records deployment status only.
