# Verification commands

```bash
bun run yorkstead:check
bun run db:migrate:check
bun run lint
bun run typecheck
bun test
bun run build
```

Run task-specific tests first, then the complete list. Run `bun run test:e2e` when a change affects navigation, authenticated flows, or browser-only interaction covered by the Playwright suite. Record skipped checks and manual checks explicitly.
