# Preview deployment suppression canary

Temporary, documentation-only branch to verify that opening a GitHub pull request runs CI without creating a Vercel Preview deployment record.

- Scope: GitHub PR and Vercel deployment-record checks only.
- No application behavior, credentials, database configuration, or production settings are modified.
- Acceptance: CI uses its disposable PostgreSQL service; Vercel creates zero deployment records for the exact canary commit SHA.
- Do not merge this PR. Close after evidence is recorded under issue #112.
