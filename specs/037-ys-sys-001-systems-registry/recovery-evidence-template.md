# YS-SYS-001 private recovery evidence template

Store the completed copy in owner-approved private storage. Public issue/PR updates contain only aggregate PASS/FAIL/NOT RUN and a non-sensitive evidence reference. Do not paste source identifiers, credentials, row IDs, fingerprints, account values, or plaintext exports into GitHub.

| Field | Private value / reference | Result |
| --- | --- | --- |
| Approval authority, exact operation and scope | Pending | NOT RUN |
| Source project/branch/endpoint/database and production deployment binding | Pending | NOT RUN |
| Source identity capture time and reviewer | Pending | NOT RUN |
| Client/server versions, extensions, schemas, roles, ACLs, RLS | Pending | NOT RUN |
| Prospective current-state preservation report (no fixed row-count assumption), fingerprint algorithm/version, owner sign-off | Pending | NOT RUN |
| Artifact UTC capture, migration ledger, key identifier, encrypted size/SHA-256 | Pending | NOT RUN |
| Storage provider/region/object, access audit, cost and encryption settings | Pending | NOT RUN |
| Remote byte checksum, independent retrieval and decryption test | Pending | NOT RUN |
| Retention starts/expiry, deletion verification and legal-hold exception | Pending | NOT RUN |
| Approved RPO/cadence, observed point gap and potential data loss | Pending | NOT RUN |
| RTO clock start/end and measured restore/application readiness duration | Pending | NOT RUN |
| Isolated restore target, outbound effects disabled, archive/permissions/security verification | Pending | NOT RUN |
| Operator, secondary operator, independent reviewer and sign-off | Pending | NOT RUN |
| Failure/cancellation drill and cleanup confirmation | Pending | NOT RUN |

The synthetic rehearsal is separate evidence from any later authorized production-derived restore. `pg_restore --list`, a Preview build, and migration CI alone do not establish recoverability.

## Selective preservation baseline capture

Complete only after separate production role-creation and one-time capture approvals. Keep all values below in private storage; the public issue receives aggregate PASS/FAIL/NOT RUN only.

| Field | Private value / reference | Result |
| --- | --- | --- |
| Runner source SHA and exact deployment/Neon target attestation | Pending | NOT RUN |
| Dedicated reader role attributes, effective grants and membership review | Pending | NOT RUN |
| Capture authorization reference, scope and UTC approval | Pending | NOT RUN |
| Capture UTC time and transaction isolation/read-only status | Pending | NOT RUN |
| Canonical evidence format and SHA-256 algorithm/version | `ys-sys-001-preservation-baseline/v1`; SHA-256 over canonical UTF-8 JSON | NOT RUN |
| Entry count / stable IDs / revisions / archive states / per-entry audit counts | Pending; expected 7 entries / 11 events | NOT RUN |
| Entry and audit fingerprints and private evidence fingerprint | Pending; encrypted private bundle only | NOT RUN |
| Migration checksums and 0023 absence | Expected 0001–0022, 0023 absent | NOT RUN |
| Orphan count and enabled trigger/function metadata fingerprints | Expected zero orphans; protections enabled | NOT RUN |
| Ciphertext local SHA-256 / R2 retrieval SHA-256 equality | Pending; private evidence only | NOT RUN |
| Private age decryption and recomputed evidence fingerprint | Pending; never publish key or plaintext | NOT RUN |
| Redacted report reference, operator and owner sign-off | Pending | NOT RUN |

The original historical baseline remains unavailable. A new successful capture is a new pre-migration baseline and must not be described as historical parity.
