# CC-028 — Command Center workflow consolidation tasks

**Tracking:** issue [#119](https://github.com/yorkstead/website/issues/119)
**Status:** T101, T102, T103, T105, and T106a are merged. T104a and T106b are under review. T104b and T107 remain owner-gated.

## Planning and owner review

- [x] T001 — Review merged audit and existing source-of-truth specs; map existing work to this proposal.
- [x] T002 — Define program boundaries, acceptance criteria, explicit non-goals, risks, and owner decision gates.
- [x] T003 — Sequence independent candidate implementation slices with effort, risk, benefit, and review gates.
- [x] T004 — Owner authorized continuing with the consolidation plan; T105 was selected for this independently verifiable slice after current source review. Decisions for other gated slices remain outstanding.
- [x] T005 — Reconfirmed live `main` at `683ef64281cf80f8df5d6289544dbb695199cda6` through GitHub and fetched that exact ref before implementation.

## Conditional implementation slices — separately authorized after T004

- [x] T101 — Bounded owner-only cross-source account candidates implemented with no auto-link or merged account record; merged in PR [#123](https://github.com/yorkstead/website/pull/123) at `381a64e5b57094dcf2c4317670913cde5a8a3869`. See `specs/043-cc028-phase1-overlap-review/`.
- [x] T102 — Attention source read times added without treating them as source-record freshness; merged in PR [#127](https://github.com/yorkstead/website/pull/127) at `c4aeca67e0e1e96d0e77a747e22b27462a0efa84`. See `specs/044-cc028-phase2-attention-freshness/`. The duplicate draft PR #126 was closed once #127 covered the same behavior.
- [x] T103 — Linked consultation identity is specified as a meeting-time snapshot; the editor shows a read-only snapshot with a CRM link and `updateConsultation` preserves identity and link. Merged in PR [#129](https://github.com/yorkstead/website/pull/129). See `specs/045-cc028-phase3-consultation-identity/`.
- [x] T104a — CRM accepted proposal amount is recorded as commercial truth and Marketing activity value as attribution; the metric field, panel, activity field, and CRM card follow that language. See `specs/046-cc028-phase4a-commercial-value/`. PR [#130](https://github.com/yorkstead/website/pull/130) open for review.
- [ ] T104b — Owner approved an explicit project-creation step on proposal acceptance (2026-11-11). Not started: it reuses the existing idempotent conversion and needs its own concurrency, idempotency, and rollback coverage.
- [x] T105 — Confirmed no static, dynamic, route, package, or other in-repository consumer for the two disconnected components; removed only those files. `LeadPriorityQueue` and active Automation Hub integration remain untouched. Merged in PR [#124](https://github.com/yorkstead/website/pull/124) at `6a0173239aeb4860d0dccecc14749ff2f314070b`.
- [x] T106a — Quick Launch and workspace defaults now target `yorkstead`; `4twentydev` is retired for GitHub and Vercel per the owner (2026-11-11). Merged in PR [#131](https://github.com/yorkstead/website/pull/131) as `b6a6319`. See `specs/047-cc028-phase6a-quick-launch-targets/`.
- [x] T106b — Navigation regrouped into Pipeline, Delivery, Systems, and Insights with all routes preserved; owner accepted the taxonomy on 2026-11-11. PR [#132](https://github.com/yorkstead/website/pull/132). See `specs/048-cc028-phase6b-navigation-taxonomy/`.
- [ ] T107 — Route active external prospecting outputs into existing Discovery/CRM only through a separately authorized scope; otherwise leave outside this repository.

## Excluded work

- [x] T201 — Preserve Systems Registry, Operations, Infrastructure & Recovery, and YS-SYS-001 module ownership.
- [x] T202 — Keep customer portal activation, production data, provider-account changes, migration, merge, and deployment outside this planning scope.
- [x] T203 — Do not create a new CRM, task database, system registry, event bus, prospecting service, or scheduled job.
