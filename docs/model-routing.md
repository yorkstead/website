# Model routing

Roles are fixed in [`agent-roles.md`](agent-roles.md); this file only covers which model a role uses. Updated 2026-11-25.

- Nothing switches models automatically. Whoever starts an OpenCode session picks the model (`opencode --agent developer -m <provider/model>`, or a `model:` line in the agent file once Brandon chooses defaults).
- Developer and reviewer must use **different** models, so review is independent.
- Use a stronger reasoning model for architecture, security, auth, money, migrations, and hard debugging; a faster model is fine for narrow edits, formatting, and routine checks.
- Record the choice in the handoff entry: role, model, reason, reviewer.
- If a worker is uncertain, changes scope, or cannot verify, it stops and reports. Do not solve uncertainty by silently switching requirements.
