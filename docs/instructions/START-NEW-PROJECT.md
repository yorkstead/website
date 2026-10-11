# Start a new project with Yorkstead

Use this instruction when creating a new system, tool, application, or service.

## Bootstrap

1. Create the repository from the Yorkstead GitHub template.
2. Add the application’s initial files and preserve the scaffold.
3. Complete `docs/project-profile.md`.
4. Replace the placeholders in `docs/verification.md` with real commands.
5. Add the real `lint`, `typecheck`, `test`, and `build` scripts when applicable.
6. Run `bun run yorkstead:check` or the equivalent package-manager command.
7. Create `specs/001-first-slice/spec.md`, `plan.md`, and `tasks.md`.

## First agent assignment

Ask the architect/spec owner to inspect the repository and produce the first spec and plan. Do not begin with a large implementation prompt.

## Required first-session output

- Project profile completed
- Verification commands known
- Constitution reviewed for project-specific additions
- First spec clarified
- Tasks small enough to pause safely
- `docs/handoffs/CURRENT.md` updated

## Handoff

Record the primary provider/model, why it was selected, the next exact task, and the last passing verification command.
