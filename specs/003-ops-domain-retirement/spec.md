# Ops domain retirement

## User value

Visitors who type the address printed on Yorkstead business cards, or follow an older operations link, reach a working Yorkstead destination without seeing an internal tool, sign-in page, or 404.

## Scope

- Audit every `ops.yorkstead.com` reference in the public website.
- Keep printed-card references intact while removing the ops URL from the downloadable contact card.
- Confirm all linked public demonstrations have canonical equivalents on `yorkstead.com`.
- Define permanent legacy redirect mappings in the operations repository.
- Verify public-site links and both repository builds.

## Acceptance criteria

- `ops.yorkstead.com/` permanently redirects to `https://yorkstead.com`.
- `/demo`, `/rework`, `/ellwood`, and `/restaurant` resolve to their canonical replacements.
- Unknown legacy pages do not 404.
- Retired APIs do not forward write methods.
- No customer-facing walkthrough linked by the public site is removed.

## Non-goals

- Editing the text printed on already-produced business cards.
- Replacing Google Workspace with another internal application.
- Deleting dormant source before the redirect cutover has a rollback window.
