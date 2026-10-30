# Verification — 2026-10-30

Base: `62a64895117c8e6a8f3b45adfa45e8884fb33452`; dedicated `feat/command-center-pwa` worktree. Bun 1.4.2, Next.js 16.4.2. Read installed Next manifest/PWA and redirect guidance before changes.

## Local evidence

- Focused `bun test tests/pwa-manifest.test.ts tests/service-worker.test.ts`: 3 pass, 22 assertions. Full `bun test` after updating the existing brand contract: 422 pass, 112 database-dependent skips, zero failures.
- `bun run yorkstead:check`, `bun run db:migrate:check` (21 unchanged migrations), `bun run typecheck` and `git diff --check`: pass. Lint passes; the earlier run reports one existing login-panel navigation warning.
- `bun run build`: attempted; sandbox font fetch failed, escalated Turbopack attempt failed creating a worker/binding a port (`Operation not permitted`). `bun run build -- --webpack`: successful production build, static generation and dynamic route compilation.
- `bun run test:e2e`: attempted twice outside sandbox; 6 request-only tests pass. Browser tests cannot launch locally: Chromium initially absent, then installed successfully, but `libnspr4.so` and other host libraries are missing. `bunx playwright install-deps chromium` fails because sudo needs administrator authentication. This is environment-blocked browser evidence, not passing browser tests.
- `bunx playwright test -c playwright.cc023.config.ts pwa-login.e2e.ts`: blocked by the existing identical-disposable-database-URLs guard. No disposable PostgreSQL server/URLs are available locally; no production database was used.
- Real owner login test uses existing guarded synthetic CC-023 owner fixture/config and is included automatically in its existing CI browser step. General browser tests exercise served manifest/shortcut authorization and real service-worker public caching/private bypass.

## Acceptance mapping and scope review

1. Manifest contract verifies exact name, short name, dashboard launch, stable `/` identity, root scope and all four shortcut names/destinations.
2. Worker harness proves dashboard, descendants, login, account and API requests bypass interception/cache writes; public caching still works. `public/sw.js` and registration are unchanged byte-for-byte. Browser regression additionally checks actual cache contents after private navigations.
3. Dashboard/login/shortcut authorization code is unchanged. General browser regression checks signed-out redirects for manifest launch and all four shortcuts/account. Isolated real recovery-login regression checks return to dashboard; exact CI evidence is required to close local browser gaps.
4. No custom installation UI or marketing prompt was introduced. Any future custom UI remains limited by the spec to authenticated owners.
5. Operator guide documents delayed Android manifest/WebAPK updates, retained identity, root scope, offline privacy, all four shortcuts and reinstall fallback, with Chrome documentation source. Physical Android update/install/name/launch checks remain manual and unperformed.
6. No CC-026, old CC-022B workspace, database schema, production config, worker, auth implementation or dependencies changed. Rollback: revert manifest/docs/test change through review; retain identity `/`. Existing Android metadata may take time to follow a rollback too.

## Delivery

Open a separate draft PR pending exact-head CI. No merge, manual deployment or production configuration operation is authorized or performed.
