# CC-022 rollout, secrets, and recovery

## Secrets and flags

- `YORKSTEAD_AUTOMATIONS_READ_SECRET`: existing CC-021 read-only bearer, provisioned independently on Website and Hub.
- `YORKSTEAD_AUTOMATIONS_WRITE_SECRET`: new high-entropy shared server-to-server bearer, at least 32 characters, distinct from read secret, `TASKER_BEARER_TOKEN`, Hub CRM session/password, and Google OAuth credentials. Used only by the Hub command route from Website server code.
- `YORKSTEAD_AUTOMATIONS_ACTIONS_ENABLED`: must be exactly `true` on both Hub and Website. Missing/false disables the command endpoint and Website controls. Leave false when Hub/schema/credential is not ready.

No secret is committed, sent to browser code, printed, or changed in this PR. The generated Playwright credential is synthetic and exists only in the isolated test server configuration.

## Rollout order

1. Review and merge/release Hub PR first. Apply the additive `20261029_cc022_capture_commands.sql` and ordered `20261030_cc022_command_processing_lease.sql` migrations through the approved Hub migration process. Keep `YORKSTEAD_AUTOMATIONS_ACTIONS_ENABLED=false`.
2. In separately authorized preview configuration, provision the independent read secret and write secret, leaving both action flags false. Verify CC-021 GET reads still work and the action POST responds `actions_disabled` with no records changed.
3. Enable the Hub action flag in preview only. Test with disposable synthetic capture records and mocked Google providers. Verify idempotency, audit and ambiguous timeout behavior.
4. Release Website PR after the Hub preview contract is verified. Keep its action flag false until owner-authenticated Website reads and disabled state are confirmed. Then enable Website preview actions and verify the BFF forwards only strict commands.
5. Any production schema, secret provisioning/rotation, or flag change requires separate explicit production authorization. If separately approved later: install schema, configure the write secret with flags false, validate Hub, enable Hub, verify Website compatibility, then enable Website.

## Rotation and failure behavior

To rotate the write secret, first disable actions on Website, then Hub; install the replacement in both server environments; verify it without exposing values; enable Hub, then Website. Rotate the read secret independently. Missing/mismatched secrets fail closed; reads continue if only the write secret is missing. A Hub 401/503, invalid response, timeout, stale capture or schema conflict is never rendered as success/empty data.

Google Tasks failures before the remote POST are retry-safe through the same idempotency key. A command lease prevents duplicate requests from recovering a live command. After lease expiry, a durable `approve_task.external_write_started` marker determines recovery: marked commands become `needs_review` after an interrupted provider call; unmarked commands can return to `retryable` only when capture state permits. Once a Google POST begins, any timeout/provider/response/persistence ambiguity is held in `needs_review`; the UI keeps the same command key for status checks and blocks a new command until the owner reconciles the Hub task state.

Lead commands only report or preserve a pending Hub CRM review draft. CRM approval remains in the existing Hub CRM lifecycle. Website CRM is not written. No customer messages are sent.

## Rollback

Disable Website actions first (or remove the Website feature), then disable the Hub flag and revoke/rotate the write credential through separately authorized configuration. Keep CC-021 reads available if safe. Revert Website UI/BFF via reviewed Website PR, then revert the Hub route via reviewed Hub PR. Retain command/audit records for traceability; do not down-migrate or delete records. Preserve `/api/capture`, `/api/google/tasks`, Tasker local-file fallback, Calendar ingestion behavior, CRM review, briefing, audio/playback, devices and scheduled jobs.

Neither PR merges or deploys automatically. Hub PR is opened first; Website PR targets the Hub contract but remains disabled until the Hub release/dependency is validated.
