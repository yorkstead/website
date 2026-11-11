# CC-028 — Command Center workflow consolidation tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** T105 disconnected-component cleanup and T101 cross-source account overlap review are merged. T102 attention observation clarity is under review in draft PR #126 from `chore/119-attention-observation-time`; remaining implementation slices stay unselected or owner-gated.

## Planning and owner review

- [x] T001 — Review merged audit and existing source-of-truth specs; map existing work to this proposal.
- [x] T002 — Define program boundaries, acceptance criteria, explicit non-goals, risks, and owner decision gates.
- [x] T003 — Sequence independent candidate implementation slices with effort, risk, benefit, and review gates.
- [x] T004 — Owner authorized continuing with the consolidation plan. T105 and then T102 were selected as independently reviewable slices; other decision-gated work remains outstanding.
- [x] T005 — Reconfirmed live `main` at `683ef64281cf80f8df5d6289544dbb695199cda6` through GitHub and fetched that exact ref before implementation.
- [x] T006 — Verified PR #123 merged at `381a64e5b57094dcf2c4317670913cde5a8a3869`, PR #124 merged at `6a0173239aeb4860d0dccecc14749ff2f314070b`, and refreshed implementation base to live `main` `3bc6e1076db103770d20f82087f5147ea50354a3`.

## Conditional implementation slices — separately authorized after T004

- [x] T101 — Owner-only bounded cross-source account overlap review merged in PR #123; no auto-link or merged account record.
- [x] T102 — Reviewed CC-021/CC-027 source contracts. Kept source ownership, exact destinations, bounded/partial states, and source-owned actions intact; added explicitly labeled read-observation times for Website CRM and Opportunity Discovery, which lack upstream freshness metadata.
- [ ] T103 — After the owner decides snapshot semantics, clarify consultation identity behavior and add workflow regression coverage.
- [ ] T104 — After value/handoff decisions, clarify CRM commercial amount versus Marketing attribution; add an explicit project-creation handoff only if approved.
- [x] T105 — Confirmed no static, dynamic, route, package, or other in-repository consumer for the two disconnected components; removed only those files. `LeadPriorityQueue` and active Automation Hub integration remain untouched.
- [ ] T106 — If selected, adjust navigation labels/grouping using CC-017/CC-025 contracts and owner-confirmed Quick Launch targets.
- [ ] T107 — Route active external prospecting outputs into existing Discovery/CRM only through a separately authorized scope; otherwise leave outside this repository.

## Excluded work

- [x] T201 — Preserve Systems Registry, Operations, Infrastructure & Recovery, and YS-SYS-001 module ownership.
- [x] T202 — Keep customer portal activation, production data, provider-account changes, migration, merge, and deployment outside this planning scope.
- [x] T203 — Do not create a new CRM, task database, system registry, event bus, prospecting service, or scheduled job.
