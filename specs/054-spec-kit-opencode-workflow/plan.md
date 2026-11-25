# Implementation plan: Spec Kit and OpenCode development workflow

**Spec:** [spec.md](./spec.md)

## Approach
Run `specify init --here --force --non-interactive --integration opencode --script sh --ignore-agent-tools` from Spec Kit tag v1.4.4, then add the shared Yorkstead kit (overrides, agents, workflow doc, PR template) and repo-specific docs updates.

## Files and boundaries
| Area / file | Change | Risk |
|---|---|---|
| `.specify/**` | New: Spec Kit scripts, templates, workflow, constitution, overrides | Low |
| `.opencode/commands/speckit.*.md`, `.opencode/agents/*.md` | New | Low |
| `.github/pull_request_template.md`, `CLAUDE.md`, `docs/dev-workflow.md` | New | Low |
| Docs listed in the spec scope | Docs edits | Low |

## Data and migrations
- Schema change: none.

## Verification strategy
- Automated: AC2 and AC3 shell checks; `git diff --stat` for AC4. `bun run verify` is not affected by docs-only changes and was not run in the cloud session.
- Manual: on the ThinkPad, `opencode agent list` shows `developer` and `reviewer`; `/speckit.specify` appears in OpenCode.

## Risks and rollback
- Spec Kit refresh could overwrite the constitution: `docs/dev-workflow.md` says to restore it and review the diff. Rollback: revert the PR.
