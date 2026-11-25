# Yorkstead spec-driven dev workflow

Shared across all Yorkstead repos. System: [GitHub Spec Kit](https://github.com/github/spec-kit) v1.4.4 with the OpenCode integration, using Yorkstead's own templates in `.specify/templates/overrides/`. Roles: **Claude** is project manager and spec owner, **OpenCode** agents implement and review, **Brandon** is the owner and holds every gate.

## The loop

| # | Step | Who | Output | Gate |
|---|---|---|---|---|
| 1 | Intake | Brandon → Claude | Row in `specs/INDEX.md` with the next free number | |
| 2 | Specify | Claude (`/speckit.specify`) | `specs/NNN-slug/spec.md` | |
| 3 | Clarify | Claude asks, Brandon answers (`/speckit.clarify`) | Answers folded into the spec | **Brandon approves the spec** |
| 4 | Plan | Claude (`/speckit.plan`) | `plan.md` with the file list implementers may touch | |
| 5 | Tasks | Claude (`/speckit.tasks`, then `/speckit.analyze`) | `tasks.md`, each task sized to one session with a verify step | |
| 6 | Implement | OpenCode `developer` agent | Commits, ticked tasks, `verification.md`, `CURRENT.md` entry, draft PR | |
| 7 | Review | Claude against acceptance criteria; OpenCode `reviewer` agent on a different model for risky changes | APPROVE / REQUEST CHANGES | |
| 8 | Merge | Brandon | Merged PR | **Brandon merges** |
| 9 | Release and close | Brandon deploys/migrates; Claude updates INDEX and CURRENT | Spec marked Done | **Brandon approves production** |

Rules: one implementer per task at a time; scope changes go into the spec first; no claimed check without real output; agents never contact customers.

## Numbering
Take the next number after the highest in `specs/` (Spec Kit's `create-new-feature.sh` does this). Never reuse a number. Older duplicates are listed in `specs/INDEX.md` and keep their folder names.

## Handoff packet (Claude → OpenCode)

```markdown
# Handoff: <repo> spec NNN-slug, tasks T001 to T004
Repo and branch: yorkstead/<repo> @ <branch> (from <base> @ <sha>)
Agent: developer (reviewer runs after the PR opens)
Read first: AGENTS.md, docs/handoffs/CURRENT.md, specs/NNN-slug/spec.md, plan.md, tasks.md
Do: T001 to T004 only, in order. Tick each box in tasks.md when done.
Don't: touch files outside plan.md, change scope, add dependencies, run migrations
  against any non-local database, merge, or deploy.
Verify: bun run verify, plus each task's verify command
Record: specs/NNN-slug/verification.md and a dated entry at the top of docs/handoffs/CURRENT.md
Finish: push, open a draft PR from the template, then stop.
Stop and report if: the spec is ambiguous, the same check fails twice,
  a secret or new service is needed, or a task needs files the plan doesn't list.
```

## Running OpenCode on the ThinkPad
One git worktree and one tmux window per spec, from `~/projects/<repo>`:

```bash
git worktree add ../<repo>-NNN -b <branch> origin/<base>
cd ../<repo>-NNN && bun install
opencode --agent developer        # paste the packet
opencode --agent reviewer         # after the PR opens, on a different model
```

Spec Kit commands are in `.opencode/commands/speckit.*.md`; the agents are in `.opencode/agents/`. To refresh Spec Kit: `uvx --from git+https://github.com/github/spec-kit.git@<tag> specify init --here --force --integration opencode --script sh`, then restore `.specify/memory/constitution.md` and check `git diff` before committing.
