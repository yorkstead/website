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
