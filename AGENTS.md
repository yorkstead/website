# Yorkstead Website

- Use Bun and preserve the existing Next.js App Router architecture.
- Read `.specify/memory/constitution.md` before material product changes.
- Material features require a spec, plan, and tasks under `specs/`.
- Preserve the privacy-first lead pipeline: no advertising identifiers, no client-side database access, and no sensitive operational records in public intake forms.
- Database changes require ordered migrations and `bun run db:migrate:check`.
- Before completion, use the relevant repository skills and run the checks in `docs/verification.md`.
- Update `docs/handoffs/CURRENT.md` whenever active work changes state.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
