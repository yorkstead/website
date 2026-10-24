// Trusted server service. No delivery implementation is installed for production.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  invitationVerifier,
  InvitationAccessError,
} from "@/lib/client-onboarding";
import { customerAuthBoundary } from "@/lib/customer-auth-config";

export type EnrollmentDelivery = {
  send(message: { recipient: string; proof: string }): Promise<void>;
};
export const unavailableEnrollmentDelivery: EnrollmentDelivery = {
  async send() {
    throw new Error("Customer verification delivery unavailable");
  },
};
const proofInput = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const digest = (value: string) =>
  createHash("sha256").update(proofInput.parse(value)).digest("hex");
export const enrollmentPassword = z.string().min(12).max(128);

export { customerEnrollmentEnabled } from "@/lib/customer-enrollment-gate";

export function createCustomerEnrollmentService(
  pool: Pick<Pool, "connect" | "query">,
  delivery: EnrollmentDelivery,
  hashPassword: (password: string) => Promise<string>,
) {
  async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async function eligible(client: PoolClient, token: string) {
    let verifier: string;
    try {
      verifier = invitationVerifier(token);
    } catch {
      throw new InvitationAccessError();
    }
    const hint = (
      await client.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM customer_invitations WHERE token_verifier=$1",
        [verifier],
      )
    ).rows[0];
    if (!hint) throw new InvitationAccessError();
    const tenant = (
      await client.query(
        "SELECT status FROM customer_tenants WHERE id=$1 FOR UPDATE",
        [hint.tenant_id],
      )
    ).rows[0];
    const invitation = (
      await client.query<{
        id: string;
        recipient_email: string;
        valid: boolean;
      }>(
        `SELECT id,recipient_email,(status='pending' AND expires_at>clock_timestamp()) AS valid
      FROM customer_invitations WHERE token_verifier=$1 FOR UPDATE`,
        [verifier],
      )
    ).rows[0];
    if (tenant?.status !== "active" || !invitation?.valid)
      throw new InvitationAccessError();
    const scope = (
      await client.query(
        `SELECT p.status FROM customer_invitation_projects s
      JOIN customer_tenant_projects p ON p.tenant_id=s.tenant_id AND p.project_id=s.project_id
      WHERE s.invitation_id=$1 ORDER BY p.project_id FOR SHARE OF p`,
        [invitation.id],
      )
    ).rows;
    if (!scope.length || scope.some((p) => p.status !== "active"))
      throw new InvitationAccessError();
    return invitation;
  }
  return {
    async limit(key: string, maximum = 10) {
      // Shared across processes; count rejected attempts too. Keys are hashes, never raw email/tokens.
      const bucket = createHash("sha256").update(key).digest("hex");
      const row = (
        await pool.query<{ attempts: number }>(
          `INSERT INTO customer_enrollment_limits(bucket,attempts) VALUES ($1,1)
        ON CONFLICT(bucket) DO UPDATE SET
        attempts=CASE WHEN customer_enrollment_limits.window_start<clock_timestamp()-interval '15 minutes' THEN 1 ELSE customer_enrollment_limits.attempts+1 END,
        window_start=CASE WHEN customer_enrollment_limits.window_start<clock_timestamp()-interval '15 minutes' THEN clock_timestamp() ELSE customer_enrollment_limits.window_start END
        RETURNING attempts`,
          [bucket],
        )
      ).rows[0];
      if (row.attempts > maximum) throw new InvitationAccessError();
    },
    async begin(token: string) {
      const proof = randomBytes(32).toString("base64url"),
        id = randomUUID();
      const invitation = await transaction(async (client) => {
        const invitation = await eligible(client, token);
        // Bound mailbox traffic across invitations for the same address.
        const bucket = createHash("sha256")
          .update(`delivery:${invitation.recipient_email}`)
          .digest("hex");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          bucket,
        ]);
        const recent = (
          await client.query(
            `SELECT 1 FROM customer_enrollment_challenges c JOIN customer_invitations i ON i.id=c.invitation_id
          WHERE i.recipient_email=$1 AND c.created_at>clock_timestamp()-interval '1 minute' LIMIT 1`,
            [invitation.recipient_email],
          )
        ).rows;
        if (recent.length) throw new InvitationAccessError();
        await client.query(
          `INSERT INTO customer_enrollment_challenges(id,invitation_id,proof_verifier,expires_at)
          VALUES ($1,$2,$3,clock_timestamp()+interval '599 seconds')`,
          [id, invitation.id, digest(proof)],
        );
        return invitation;
      });
      try {
        await delivery.send({ recipient: invitation.recipient_email, proof });
      } catch {
        await pool.query(
          "UPDATE customer_enrollment_challenges SET consumed_at=clock_timestamp() WHERE id=$1",
          [id],
        );
        throw new InvitationAccessError();
      }
      return { challengeId: id };
    },
    async complete(value: unknown) {
      const input = z
        .object({
          token: proofInput,
          challengeId: z.uuid(),
          proof: proofInput,
          password: enrollmentPassword,
        })
        .strict()
        .parse(value);
      // Better Auth's configured hasher; never invent or log a password format.
      const hash = await hashPassword(input.password);
      return transaction(async (client) => {
        const invitation = await eligible(client, input.token);
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `enrollment:${invitation.recipient_email}`,
        ]);
        const challenge = (
          await client.query(
            `UPDATE customer_enrollment_challenges SET consumed_at=clock_timestamp()
          WHERE id=$1 AND invitation_id=$2 AND proof_verifier=$3 AND consumed_at IS NULL AND expires_at>clock_timestamp() RETURNING id`,
            [input.challengeId, invitation.id, digest(input.proof)],
          )
        ).rows[0];
        if (!challenge) throw new InvitationAccessError();
        let user = (
          await client.query<{ id: string; emailVerified: boolean }>(
            'SELECT id,"emailVerified" FROM customer_auth."user" WHERE email=$1 FOR UPDATE',
            [invitation.recipient_email],
          )
        ).rows[0];
        if (user && !user.emailVerified) throw new InvitationAccessError();
        if (!user) {
          const id = randomUUID();
          user = (
            await client.query<{ id: string; emailVerified: boolean }>(
              `INSERT INTO customer_auth."user"(id,name,email,"emailVerified") VALUES ($1,'Customer',$2,true) RETURNING id,"emailVerified"`,
              [id, invitation.recipient_email],
            )
          ).rows[0];
          await client.query(
            `INSERT INTO customer_auth."account"(id,"userId","accountId","providerId",password) VALUES ($1,$1,$1,'credential',$2)`,
            [id, hash],
          );
        }
        const identity = (
          await client.query(
            "SELECT id,status,email FROM customer_identities WHERE auth_provider=$1 AND auth_subject=$2 FOR UPDATE",
            [customerAuthBoundary.identityProvider, user.id],
          )
        ).rows[0];
        if (
          identity &&
          (identity.status !== "active" ||
            identity.email !== invitation.recipient_email)
        )
          throw new InvitationAccessError();
        if (!identity)
          await client.query(
            `INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,$2,$3,$4,'active')`,
            [
              randomUUID(),
              customerAuthBoundary.identityProvider,
              user.id,
              invitation.recipient_email,
            ],
          );
        return { email: invitation.recipient_email }; // Trusted controller only; never serialize recipient to browser.
      });
    },
  };
}
