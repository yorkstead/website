# Agent roles and routing

| Role | Preferred fit | Output |
|---|---|---|
| Architect/spec owner | ChatGPT/Codex | clarified spec, plan, task graph, decisions |
| Implementer | Codex, Claude Code, or Gemini CLI | focused change and tests |
| Independent reviewer | different provider | risks and missing cases |
| GitHub/CI operator | Copilot or any GitHub-capable agent | issue, branch, PR, checks, release evidence |

## Rules

- Route by capability and risk, not brand or subscription.
- Use a second provider for independent review of security, migrations, or release risk.
- Only one implementer edits a task at a time.
- Human approval is required for production changes, destructive data operations, credentials, and scope changes.
- The durable record is the spec, task list, commit, checks, and review—not the model conversation.
