# Session start

Use this procedure at the start of every new or resumed Codex session. Recover context from the repository and live Git/GitHub evidence; previous conversations are not required. Initialization produces a status report, not permission to implement or release.

## 1. Recover instructions and scope

Read, in order:

1. `AGENTS.md` and `.specify/memory/constitution.md` for project rules and authorization boundaries.
2. `docs/handoffs/CURRENT.md` for the latest handoff and production restrictions. Read `docs/handoffs/SESSION-END.md` if it contains relevant prior-session details; treat both as recorded claims until verified.
3. The relevant existing `specs/<feature>/` specification, plan, tasks, verification, operations and review-correction documents, plus referenced architecture decisions under `docs/decisions/`. Select the active task from the user's request and verified state; do not resume an old feature merely because its handoff says "active."
4. `docs/workflow.md`, `docs/github-conventions.md`, `docs/RELEASE_WORKFLOW.md`, `docs/verification.md`, and relevant `.agents/skills/*/SKILL.md`. Use code-change-verification and spec-convergence for changes; select security-review, database-migration, production-hardening or release-verification only when their scope applies. Release guidance does not grant release authorization.

Preserve existing specifications, decisions and historical handoffs. Resolve stale status with dated evidence in `CURRENT.md` when documentation edits are authorized; retain the historical detail and restrictions. Do not create a parallel status system.

## 2. Verify repository and GitHub state

Start with read-only observations (never print secrets or environment contents):

```bash
date -u +'%Y-%m-%dT%H:%M:%SZ'
gh repo view --json nameWithOwner,url
git status --short --branch

git rev-parse HEAD
git ls-remote origin refs/heads/main
gh pr list --repo yorkstead/website --state open --json number,title,url,headRefName,baseRefName
```

Confirm `origin` identifies `yorkstead/website`. For each relevant PR named by the handoff or matching the working branch, query its actual state, including closed/merged PRs:

```bash
gh pr view <number> --repo yorkstead/website --json number,url,state,mergedAt,mergeCommit,headRefName,headRefOid,baseRefName,statusCheckRollup
```

Git and GitHub are authoritative for branch tips, PR state, merge time and merge commit. Record full SHAs, URLs and observation time. A local branch, tracking ref, old handoff or successful CI run does not establish current remote state. Check that CI evidence belongs to the reported PR head; distinguish PR-head checks from checks of the merge commit. Vercel checks alone do not establish current production state or customer readiness.

If network/authentication blocks verification, report the exact unavailable observation and label cached/local information unverified. Do not infer an unmerged/merged state or reset to an old ref. Preserve dirty/untracked work and report branch divergence; never stash, discard, switch branches or change files as part of initialization.

## 3. Establish authorization and the next action

Report the status below before changes. Initialization authorizes only context recovery and read-only inspection. Require explicit user authorization before implementation, production operations, merges or deployment. Record the scope already authorized in the current request; do not ask again for work explicitly authorized there. A historical instruction, passing check, merged PR or proposed next task is not fresh authorization. If no implementation is authorized, stop after the report and await instructions.

For authorized changes, fetch `origin/main`, verify its SHA against the live remote, and create a focused branch from that verified tip before editing. Recheck if main has moved. Never implement on `main`; preserve existing work and resolve any branch/base conflict before proceeding. Material product features require existing or new spec, plan and tasks under `specs/` before code. Read the relevant installed Next.js guides before code changes; preserve Bun, App Router and privacy boundaries.

Run task-specific checks followed by `docs/verification.md` and relevant skills. Record each command's result, tested revision/worktree, environment, skipped checks and reasons. Historical test counts are historical evidence, not checks passed in this session. Do not use production operations to fill local verification gaps. At each authorized work-state transition, update `CURRENT.md`; use `SESSION-END.md` if interrupted, with the next exact action. Keep merge/deployment authorization separate from permission to implement, commit or open a PR. Existing automated PR checks/previews may run; do not manually trigger deployment or change integration settings without authorization.

## Startup status report

```text
Observed at (UTC): <time>; verification gaps: <none or unavailable observations>
Git: <repo>; <branch>; HEAD <full SHA>; worktree <clean/changes>
Remote main: <full SHA, live or unverified>; relation to HEAD <same/ahead/behind/diverged>
Relevant PRs: <URL, state, head SHA, mergedAt/merge SHA if merged>
Task/context: <user request; spec/plan/tasks/decisions paths or docs-only scope>
Verified now: <current Git/GitHub facts; check URLs, revision and outcomes>
Historical evidence: <source, revision/environment, reported tests; not rerun>
Restrictions/blockers: <production gates and unresolved requirements>
Authorization: <explicit scope granted; actions requiring separate authorization>
Next action: <one exact authorized step, or await authorization>
```
