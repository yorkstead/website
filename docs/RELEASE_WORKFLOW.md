# Yorkstead release workflow

## Default: do not commit directly to main

- Start every feature, bug fix, or AI-agent session on a short-lived branch: `feat/<scope>`, `fix/<scope>`, or `chore/<scope>`.
- Keep the change scoped to one deliverable. Multiple commits on the branch are fine; they are **not production releases**.
- Open a pull request only when the feature is ready for validation. Prefer a draft PR while work is incomplete.
- Run lint, typecheck, unit/integration tests, and relevant build/browser checks before merge. Do not bypass a failing CI check.
- Once checks pass, **squash merge** the pull request into `main`. Each main merge is a deliberate release candidate.
- Production deployment stays handled by Vercel's existing Git integration; do not add a second GitHub Actions deployment job.

## Recommended release cadence

- Batch nonurgent dashboard/UX updates into **one release per project per day** (or less).
- Allow immediate releases for security, payment, authentication, or significant customer-facing outages.
- For an urgent patch: branch from main, validate, and merge once; do not scatter several successive production pushes.
- Validate the live URL and key critical workflow after a successful deployment. Record the release commit and any follow-up issues.

## Cross-repository changes

For changes involving `website` and `yorkstead-automation-hub`:
1. Make the backend API change backward-compatible and deploy it first.
2. Verify the backend endpoint from the existing frontend before changing the frontend.
3. Merge and deploy the website once, after backend success.
4. Never expose bridge secrets client-side or duplicate CRM/Google records between systems.

## Agent/Codex working agreement

- Agents must **not** push directly to `main`.
- Agents should deliver a branch or draft PR, with tests performed and a concise changelog.
- Do not deploy automatically as part of an agent task unless explicitly requested.
- Consolidate related fixes and verification before asking for merge.
- Stop on CI failure and repair the branch rather than pushing additional commits to main.
- Never rerun production deployments to diagnose source failures when local or CI validation is available.

## GitHub settings to enable (manual administrative step)

In Settings > Rules > Rulesets, create an active branch ruleset for `main`:
- Require a pull request before merging.
- Require status checks to pass (choose actual `CI / Verify application` check for this repository if present).
- Require branches to be up to date before merging when appropriate.
- Block force pushes and deletion.
- Allow squash merges.

**Note:** Vercel may still build preview deployments for PR branches. A GitHub ruleset controls production merges; it does not independently disable preview builds. Manage preview deployment frequency separately if needed.

## Release checklist

- [ ] Change scoped, code review completed
- [ ] Lint and TypeScript clean
- [ ] Tests, relevant migration checks, and build passing
- [ ] Environment configuration available
- [ ] Backward compatibility verified for bridge routes
- [ ] PR squash-merged into main only once
- [ ] Vercel production deployment is Ready on expected SHA
- [ ] Live smoke test successful
