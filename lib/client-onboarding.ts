// Trusted server domain only: deliberately no Server Action or HTTP adapter.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { getCustomerProjectAccess } from "@/lib/customer-portal-authorization";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";

const identifier = z.string().min(1).max(128).refine(v => v === v.trim());
const projectId = z.string().min(1).max(200).refine(v => v === v.trim());
const issueInput = z.object({
  tenantId: identifier,
  recipientEmail: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  projectIds: z.array(projectId).min(1).max(100).refine(v => new Set(v).size === v.length),
  expiresInSeconds: z.number().int().min(60).max(604800).default(86400),
}).strict();
const tokenInput = z.string().regex(/^[A-Za-z0-9_-]{43}$/).refine(v => Buffer.from(v, "base64url").toString("base64url") === v);
export function invitationVerifier(token: string) {
  return createHash("sha256").update(tokenInput.parse(token)).digest("hex");
}
export function createInvitationToken() { return randomBytes(32).toString("base64url"); }
export class InvitationAccessError extends Error {
  constructor() { super("Invitation access denied"); }
}
export type OnboardingCustomerVerifier = (headers: Headers) => Promise<{
  user: { id: string };
  session: { id: string };
} | null>;
async function ownerSession(headers: Headers) {
  const { getOwnerSession } = await import("@/lib/owner-session");
  return getOwnerSession(headers);
}
async function customerSession(headers: Headers) {
  const { getCustomerAuth } = await import("@/lib/customer-auth");
  return getCustomerAuth().api.getSession({ headers, query: { disableCookieCache: true } });
}
const publicColumns = "id, tenant_id, recipient_email, status, issued_by, revoked_by, redeemed_identity_id, created_at, expires_at, redeemed_at, revoked_at";
type Invitation = {
  id: string; tenant_id: string; recipient_email: string;
  status: "pending" | "redeemed" | "revoked" | "superseded";
  redeemed_identity_id: string | null; expires_at: Date;
};

