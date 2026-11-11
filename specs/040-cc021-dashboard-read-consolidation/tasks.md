# Website implementation tasks

- [x] Verify live repository heads, open PRs, worktree isolation, and current CC-021/CC-027 specs.
- [x] Define the shared contract in the Hub spec and the Website consumer plan.
- [x] Extend and test the Website DTO parser for optional v1 sections and older-response behavior.
- [x] Replace `getGoogleOperations` network behavior with a pure mapper for Calendar and up-to-100 due tasks.
- [x] Fetch CC-021 once in the authenticated Dashboard page and share its result with both consumers.
- [x] Preserve Calendar/task UI states and the existing explicit Google Task completion path.
- [x] Remove Unified Attention View's duplicate read while preserving its source-state display.
- [x] Add focused unit, authenticated browser, and no-briefing-call coverage. Browser case is credential-gated and will be reported if skipped.
- [x] Update CC-027 verification and handoff documentation without deleting historical evidence.
- [x] Run focused tests and required Website checks; record environment skips and exact SHA evidence.
- [x] Push the implementation branch and open a draft Website PR after the Hub PR/head is available; do not merge or deploy. Delivered as draft PR [#115](https://github.com/yorkstead/website/pull/115); merged 2026-11-08 at `a235ce254294df7efe3f2c9f472feb10dc5792ef`.
