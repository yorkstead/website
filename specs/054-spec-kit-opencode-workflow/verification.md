# Verification: Spec Kit and OpenCode development workflow

**Tested revision:** working tree on `claude/project-thread-xi265f` (base `main` @ `6a68894`) · **Date:** 2026-11-25 · **By:** Claude (cloud session)

## Commands run
| Command | Result | Notes |
|---|---|---|
| `bash .specify/scripts/bash/resolve-template.sh spec-template` | PASS | First line: `# Feature: <name>` (Yorkstead override) |
| `bash .specify/scripts/bash/create-new-feature.sh --dry-run --json --short-name test "test feature"` | PASS | `"FEATURE_NUM":"055"`; nothing created |
| `ls .opencode/commands` | PASS | 9 `speckit.*.md` commands |
| `git status --porcelain` filtered for app paths | PASS | No app, test, or migration files changed |
| `node scripts/yorkstead-check.mjs` | PASS | `PASS: Yorkstead scaffold, 56 active spec directories, and required scripts are present.` |

## Acceptance criteria
| AC | Met? | Evidence |
|---|---|---|
| AC1 | Yes | Files listed in the PR diff |
| AC2 | Yes | resolve-template output above |
| AC3 | Yes | dry run above |
| AC4 | Yes | filtered status above |

## Not verified
- `bun run verify`: not run; the change is docs and agent configuration only, and `bun` is not installed in the cloud session. CI is blocked by the GitHub Actions billing issue.
- OpenCode loading the agents and commands (T007): needs the ThinkPad.
