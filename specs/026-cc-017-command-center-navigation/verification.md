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

## PR #73 review follow-up

- `bun run yorkstead:check` — pass; 27 active spec directories.
- `bun run db:migrate:check` — pass; 18 migrations validated.
- `bun run lint` — pass; one existing warning at `components/login-panel.tsx:62`.
- `bun run typecheck` — pass.
- `bun test` — 369 passed, 109 PostgreSQL-dependent skipped, 0 failed.
- `bun run test:e2e` — 32/32 passed.
- `bunx playwright test -c playwright.cc017.config.ts` — unable to start its local Next server (`listen EPERM` on `127.0.0.1:3110`). This environment also has no matching loopback disposable `DATABASE_URL` and `TEST_DATABASE_URL`, so the owner fixture cannot safely run locally. No database was contacted.
- `bun run build` — blocked in both normal and escalated runs by Turbopack failing to start a worker (`binding to a port: Operation not permitted`).
- `bunx playwright test -c playwright.cc017.config.ts --list` — pass; lists the 3 navigation, drawer, and print tests.
- `git diff --check` — pass after edits.
- The first review-follow-up run [#319](https://github.com/yorkstead/website/actions/runs/40836519874) passed migration, database/unit, lint, typecheck, standard browser tests, all isolated owner workflows, and the CC-016 lifecycle. The existing navigation and mobile-drawer cases passed. The new print case correctly caught all dashboard chrome hidden, but its test expected two one-sheet pages while the page renders three. Corrected the regression to require and verify all three print sections on the next pushed head.
- GitHub Actions run [#320](https://github.com/yorkstead/website/actions/runs/40837471633) is running on corrected code head `5a811c6f35996b6a535698fbe8aa0f154c1dcd5a`; await final isolated navigation, build, and clean-worktree results.
- A Vercel preview for code head `a145b283803c7f5ec72b6b8306bbf9af50cfeb12` reached `READY`: [preview](https://website-g3s400aep-yorkstead.vercel.app), [deployment inspector](https://vercel.com/yorkstead/website/27Y577eZDTVXghs3DaETw4v27MQ3). Its access-protected preview prevents browser print inspection without an authenticated user session; CI browser coverage performs media emulation and asserts navigation is hidden while all print sections remain visible.

## Remote evidence

- GitHub Actions run [#312](https://github.com/yorkstead/website/actions/runs/40826746490) used merge ref `f251f1fc36ea148858bfb4c22720c4c35fe969aa` (PR head `6e3a7fcffc003ed2b6ffcbc021c942da0bf30aed`). Disposable migrations, deterministic/database tests, lint, typecheck, standard browser tests, isolated enrollment, and owner publishing passed. The job stopped in the existing CC-010 Client Access browser scenario at 390px because it expected a sidebar link visible before opening the new mobile drawer. Later isolated workflows, CC-017 navigation browsers, production build, and clean-worktree check were skipped by CI after that failure.
- Updated `tests/e2e-cc010/client-access.e2e.ts` to open the mobile drawer before checking Client Access and close it before continuing the command-palette workflow. The corrected run is pending on the next pushed head.
- A Vercel preview for code head `6e3a7fcffc003ed2b6ffcbc021c942da0bf30aed` reached `READY`: [preview](https://website-o5fblq8tx-yorkstead.vercel.app), [deployment inspector](https://vercel.com/yorkstead/website/JssFRVvCgGxcaaEQfbetv1R6PdoM). The deployment is access-protected; direct visual inspection was unavailable without creating a broadly shareable temporary URL, so this records deployment status only.
- GitHub Actions run [#313](https://github.com/yorkstead/website/actions/runs/40827437961) used exact PR head `803f756634b753e550924250105f19f9c8191359`. It passed migrations, deterministic/database tests, lint, typecheck, standard browsers, isolated enrollment and publishing. The existing CC-010 mobile owner workflow then timed out while waiting for the removed `More` command-palette button, so the later isolated workflows, CC-017 browser suite, build, and generated-worktree check were skipped. Updated that existing workflow to follow the Client Access destination from the new navigation; next exact-head CI is pending.
- GitHub Actions run [#314](https://github.com/yorkstead/website/actions/runs/40828179419) used exact PR head `4a93669890b6d646ac9a8f4ab1229b79fa052bad`. It passed migration validation/application, deterministic/database tests, lint, typecheck, standard browsers, isolated enrollment/publishing, and Client Access. It then stopped in the existing CC-011 Portal Readiness scenario because the mobile destination link was expected before opening the new drawer. Updated both Portal Readiness and Customer Communications browser scenarios to open the drawer and navigate through their destination links. The next exact-head run will verify these updates and continue to CC-017 navigation/build.
- GitHub Actions run [#315](https://github.com/yorkstead/website/actions/runs/40828947301) used exact PR head `50b6249b5d25f53ba41ab4c80d67076c2fbc0214`. It passed all checks through the CC-016 lifecycle, including corrected Client Access, Portal Readiness and Customer Communications mobile flows. The new navigation browser suite then showed two test expectation issues: the `/account` destination leaves the dashboard shell (so it cannot have an active sidebar link after navigation), and backdrop dismissal uses its own accessible name. Corrected those assertions. The next exact-head run will provide final navigation and build evidence.
- GitHub Actions run [#316](https://github.com/yorkstead/website/actions/runs/40830003367) used exact PR head `5df3d8244776454009dc88cb717f2a7e988e28cc`. It passed all checks through the CC-016 lifecycle, and the CC-017 owner destination/active-state/collapse/persistence browser. The mobile drawer scenario could not click the backdrop at the center because the drawer covers that portion. Adjusted the browser test to click the visible backdrop outside the drawer; next exact-head CI will verify the final mobile case and build.
- GitHub Actions run [#317](https://github.com/yorkstead/website/actions/runs/40830979436) passed at exact code head `d810f28a252d17d665f1ad3d3e1ae9fdbf449be0`: migration checks, deterministic/database suite, lint, typecheck, standard browsers (32/32), isolated enrollment/publishing/Client Access/Portal Readiness/Customer Communications workflows, CC-016 lifecycle, CC-017 navigation (2/2), production build without production runtime secrets, and generated-worktree cleanliness. GitHub reports the Vercel status check successful for this SHA at [deployment status](https://vercel.com/yorkstead/website/GxbdDNBQ6tMa8XQE5V8JPfZ2dbRY). Preview UI remained access-protected; no screenshot or visual interaction evidence is available.
