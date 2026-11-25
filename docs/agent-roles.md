# Agent roles

The full loop is in [`dev-workflow.md`](dev-workflow.md). Updated 2026-11-25; this replaces the earlier Codex/Gemini/Copilot routing.

| Role | Who | Output |
|---|---|---|
| Owner | Brandon | Approves specs; merges; approves production, migrations, credentials, scope changes |
| Project manager and spec owner | Claude | Spec, plan, tasks, handoff packets, PR review against acceptance criteria, INDEX and handoff upkeep |
| Implementer | OpenCode `developer` agent (`.opencode/agents/developer.md`) | Focused commits, ticked tasks, `verification.md`, draft PR |
| Independent reviewer | OpenCode `reviewer` agent on a different model from the implementer | APPROVE / REQUEST CHANGES with file:line findings |

## Rules
- Only one implementer edits a task at a time; reviewers do not edit.
- Use the reviewer for anything touching security, auth, money, migrations, or release.
- Human approval is required for production changes, destructive data operations, credentials, and scope changes.
- The durable record is the spec, task list, commits, checks, and review, not the model conversation.
