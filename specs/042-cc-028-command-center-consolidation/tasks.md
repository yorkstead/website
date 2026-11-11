# CC-028 — Command Center workflow consolidation tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** T101, T102, and T105 are merged. T103, T104, T106, and T107 remain owner-gated or unselected.

## Planning and owner review

- [x] T001 — Review merged audit and existing source-of-truth specs; map existing work to this proposal.
- [x] T002 — Define program boundaries, acceptance criteria, explicit non-goals, risks, and owner decision gates.
- [x] T003 — Sequence independent candidate implementation slices with effort, risk, benefit, and review gates.
- [x] T004 — Owner authorized continuing with the consolidation plan; T105 was selected for this independently verifiable slice after current source review. Decisions for other gated slices remain outstanding.
- [x] T005 — Reconfirmed live `main` at `683ef64281cf80f8df5d6289544dbb695199cda6` through GitHub and fetched that exact ref before implementation.

## Conditional implementation slices — separately authorized after T004

- [x] T101 — Bounded owner-only cross-source account candidates implemented with no auto-link or merged account record; merged in PR [#123](https://github.com/yorkstead/website/pull/123) at `381a64e5b57094dcf2c4317670913cde5a8a3869`. See `specs/043-cc028-phase1-overlap-review/`.
- [x] T102 — Attention source read times added without treating them as source-record freshness; merged in PR [#127](https://github.com/yorkstead/website/pull/127) at `c4aeca67e0e1e96d0e77a747e22b27462a0efa84`. See `specs/044-cc028-phase2-attention-freshness/`. The duplicate draft PR #126 was closed once #127 covered the same behavior.
- [ ] T103 — After the owner decides snapshot semantics, clarify consultation identity behavior and add workflow regression coverage.
- [ ] T104 — After value/handoff decisions, clarify CRM commercial amount versus Marketing attribution; add an explicit project-creation handoff only if approved.
- [x] T105 — Confirmed no static, dynamic, route, package, or other in-repository consumer for the two disconnected components; removed only those files. `LeadPriorityQueue` and active Automation Hub integration remain untouched. Merged in PR [#124](https://github.com/yorkstead/website/pull/124) at `6a0173239aeb4860d0dccecc14749ff2f314070b`.
- [ ] T106 — If selected, adjust navigation labels/grouping using CC-017/CC-025 contracts and owner-confirmed Quick Launch targets.
- [ ] T107 — Route active external prospecting outputs into existing Discovery/CRM only through a separately authorized scope; otherwise leave outside this repository.

## Excluded work

- [x] T201 — Preserve Systems Registry, Operations, Infrastructure & Recovery, and YS-SYS-001 module ownership.
- [x] T202 — Keep customer portal activation, production data, provider-account changes, migration, merge, and deployment outside this planning scope.
- [x] T203 — Do not create a new CRM, task database, system registry, event bus, prospecting service, or scheduled job.
