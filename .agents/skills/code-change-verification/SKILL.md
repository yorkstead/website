---
name: code-change-verification
description: Verify a code change against its acceptance criteria by running focused and repository-required checks, reviewing the diff for scope creep or secrets, and recording outcomes and skipped checks. Use when implementing or reviewing repository code changes.
---

# Code-change verification

Read acceptance criteria and changed files; run the narrowest relevant check, then the full required checks in `docs/verification.md`; inspect the diff for scope creep and secrets; record pass/fail evidence and skipped checks.
