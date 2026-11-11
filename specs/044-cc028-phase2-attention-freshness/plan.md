# Phase 2 implementation plan

1. Capture server-side CRM and Discovery read completion times in the authenticated Dashboard loader.
2. Pass those optional read times through the existing Dashboard props to Unified Attention View.
3. Replace the current missing-timestamp explanation with an explicit “Read at” value; keep unavailable/partial/limit wording and existing source destinations.
4. Add focused component tests for both timestamps, unavailable states, links, and limit behavior.
5. Run repository checks, update verification and handoff, and open one focused PR for #119.

Only `app/dashboard/page.tsx`, existing Dashboard prop plumbing, the attention view/tests, and this spec directory should change. No database changes.
