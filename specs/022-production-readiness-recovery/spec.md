# CC-014 — Production Readiness & Recovery Hardening

## User value

The owner can use the existing Operations workspace to identify production configuration mismatches and follow a safe, evidence-based recovery path without exposing credentials or changing live infrastructure.

## Scope and operating mode

CC-014 builds on CC-013's owner-only, on-demand, read-only Operations surface. It adds deterministic readiness checks over safe configuration facts available to the application, explicit deployment identity documentation, and distinct backup and restore-verification evidence controls. It does not make provider control-plane calls, perform a backup, restore, migration, rollback, or alter production configuration.

The documented production Neon identity is organization `org-aged-leaf-21920027`, project `old-boat-18584731`. These identifiers are context for the owner runbook only; they do not authorize or trigger infrastructure changes. Never expose connection strings, credential values, full environment values, customer data, or raw provider errors in code, UI, logs, tests, or public responses.

## Requirements

1. Preserve owner-only rendering and independent owner authentication on every Operations API request. Preserve private/no-store/no-referrer responses and generic failures.
2. Add deterministic production-readiness checks using only fixed, locally available, non-secret configuration facts and existing bounded read-only observations. Each result states its source, status, impact, and safe owner action. Missing or ambiguous evidence remains `unknown`, `not_configured`, or `not_verified`; it never passes by default.
3. Document the production Neon organization and project identifiers as deployment context. Do not query Neon, alter provider settings, infer active project/database identity from a connection string, or display any connection string or credential value.
4. Represent backup availability/freshness and restore verification as separate controls with separate required evidence, timestamps/provenance requirements, and statuses. Backup evidence alone never implies a tested restore; a restore rehearsal never implies a current backup. Without trusted evidence both remain `not_verified`.
5. Provide a safe recovery sequence covering incident ownership, selecting a restore point, isolated restore target, integrity/application checks, cutover authorization, rollback trigger, and post-recovery verification. The page remains guidance only and offers no production mutation controls.
6. Preserve tenant isolation, owner-only access, customer authorization, and the privacy-first lead pipeline. No client-side database access, advertising identifiers, or sensitive operational values in public intake forms.
7. Add focused model, API, UI and regression tests for production/preview/development/unknown runtime states, present/missing database configuration, unverified target identity, independent backup/restore status, private owner boundary, secret redaction, and no provider or mutation calls.
8. No schema migration, dependency, production operation, secret/configuration change, provider API call, customer activation, deployment or merge is part of CC-014.

## Non-goals and restrictions

- No claim that external backups exist, are current, or are recoverable without direct evidence from an approved source.
- No Neon API/console calls, backup initiation, restore, data copy, migration, failover, project change, connection-string parsing/output, credential handling, or live infrastructure mutation.
- No automatic release readiness approval, customer activation, alerts/paging, or changes to public health behavior, tenant authorization, or database access policy.
- No production deployment or merge.

## Acceptance evidence

- Owner-only Operations page and API remain independently protected; unauthorized callers trigger no readiness or database observation.
- Pure model tests establish deterministic statuses and ensure backup evidence does not affect restore status, and vice versa.
- Readiness output has only allowlisted non-secret fields. Secret-like sentinel inputs and thrown provider-shaped errors never appear in serialized output.
- The documented Neon organization/project identifiers appear only in owner-facing deployment context/runbook documentation and do not cause provider interaction.
- Recovery guidance clearly distinguishes backup evidence from restore verification and identifies explicit approval gates for any future recovery action.
- Focused regression tests and all checks in `docs/verification.md` run without production targets.
