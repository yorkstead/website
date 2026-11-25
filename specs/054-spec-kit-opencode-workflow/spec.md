# Feature: Spec Kit and OpenCode development workflow

**Spec:** `specs/054-spec-kit-opencode-workflow/` · **Status:** Review
**Owner gate:** Brandon approved starting this setup on 2026-11-25 (project thread). Merge still needs his approval.

## Problem and outcome
As Brandon, I want every Yorkstead repo to run the same spec-driven loop, so that Claude can act as project manager and hand specs to OpenCode agents that implement and review them without chat history.

## Scope
### In scope
- Commit Spec Kit v1.4.4 (`.specify/`, OpenCode integration, `sh` scripts) and its OpenCode commands (`.opencode/commands/speckit.*.md`).
- Keep the house style: Yorkstead templates in `.specify/templates/overrides/` (spec, plan, tasks, verification) override Spec Kit defaults; no `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
- Amend the constitution to v1.1.0: principle VI names the roles (Claude PM, OpenCode developer and reviewer, Brandon owner) instead of a provider list.
- Add OpenCode `developer` and `reviewer` agents, `docs/dev-workflow.md`, a PR template, and `CLAUDE.md` (`@AGENTS.md`).
- Create `specs/INDEX.md`; add `bun run verify`; update `AGENTS.md`, `docs/agent-roles.md`, `docs/model-routing.md`, `docs/workflow.md`, `docs/verification.md`, `docs/handoffs/SESSION-START.md`, `docs/handoffs/CURRENT.md`.

### Out of scope (non-goals)
- Any application code, database, dependency, CI, or hosted-demo change.
- Renaming the folders that reuse 021 and 036; they are listed in INDEX instead.
- Choosing OpenCode models (owner decision).

## Acceptance criteria
- AC1 — Given a fresh clone, when an agent opens the repo, then `.specify/memory/constitution.md`, the four override templates, `.opencode/agents/{developer,reviewer}.md`, and `.opencode/commands/speckit.*.md` exist.
- AC2 — Given `.specify/scripts/bash/resolve-template.sh spec-template`, then it returns the Yorkstead override, not the Spec Kit default.
- AC3 — Given `create-new-feature.sh --dry-run`, then the next number is 055.
- AC4 — `git diff` touches no file under `app/`, `components/`, `lib/`, `migrations/`, or `tests/`, and `package.json` changes only by adding the `verify` script.

## Constraints and compatibility
- Existing behavior to preserve: everything; this is docs and agent configuration only.
- Rollback: revert the PR.

## Open questions
- Which models the OpenCode developer and reviewer use (they must differ).
- OpenCode agent frontmatter (`mode`, `permission.edit: deny`) is untested on the ThinkPad; confirm with `opencode agent list`.
