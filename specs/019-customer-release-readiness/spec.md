# CC-011 — Customer release readiness

Base: freshly fetched main `4bba15a7a24864bef058e318df45f607b21f280e`, merged PR #61; migration 0015 verified. Owner-only approval infrastructure, never activation.

Version 1 assessments use stable categorized prerequisites, scope (global/customer), severity, responsible role, authoritative evidence source/time, external dependency, approval and expiry/invalidation policy. Missing, failed, unknown, mismatched or expired mandatory global evidence blocks global approval. Customer-specific requirements remain separately unverified and never become eligible from global approval. launchReady and customerAccessEnabled remain false unconditionally in CC-011.

Technical observations originate only from trusted server adapters. Owner attestations may satisfy explicitly manual requirements only and never substitute for mandatory technical results. Evidence contains fixed identifiers/enums/digests/actors/times only; no free text, raw environment, URLs, secrets or customer data. Exact release identity binds code commit, schema version/checksum identity, configuration identity and assessment environment. Unknown identity blocks approval.

Owner dashboard: overall status/blockers, categorized technical/email/auth/access/operations checklists, separate manual evidence, current/stale decisions, retained audit/history, runbook and rollback. Main navigation/sidebar/command palette integration. HTTP and service authenticate independently; same-origin JSON, bounded inputs/results, no-store/no-referrer, safe errors and CAS. All writes require the existing reviewed disposable gate with an explicit readiness opt-in; production is readonly.

Non-goals: any customer authentication/enrollment/project-read activation; invitation, proof or recovery sending; live provider/DNS/secret/customer inspection; customer provisioning/publication; production config, migrations/deployment or merge. No endpoint accepts feature flags or changes activation.