// Verifiers and pool are trusted construction dependencies, never caller inputs.
export function createClientOnboardingService(
  pool: Pick<Pool, "connect">,
  verifyOwner: DocumentOwnerVerifier = ownerSession,
  verifyCustomer: OnboardingCustomerVerifier = customerSession,
  onIssued?: (client: PoolClient, value: { invitation: Invitation; token: string }) => Promise<void>,
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
    } finally { client.release(); }
  }
  async function actor(client: PoolClient, id: string, role: "owner_internal" | "customer") {
    await client.query("SELECT set_config('yorkstead.provisioning_actor',$1,true),set_config('yorkstead.provisioning_role',$2,true)", [id, role]);
  }
  async function owner(headers: Headers) {
    const session = await verifyOwner(headers);
    const id = session?.user.id;
    if (!id || id !== id.trim() || id.length > 255) throw new InvitationAccessError();
    return id;
  }
  async function tenant(client: PoolClient, id: string, requireActive = true) {
    const t = (await client.query<{ status: string }>("SELECT status FROM customer_tenants WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!t || (requireActive && t.status !== "active")) throw new InvitationAccessError();
  }
  async function projects(client: PoolClient, tenantId: string, ids: string[]) {
    const rows = (await client.query<{ project_id: string; status: string }>(`SELECT project_id,status FROM customer_tenant_projects
      WHERE tenant_id=$1 AND project_id=ANY($2::text[]) ORDER BY project_id FOR SHARE`, [tenantId, ids])).rows;
    if (!ids.length || rows.length !== ids.length || rows.some(p => p.status !== "active")) throw new InvitationAccessError();
  }
  async function lockInvitation(client: PoolClient, id: string) {
    const hint = (await client.query<{ tenant_id: string }>("SELECT tenant_id FROM customer_invitations WHERE id=$1", [id])).rows[0];
    if (!hint) throw new InvitationAccessError();
    // Same lock order for issue, supersede, revoke and redeem.
    await tenant(client, hint.tenant_id, false);
    const row = (await client.query<Invitation>(`SELECT ${publicColumns} FROM customer_invitations WHERE id=$1 FOR UPDATE`, [id])).rows[0];
    if (!row) throw new InvitationAccessError();
    return row;
  }
  async function scope(client: PoolClient, invitation: Invitation) {
    return (await client.query<{ project_id: string }>("SELECT project_id FROM customer_invitation_projects WHERE invitation_id=$1 ORDER BY project_id", [invitation.id])).rows.map(p => p.project_id);
  }

  return {
    async issue(headers: Headers, value: unknown) {
      const issuingActor = await owner(headers);
      const input = issueInput.parse(value);
      const token = createInvitationToken();
      return transaction(async client => {
        await actor(client, issuingActor, "owner_internal");
        await tenant(client, input.tenantId);
        await projects(client, input.tenantId, input.projectIds);
        // Reissue atomically supersedes the previous pending invitation, including expired ones.
        await client.query(`UPDATE customer_invitations SET status='superseded',revoked_by=$3,revoked_at=clock_timestamp()
          WHERE tenant_id=$1 AND recipient_email=$2 AND status='pending'`, [input.tenantId, input.recipientEmail, issuingActor]);
        const row = (await client.query<Invitation>(`INSERT INTO customer_invitations
          (tenant_id,recipient_email,token_verifier,issued_by,expires_at)
          VALUES ($1,$2,$3,$4,clock_timestamp()+$5*interval '1 second') RETURNING ${publicColumns}`,
        [input.tenantId, input.recipientEmail, invitationVerifier(token), issuingActor, input.expiresInSeconds])).rows[0];
        for (const project of [...input.projectIds].sort()) await client.query("INSERT INTO customer_invitation_projects(invitation_id,tenant_id,project_id) VALUES ($1,$2,$3)", [row.id, input.tenantId, project]);
        await onIssued?.(client, { invitation: row, token });
        return { invitation: row, token }; // Ephemeral trusted-server result; never log/serialize to a UI.
      });
    },
    async revoke(headers: Headers, invitationId: string) {
      const revokingActor = await owner(headers);
      z.uuid().parse(invitationId);
      return transaction(async client => {
        await actor(client, revokingActor, "owner_internal");
        const row = await lockInvitation(client, invitationId);
        if (row.status === "revoked") return;
        if (row.status !== "pending") throw new InvitationAccessError();
        await client.query("UPDATE customer_invitations SET status='revoked',revoked_by=$2,revoked_at=clock_timestamp() WHERE id=$1", [row.id, revokingActor]);
      });
    },
    async inspect(headers: Headers, tenantId: string) {
      await owner(headers);
      identifier.parse(tenantId);
      return transaction(async client => {
        await tenant(client, tenantId, false);
        const invitations = (await client.query(`SELECT ${publicColumns},(status='pending' AND expires_at<=clock_timestamp()) AS expired
          FROM customer_invitations WHERE tenant_id=$1 ORDER BY created_at,id`, [tenantId])).rows;
        const projectScope = (await client.query("SELECT invitation_id,project_id FROM customer_invitation_projects WHERE tenant_id=$1 ORDER BY invitation_id,project_id", [tenantId])).rows;
        const audit = (await client.query("SELECT * FROM customer_provisioning_audit WHERE tenant_id=$1 ORDER BY created_at,id", [tenantId])).rows;
        return { invitations, projectScope, audit };
      });
    },
    async redeem(headers: Headers, token: string) {
      // Malformed and unknown tokens share the same domain error and never echo input.
      let verifier: string;
      try { verifier = invitationVerifier(token); } catch { throw new InvitationAccessError(); }
      const session = await verifyCustomer(headers);
      if (!session?.session.id || !session.user.id) throw new InvitationAccessError();
      return transaction(async client => {
        const hint = (await client.query<{ id: string }>("SELECT id FROM customer_invitations WHERE token_verifier=$1", [verifier])).rows[0];
        if (!hint) throw new InvitationAccessError();
        const invitation = await lockInvitation(client, hint.id);
        if (!["pending", "redeemed"].includes(invitation.status)) throw new InvitationAccessError();
        await tenant(client, invitation.tenant_id);
        const ids = await scope(client, invitation);
        await projects(client, invitation.tenant_id, ids);
        // Revalidate the actual provider user/session in the same transaction as provisioning.
        const authenticated = (await client.query<{ email: string; emailVerified: boolean }>(`SELECT u.email,u."emailVerified"
          FROM customer_auth."session" s JOIN customer_auth."user" u ON u.id=s."userId"
          WHERE s.id=$1 AND u.id=$2 AND s."expiresAt">clock_timestamp() FOR SHARE OF s,u`, [session.session.id, session.user.id])).rows[0];
        if (!authenticated?.emailVerified || authenticated.email.trim().toLowerCase() !== invitation.recipient_email) throw new InvitationAccessError();
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`onboarding:${customerAuthBoundary.identityProvider}:${session.user.id}`]);
        let identity = (await client.query<{ id: string; status: string; email: string }>(`SELECT id,status,email FROM customer_identities
          WHERE auth_provider=$1 AND auth_subject=$2 FOR UPDATE`, [customerAuthBoundary.identityProvider, session.user.id])).rows[0];
        if (identity && (identity.status !== "active" || identity.email !== invitation.recipient_email)) throw new InvitationAccessError();
        if (invitation.status === "redeemed") {
          if (!identity || identity.id !== invitation.redeemed_identity_id) throw new InvitationAccessError();
        } else {
          if (!(await client.query<{ valid: boolean }>("SELECT expires_at>clock_timestamp() AS valid FROM customer_invitations WHERE id=$1", [invitation.id])).rows[0]?.valid) throw new InvitationAccessError();
          if (!identity) identity = (await client.query<{ id: string; status: string; email: string }>(`INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status)
            VALUES ($1,$2,$3,$4,'active') RETURNING id,status,email`, [randomUUID(), customerAuthBoundary.identityProvider, session.user.id, invitation.recipient_email])).rows[0];
        }
        if (!identity) throw new InvitationAccessError();
        const membership = (await client.query<{ status: string }>("SELECT status FROM customer_tenant_memberships WHERE tenant_id=$1 AND identity_id=$2 FOR UPDATE", [invitation.tenant_id, identity.id])).rows[0];
        if (membership && membership.status !== "active") throw new InvitationAccessError();
        if (invitation.status === "pending" && !membership) await client.query("INSERT INTO customer_tenant_memberships(tenant_id,identity_id,role,status) VALUES ($1,$2,'member','active')", [invitation.tenant_id, identity.id]);
        for (const project of ids) {
          const grant = (await client.query<{ status: string }>("SELECT status FROM customer_project_grants WHERE tenant_id=$1 AND project_id=$2 AND identity_id=$3 FOR UPDATE", [invitation.tenant_id, project, identity.id])).rows[0];
          if (grant && grant.status !== "active") throw new InvitationAccessError();
          if (invitation.status === "pending" && !grant) await client.query("INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,permission,status) VALUES ($1,$2,$3,'view','active')", [invitation.tenant_id, project, identity.id]);
          const access = await getCustomerProjectAccess(client, { provider: customerAuthBoundary.identityProvider, subject: session.user.id }, project);
          if (!access || access.tenantId !== invitation.tenant_id) throw new InvitationAccessError();
        }
        if (invitation.status === "pending") {
          await actor(client, identity.id, "customer");
          await client.query("UPDATE customer_invitations SET status='redeemed',redeemed_identity_id=$2,redeemed_at=clock_timestamp() WHERE id=$1", [invitation.id, identity.id]);
        }
        return { invitationId: invitation.id, identityId: identity.id, tenantId: invitation.tenant_id, projectIds: ids };
      });
    },
  };
}
