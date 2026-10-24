// Disabled trusted rehearsal using only existing Better Auth credential accounts.
// No customer recovery route is installed. Lost-mailbox/passwordless recovery is unsupported.
import { randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { enrollmentPassword } from "@/lib/customer-enrollment";
import {
  communicationsDisposableEnabled,
  CommunicationsUnavailable,
} from "@/lib/customer-communications-policy";
import { mailAddress, mailDigest, mailSecret } from "@/lib/customer-mail";
import {
  mailTransaction,
  mailAudit,
  type createCustomerMailQueue,
} from "@/lib/customer-mail-queue";
const generic = Object.freeze({
  ok: true,
  message:
    "If the account is eligible, recovery instructions will be available.",
});
type Account = { id: string; email: string; auth_subject: string };
async function eligible(
  client: PoolClient,
  tenant: string,
  identity?: string,
  email?: string,
): Promise<Account | undefined> {
  const t = (
    await client.query(
      "SELECT status FROM customer_tenants WHERE id=$1 FOR UPDATE",
      [tenant],
    )
  ).rows[0];
  if (t?.status !== "active") return;
  return (
    await client.query<Account>(
      `SELECT i.id,i.email,i.auth_subject FROM customer_identities i
    JOIN customer_tenant_memberships m ON m.identity_id=i.id AND m.tenant_id=$1
    JOIN customer_auth."user" u ON u.id=i.auth_subject
    JOIN customer_auth."account" a ON a."userId"=u.id AND a."providerId"='credential' AND a.password IS NOT NULL
    WHERE i.auth_provider=$2 AND i.status='active' AND m.status='active' AND u."emailVerified"=true AND u.email=i.email
    AND ($3::text IS NULL OR i.id=$3) AND ($4::text IS NULL OR i.email=$4)
    ORDER BY i.id FOR UPDATE OF i,m,u,a`,
      [
        tenant,
        customerAuthBoundary.identityProvider,
        identity ?? null,
        email ?? null,
      ],
    )
  ).rows[0];
}
export function createCustomerAccountRecovery(
  pool: Pick<Pool, "connect">,
  queue: Pick<ReturnType<typeof createCustomerMailQueue>, "enqueue">,
  hashPassword: (password: string) => Promise<string>,
  env: NodeJS.ProcessEnv = process.env,
) {
  function writable() {
    if (!communicationsDisposableEnabled(env))
      throw new CommunicationsUnavailable();
  }
  async function limit(client: PoolClient, key: string, maximum: number) {
    const row = (
      await client.query<{ attempts: number }>(
        `INSERT INTO customer_enrollment_limits(bucket,attempts) VALUES ($1,1)
      ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN customer_enrollment_limits.window_start<clock_timestamp()-interval '15 minutes' THEN 1 ELSE customer_enrollment_limits.attempts+1 END,
      window_start=CASE WHEN customer_enrollment_limits.window_start<clock_timestamp()-interval '15 minutes' THEN clock_timestamp() ELSE customer_enrollment_limits.window_start END RETURNING attempts`,
        [mailDigest(key)],
      )
    ).rows[0];
    return row.attempts <= maximum;
  }
  return {
    async begin(value: unknown, source: string) {
      writable();
      const input = z
        .object({
          tenantId: z.string().min(1).max(128),
          email: z.string().trim().toLowerCase().pipe(mailAddress),
        })
        .strict()
        .safeParse(value);
      if (!input.success || !source || source.length > 200) return generic;
      // Both budgets are charged, even when an account is absent or another budget is exhausted.
      await mailTransaction(pool, async (client) => {
        const accountLimit = await limit(
          client,
          `recovery-account:${input.data.email}`,
          5,
        );
        const networkLimit = await limit(
          client,
          `recovery-network:${source}`,
          20,
        );
        await mailAudit(client, null, "recovery_requested");
        if (!accountLimit || !networkLimit) return;
        const identity = await eligible(
          client,
          input.data.tenantId,
          undefined,
          input.data.email,
        );
        if (!identity) return;
        await client.query(
          "UPDATE customer_recovery_challenges SET revoked_at=clock_timestamp() WHERE identity_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL",
          [identity.id],
        );
        const token = randomBytes(32).toString("base64url"),
          id = randomUUID();
        const challenge = (
          await client.query<{ expires_at: Date }>(
            `INSERT INTO customer_recovery_challenges(id,tenant_id,identity_id,verifier,expires_at) VALUES ($1,$2,$3,$4,clock_timestamp()+interval '590 seconds') RETURNING expires_at`,
            [id, input.data.tenantId, identity.id, mailDigest(token)],
          )
        ).rows[0];
        await queue.enqueue(client, {
          type: "account_recovery",
          tenantId: input.data.tenantId,
          identityId: identity.id,
          recoveryId: id,
          recipient: identity.email,
          secret: token,
          expiresAt: challenge.expires_at,
        });
      }).catch(() => {
        /* Generic account response also covers custody/suppression/dependency failure. */
      });
      return generic;
    },
    async complete(value: unknown, source: string) {
      writable();
      const input = z
        .object({
          tenantId: z.string().min(1).max(128),
          challengeId: z.uuid(),
          proof: mailSecret,
          password: enrollmentPassword,
        })
        .strict()
        .safeParse(value);
      if (!input.success || !source || source.length > 200)
        throw new CommunicationsUnavailable();
      // Persist failed attempt budgets independently of credential transaction rollback.
      const allowed = await mailTransaction(pool, async (client) => {
        const a = await limit(
          client,
          `recovery-complete:${input.data.challengeId}`,
          10,
        );
        const n = await limit(
          client,
          `recovery-complete-network:${source}`,
          30,
        );
        return a && n;
      });
      if (!allowed) throw new CommunicationsUnavailable();
      // Reuse Better Auth's configured hasher, never an independent password format.
      const hash = await hashPassword(input.data.password);
      await mailTransaction(pool, async (client) => {
        const hint = (
          await client.query<{ identity_id: string }>(
            "SELECT identity_id FROM customer_recovery_challenges WHERE id=$1 AND tenant_id=$2",
            [input.data.challengeId, input.data.tenantId],
          )
        ).rows[0];
        if (!hint) throw new CommunicationsUnavailable();
        const identity = await eligible(
          client,
          input.data.tenantId,
          hint.identity_id,
        );
        if (!identity) throw new CommunicationsUnavailable();
        const challenge = (
          await client.query(
            `UPDATE customer_recovery_challenges SET consumed_at=clock_timestamp() WHERE id=$1 AND tenant_id=$2 AND identity_id=$3 AND verifier=$4 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>clock_timestamp() RETURNING id`,
            [
              input.data.challengeId,
              input.data.tenantId,
              identity.id,
              mailDigest(input.data.proof),
            ],
          )
        ).rows[0];
        if (!challenge) throw new CommunicationsUnavailable();
        const updated = await client.query(
          `UPDATE customer_auth."account" SET password=$2,"updatedAt"=clock_timestamp() WHERE "userId"=$1 AND "providerId"='credential' AND password IS NOT NULL RETURNING id`,
          [identity.auth_subject, hash],
        );
        if (updated.rows.length !== 1) throw new CommunicationsUnavailable();
        await client.query(
          'DELETE FROM customer_auth."session" WHERE "userId"=$1',
          [identity.auth_subject],
        );
        await client.query(
          "UPDATE customer_recovery_challenges SET revoked_at=clock_timestamp() WHERE identity_id=$1 AND id<>$2 AND consumed_at IS NULL AND revoked_at IS NULL",
          [identity.id, input.data.challengeId],
        );
        await mailAudit(client, null, "recovery_completed");
        await queue.enqueue(client, {
          type: "security_notification",
          tenantId: input.data.tenantId,
          identityId: identity.id,
          notificationId: input.data.challengeId,
          recipient: identity.email,
          expiresAt: new Date(Date.now() + 590000),
        });
      });
      return { ok: true };
    },
    async revoke(challengeId: string) {
      writable();
      z.uuid().parse(challengeId);
      await mailTransaction(pool, async (client) => {
        await client.query(
          "UPDATE customer_recovery_challenges SET revoked_at=clock_timestamp() WHERE id=$1 AND consumed_at IS NULL AND revoked_at IS NULL",
          [challengeId],
        );
      });
    },
  };
}
