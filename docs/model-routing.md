# Model routing and agent selection

## Important rule

The Yorkstead scaffold does not automatically switch models. `AGENTS.md`, the constitution, the active spec, and the task handoff provide routing guidance; the person or agent starting the task chooses the worker. The repository remains the source of truth.

## Route by job

| Job | Recommended primary | Use another provider for |
|---|---|---|
| Clarify a requirement or design a feature | ChatGPT/Codex | independent review |
| Explore an unfamiliar repository | Gemini CLI or Codex | second-opinion architecture review |
| Implement a focused change | Codex, Claude Code, or Gemini CLI | independent tests/review |
| Large refactor or careful code review | Claude Code or Codex | an independent provider’s risk review |
| GitHub issue, PR, CI, or small inline edit | GitHub Copilot | architecture or security decisions |
| Security, migration, or release review | A provider different from the implementer | human approval for high-risk actions |

These are defaults, not hard dependencies. Prefer the agent with the best repository context and tool access for the current task.

## Routing procedure

1. Classify the work: specification, exploration, implementation, review, migration, or release.
2. Estimate risk: low, medium, or high. High-risk work includes credentials, production data, authorization, migrations, and deployment.
3. Choose one primary worker and one independent reviewer when risk or uncertainty justifies it.
4. Give both agents the same active spec, plan, task, and verification commands.
5. Record the choice in the handoff: `Primary role`, `Provider/model`, `Reason`, and `Reviewer`.
6. Keep one active implementer per task; reviewers inspect without overlapping edits.

## Model selection within a provider

Use the provider’s current model picker or CLI configuration for the chosen role. Prefer a stronger reasoning/coding model for architecture, security, migrations, and difficult debugging; use a faster/less expensive model for summarization, formatting, narrow edits, and routine checks. Re-evaluate when the task changes risk or scope.

## Escalation rule

If the first worker is uncertain, changes scope, or cannot verify the result, stop and route the task to a stronger reasoning model or an independent reviewer. Do not solve uncertainty by silently switching requirements.
