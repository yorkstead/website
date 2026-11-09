# CC-028 — Command Center workflow consolidation tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** Planning artifacts prepared for owner review. No implementation tasks are authorized or started.

## Planning and owner review

- [x] T001 — Review merged audit and existing source-of-truth specs; map existing work to this proposal.
- [x] T002 — Define program boundaries, acceptance criteria, explicit non-goals, risks, and owner decision gates.
- [x] T003 — Sequence independent candidate implementation slices with effort, risk, benefit, and review gates.
- [ ] T004 — Owner reviews this specification and plan, selects follow-up slices, and records the required decisions in issue #119 or the affected specs.
- [ ] T005 — Reconfirm current main and exact source/API/component contracts before opening an implementation slice; revise this plan if the audit/source has changed.

## Conditional implementation slices — separately authorized after T004

- [ ] T101 — If selected, specify and implement bounded owner-reviewed cross-source account candidates; no auto-link or merged account record.
- [ ] T102 — If selected, refine existing CC-021/CC-027 attention source, destination, freshness, partial-state, and supported-action presentation; update those owning specs.
- [ ] T103 — After the owner decides snapshot semantics, clarify consultation identity behavior and add workflow regression coverage.
- [ ] T104 — After value/handoff decisions, clarify CRM commercial amount versus Marketing attribution; add an explicit project-creation handoff only if approved.
- [ ] T105 — Confirm no static, dynamic, route, or external consumer before removing either disconnected attention/briefing component.
- [ ] T106 — If selected, adjust navigation labels/grouping using CC-017/CC-025 contracts and owner-confirmed Quick Launch targets.
- [ ] T107 — Route active external prospecting outputs into existing Discovery/CRM only through a separately authorized scope; otherwise leave outside this repository.

## Excluded work

- [x] T201 — Preserve Systems Registry, Operations, Infrastructure & Recovery, and YS-SYS-001 module ownership.
- [x] T202 — Keep customer portal activation, production data, provider-account changes, migration, merge, and deployment outside this planning scope.
- [x] T203 — Do not create a new CRM, task database, system registry, event bus, prospecting service, or scheduled job.
