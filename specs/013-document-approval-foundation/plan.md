# Implementation plan

1. Audit 0009/0010, Project/ClientDelivery and CC-003/004 contracts; specify boundaries and threat model.
2. Add 0011 metadata registry, immutable versions, controlled internal requests and generated append-only audit. Use composite ownership foreign keys and partial unique open-request index.
3. Add validated transactional domain service with server owner-session verification, existing customer read authorization and hard disabled capability gates. Do not add HTTP routes or server actions.
4. Add fictional read-only version/approval/audit preview under existing owner check.
5. Test state machine, actor forgery, scope isolation, revocation, immutability, concurrent decisions/new versions using disposable PostgreSQL. Run full matrix, update handoff, push feature branch and open PR; do not merge.

Tradeoffs: lifecycle is registry state for the latest version; historical version snapshots never change. Internal approvals are explicitly separate from future customer decisions. Database actor context is set only by the trusted server transaction; schema-owner credentials remain privileged. Existing project mapping is referenced, not created by document services.
