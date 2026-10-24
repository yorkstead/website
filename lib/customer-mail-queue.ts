// Trusted server-only construction dependencies; no HTTP dispatch adapter exists.
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { invitationVerifier } from "@/lib/client-onboarding";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import {
  communicationsDisposableEnabled,
  CommunicationsUnavailable,
} from "@/lib/customer-communications-policy";
import {
  mailAddress,
  mailDigest,
  mailType,
  renderCustomerMail,
  retryDelay,
  type CustomerMailAdapter,
  type MailKeyring,
  type MailResult,
  type MailType,
} from "@/lib/customer-mail";

export async function mailTransaction<T>(
  pool: Pick<Pool, "connect">,
  work: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export type MailIntent = {
  type: MailType;
  tenantId: string;
  identityId?: string;
  invitationId?: string;
  proofId?: string;
  recoveryId?: string;
  notificationId?: string;
  recipient: string;
  expiresAt: Date;
  secret?: string;
};
type Job = {
  id: string;
  deduplication_key: string;
  type: MailType;
  tenant_id: string;
  identity_id: string | null;
  invitation_id: string | null;
  proof_id: string | null;
  recovery_id: string | null;
  recipient: string;
  sender: string;
  origin: string;
  expires_at: Date;
  state: string;
  attempts: number;
  lease_token: string;
  provider_id: string | null;
};
export async function mailAudit(
  client: PoolClient,
  id: string | null,
  event: string,
) {
  await client.query(
    "INSERT INTO customer_mail_audit(job_id,event) VALUES ($1,$2)",
    [id, event],
  );
}
// Locks follow CC-006's tenant -> invitation -> project order. Authoritative data is never changed here.
async function eligible(client: PoolClient, job: Job, secret?: string) {
  const tenant = (
    await client.query(
      "SELECT status FROM customer_tenants WHERE id=$1 FOR UPDATE",
      [job.tenant_id],
    )
  ).rows[0];
  if (tenant?.status !== "active") return false;
  if (job.invitation_id) {
    const invitation = (
      await client.query(
        `SELECT recipient_email,token_verifier,(status='pending' AND expires_at>clock_timestamp()) AS valid FROM customer_invitations WHERE id=$1 AND tenant_id=$2 FOR UPDATE`,
        [job.invitation_id, job.tenant_id],
      )
    ).rows[0];
    if (!invitation?.valid || invitation.recipient_email !== job.recipient)
      return false;
    if (
      job.type === "invitation" &&
      secret &&
      invitation.token_verifier !== invitationVerifier(secret)
    )
      return false;
    const projects = (
      await client.query(
        `SELECT p.status FROM customer_invitation_projects s JOIN customer_tenant_projects p ON p.tenant_id=s.tenant_id AND p.project_id=s.project_id WHERE s.invitation_id=$1 AND s.tenant_id=$2 ORDER BY p.project_id FOR SHARE OF p`,
        [job.invitation_id, job.tenant_id],
      )
    ).rows;
    if (!projects.length || projects.some((p) => p.status !== "active"))
      return false;
    // A suspended known identity cannot receive enrollment/invitation action mail.
    if (
      (
        await client.query(
          "SELECT 1 FROM customer_identities WHERE email=$1 AND status<>'active' FOR SHARE",
          [job.recipient],
        )
      ).rows.length
    )
      return false;
  }
  if (job.proof_id) {
    const proof = (
      await client.query(
        `SELECT proof_verifier FROM customer_enrollment_challenges WHERE id=$1 AND invitation_id=$2 AND consumed_at IS NULL AND expires_at>clock_timestamp() FOR UPDATE`,
        [job.proof_id, job.invitation_id],
      )
    ).rows[0];
    if (!proof || (secret && proof.proof_verifier !== mailDigest(secret)))
      return false;
  }
  if (job.identity_id) {
    const identity = (
      await client.query(
        `SELECT i.id FROM customer_identities i JOIN customer_tenant_memberships m ON m.identity_id=i.id AND m.tenant_id=$1 JOIN customer_auth."user" u ON u.id=i.auth_subject
      WHERE i.id=$2 AND i.status='active' AND m.status='active' AND i.auth_provider=$3 AND i.email=$4 AND u.email=i.email AND u."emailVerified"=true FOR UPDATE OF i,m,u`,
        [
          job.tenant_id,
          job.identity_id,
          customerAuthBoundary.identityProvider,
          job.recipient,
        ],
      )
    ).rows[0];
    if (!identity) return false;
  }
  if (job.recovery_id) {
    const credential = (
      await client.query(
        `SELECT a.id FROM customer_auth."account" a JOIN customer_identities i ON i.auth_subject=a."userId" WHERE i.id=$1 AND i.auth_provider=$2 AND a."providerId"='credential' AND a.password IS NOT NULL FOR UPDATE OF a`,
        [job.identity_id, customerAuthBoundary.identityProvider],
      )
    ).rows[0];
    if (!credential) return false;
    const challenge = (
      await client.query(
        `SELECT verifier FROM customer_recovery_challenges WHERE id=$1 AND tenant_id=$2 AND identity_id=$3 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR UPDATE`,
        [job.recovery_id, job.tenant_id, job.identity_id],
      )
    ).rows[0];
    if (!challenge || (secret && challenge.verifier !== mailDigest(secret)))
      return false;
  }
  return !(
    await client.query(
      "SELECT 1 FROM customer_mail_suppressions WHERE recipient_digest=$1",
      [mailDigest(job.recipient)],
    )
  ).rows.length;
}
export function createCustomerMailQueue(
  pool: Pick<Pool, "connect">,
  options: {
    keyring: MailKeyring;
    adapter: CustomerMailAdapter;
    sender: string;
    origin: string;
    environment?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  },
) {
  const env = options.environment ?? process.env;
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000)
    throw new CommunicationsUnavailable();
  function writable() {
    if (
      !communicationsDisposableEnabled(env) ||
      options.adapter.kind !== "fake"
    )
      throw new CommunicationsUnavailable();
  }
  async function enqueue(client: PoolClient, intent: MailIntent) {
    writable();
    mailType.parse(intent.type);
    mailAddress.parse(intent.recipient);
    mailAddress.parse(options.sender);
    const resource =
      intent.notificationId ??
      intent.proofId ??
      intent.recoveryId ??
      intent.invitationId ??
      intent.identityId;
    if (!resource) throw new CommunicationsUnavailable();
    // Stable per-authoritative action. Security notice is per recovery completion, not arbitrary text.
    const key = mailDigest(
      JSON.stringify([
        intent.type,
        intent.tenantId,
        resource,
        intent.recipient,
      ]),
    );
    const existing = (
      await client.query<{ id: string }>(
        "SELECT id FROM customer_mail_jobs WHERE deduplication_key=$1",
        [key],
      )
    ).rows[0];
    if (existing) return existing.id;
    const id = randomUUID();
    const lifetime = (
      await client.query<{ expiry: Date }>(
        "SELECT LEAST($1::timestamptz,clock_timestamp()+interval '590 seconds') AS expiry",
        [intent.expiresAt],
      )
    ).rows[0].expiry;
    renderCustomerMail({
      type: intent.type,
      from: options.sender,
      to: intent.recipient,
      origin: options.origin,
      secret: intent.secret,
      challengeId: intent.proofId ?? intent.recoveryId,
    });
    const sealed =
      intent.type === "security_notification"
        ? null
        : options.keyring.seal(id, intent.secret!);
    const candidate = {
      id,
      type: intent.type,
      tenant_id: intent.tenantId,
      identity_id: intent.identityId ?? null,
      invitation_id: intent.invitationId ?? null,
      proof_id: intent.proofId ?? null,
      recovery_id: intent.recoveryId ?? null,
      recipient: intent.recipient,
    } as Job;
    if (!(await eligible(client, candidate, intent.secret)))
      throw new CommunicationsUnavailable();
    // Same-key concurrent enqueues serialize after authority locks; differing intents cannot overwrite.
    const inserted = (
      await client.query<{ id: string }>(
        `INSERT INTO customer_mail_jobs(id,deduplication_key,type,tenant_id,identity_id,invitation_id,proof_id,recovery_id,recipient,sender,origin,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(deduplication_key) DO NOTHING RETURNING id`,
        [
          id,
          key,
          intent.type,
          intent.tenantId,
          intent.identityId ?? null,
          intent.invitationId ?? null,
          intent.proofId ?? null,
          intent.recoveryId ?? null,
          intent.recipient,
          options.sender,
          options.origin,
          lifetime,
        ],
      )
    ).rows[0];
    if (!inserted)
      return (
        await client.query<{ id: string }>(
          "SELECT id FROM customer_mail_jobs WHERE deduplication_key=$1",
          [key],
        )
      ).rows[0].id;
    if (sealed)
      await client.query(
        `INSERT INTO customer_mail_custody(job_id,key_id,nonce,ciphertext,tag,expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          id,
          sealed.keyId,
          sealed.nonce,
          sealed.ciphertext,
          sealed.tag,
          lifetime,
        ],
      );
    await mailAudit(client, id, "queued");
    return id;
  }
  async function claim() {
    writable();
    return mailTransaction(pool, async (client) => {
      const job = (
        await client.query<Job>(
          `WITH candidate AS (SELECT id FROM customer_mail_jobs WHERE (state='queued' AND next_attempt_at<=clock_timestamp()) OR (state='leased' AND lease_until<clock_timestamp()) ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE customer_mail_jobs j SET state='leased',lease_token=$1,lease_until=clock_timestamp()+interval '30 seconds',attempts=LEAST(attempts+1,5) FROM candidate c WHERE j.id=c.id RETURNING j.*`,
          [randomUUID()],
        )
      ).rows[0];
      if (job) await mailAudit(client, job.id, "claimed");
      return job ?? null;
    });
  }
  async function dispatch(jobId: string, leaseToken: string) {
    writable();
    z.uuid().parse(jobId);
    z.uuid().parse(leaseToken);
    return mailTransaction(pool, async (client) => {
      const hint = (
        await client.query<Job>(
          "SELECT * FROM customer_mail_jobs WHERE id=$1",
          [jobId],
        )
      ).rows[0];
      if (!hint) return;
      // Tenant first, then all authoritative rows; the job lock comes last.
      const allowed = await eligible(client, hint);
      const job = (
        await client.query<Job & { valid: boolean }>(
          "SELECT *,expires_at>clock_timestamp() AND lease_until>clock_timestamp() AS valid FROM customer_mail_jobs WHERE id=$1 AND state='leased' AND lease_token=$2 FOR UPDATE",
          [jobId, leaseToken],
        )
      ).rows[0];
      if (!job) return;
      async function terminal(state: "canceled" | "failed", failure: string) {
        await client.query(
          "UPDATE customer_mail_jobs SET state=$2,failure=$3,lease_token=NULL,lease_until=NULL WHERE id=$1",
          [jobId, state, failure],
        );
        await client.query(
          "DELETE FROM customer_mail_custody WHERE job_id=$1",
          [jobId],
        );
        await mailAudit(client, jobId, state);
      }
      if (!allowed || !job.valid) {
        await terminal("canceled", "ineligible");
        return;
      }
      // The fifth attempt is allowed; a recovered fifth lease must never transmit a sixth time.
      if (
        job.attempts >= 5 &&
        (
          await client.query(
            "SELECT count(*)::int n FROM customer_mail_audit WHERE job_id=$1 AND event='claimed'",
            [jobId],
          )
        ).rows[0].n > 5
      ) {
        await terminal("failed", "exhausted");
        return;
      }
      let secret: string | undefined;
      if (job.type !== "security_notification") {
        const custody = (
          await client.query(
            "SELECT key_id,nonce,ciphertext,tag FROM customer_mail_custody WHERE job_id=$1 AND expires_at>clock_timestamp()",
            [jobId],
          )
        ).rows[0];
        try {
          if (!custody) throw new Error();
          secret = options.keyring.open(job.id, {
            keyId: custody.key_id,
            nonce: custody.nonce,
            ciphertext: custody.ciphertext,
            tag: custody.tag,
          });
        } catch {
          await terminal("canceled", "custody");
          return;
        }
        if (!(await eligible(client, job, secret))) {
          await terminal("canceled", "ineligible");
          return;
        }
      }
      const message = renderCustomerMail({
        type: job.type,
        from: job.sender,
        to: job.recipient,
        origin: job.origin,
        secret,
        challengeId: job.proof_id ?? job.recovery_id ?? undefined,
      });
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timed = new Promise<MailResult>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve({ status: "transient", code: "timeout" });
        }, timeoutMs);
      });
      let result: MailResult;
      try {
        result = await Promise.race([
          options.adapter.send(
            message,
            job.deduplication_key,
            controller.signal,
          ),
          timed,
        ]);
      } catch {
        result = { status: "transient", code: "network" };
      } finally {
        clearTimeout(timer);
      }
      if (result.status === "accepted") {
        if (!/^[A-Za-z0-9_-]{1,200}$/.test(result.providerId)) {
          await terminal("failed", "rejected");
          return;
        }
        await client.query(
          "UPDATE customer_mail_jobs SET state='accepted',provider=$2,provider_id=$3,delivery='accepted',lease_token=NULL,lease_until=NULL WHERE id=$1",
          [job.id, options.adapter.kind, result.providerId],
        );
        await client.query(
          "DELETE FROM customer_mail_custody WHERE job_id=$1",
          [jobId],
        );
        await mailAudit(client, jobId, "accepted");
      } else if (result.status !== "transient" || job.attempts >= 5) {
        await terminal(
          "failed",
          result.status === "transient" ? "exhausted" : result.code,
        );
      } else {
        await client.query(
          "UPDATE customer_mail_jobs SET state='queued',failure=$2,next_attempt_at=clock_timestamp()+$3*interval '1 millisecond',lease_token=NULL,lease_until=NULL WHERE id=$1",
          [job.id, result.code, retryDelay(job.attempts)],
        );
        await mailAudit(client, jobId, "retried");
      }
    });
  }
  return {
    enqueue,
    claim,
    dispatch,
    async runOne() {
      const job = await claim();
      if (job) await dispatch(job.id, job.lease_token);
      return job?.id ?? null;
    },
    async issued(
      client: PoolClient,
      value: {
        invitation: {
          id: string;
          tenant_id: string;
          recipient_email: string;
          expires_at: Date;
        };
        token: string;
      },
    ) {
      const i = value.invitation;
      await enqueue(client, {
        type: "invitation",
        tenantId: i.tenant_id,
        invitationId: i.id,
        recipient: i.recipient_email,
        expiresAt: i.expires_at,
        secret: value.token,
      });
    },
    async proof(
      client: PoolClient,
      value: {
        invitationId: string;
        tenantId: string;
        recipient: string;
        challengeId: string;
        proof: string;
        expiresAt: Date;
      },
    ) {
      await enqueue(client, {
        type: "email_proof",
        tenantId: value.tenantId,
        invitationId: value.invitationId,
        proofId: value.challengeId,
        recipient: value.recipient,
        expiresAt: value.expiresAt,
        secret: value.proof,
      });
    },
  };
}
