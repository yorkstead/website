# Release checklist

- [ ] Active spec, plan, and tasks are synchronized.
- [ ] `bun run yorkstead:check` passes.
- [ ] `bun run lint` passes; warnings are recorded.
- [ ] `bun run typecheck` passes.
- [ ] `bun test tests` passes.
- [ ] `bun run build` passes.
- [ ] Environment variables are confirmed without exposing values.
- [ ] Database/migration status is known when applicable.
- [ ] Preview deployment and smoke walkthrough are complete.
- [ ] Rollback trigger and recovery path are documented.
- [ ] `docs/handoffs/CURRENT.md` points to the next exact action.
