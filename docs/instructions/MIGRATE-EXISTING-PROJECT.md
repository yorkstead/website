# Migrate an existing project to Yorkstead

Use this instruction when bringing an existing repository into the scaffold.

## Safety rule

Migration is a development-process change, not a product-feature change. Preserve architecture and behavior. Do not refactor unrelated code while installing the scaffold.

## Procedure

1. Inspect the repository, Git status, remotes, stack files, tests, CI, deployment config, and existing agent instructions.
2. Preserve existing `AGENTS.md`, framework-generated instructions, secrets handling, and project conventions. Merge Yorkstead guidance rather than overwriting authoritative framework rules.
3. Add `.specify/`, `.agents/skills/`, `.github/`, `docs/`, and `specs/` from the template.
4. Complete `docs/project-profile.md` from the repository evidence.
5. Replace `docs/verification.md` with the actual commands already used by the project.
6. Establish a baseline by running the existing checks before changing product code.
7. Create `docs/handoffs/CURRENT.md` with the current branch, baseline, risks, and next action.
8. Create a migration note or decision record documenting what was preserved and what remains manual.
9. Run the baseline checks again and review the diff for product changes.

## Required migration report

- Files added or changed
- Product behavior changed: yes/no
- Existing checks and baseline results
- Manual setup still required
- Provider/model used for inspection and why
- Next recommended feature or cleanup task
