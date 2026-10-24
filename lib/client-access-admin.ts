// Trusted server only. No issuance, delivery, grant creation or reactivation operation.
import type { Pool, PoolClient } from "pg";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";
import { parsePublicationWorkspace } from "@/lib/client-project-source";
import {
  accessSelection,
  clientAccessOperation,
} from "@/lib/client-access-schema";
import type { ClientAccessView } from "@/lib/client-access-view";
export class ClientAccessDenied extends Error {
  constructor() {
    super("Client access unavailable");
  }
}
export class ClientAccessConflict extends Error {
  constructor() {
    super("Client access changed");
  }
}
const pageSize = 25;
async function ownerSession(headers: Headers) {
  const { getOwnerSession } = await import("@/lib/owner-session");
  return getOwnerSession(headers);
}
export function createClientAccessAdminService(
  pool: Pick<Pool, "connect">,
  verifyOwner: DocumentOwnerVerifier = ownerSession,
  writesEnabled = false,
) {
  async function transaction<T>(
    headers: Headers,
    write: boolean,
    work: (client: PoolClient) => Promise<T>,
  ) {
    const actor = (await verifyOwner(headers))?.user.id;
    if (
      !actor ||
      actor !== actor.trim() ||
      actor.length > 255 ||
      (write && !writesEnabled)
    )
      throw new ClientAccessDenied();
    const client = await pool.connect();
    try {
      await client.query(
        write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      if (write)
        await client.query(
          "SELECT set_config('yorkstead.access_admin_actor',$1,true),set_config('yorkstead.provisioning_actor',$1,true),set_config('yorkstead.provisioning_role','owner_internal',true)",
          [actor],
        );
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
  return {
    async inspect(
      headers: Headers,
      selection: unknown = {},
    ): Promise<ClientAccessView> {
      const input = accessSelection.parse(selection);
      return transaction(headers, false, async (client) => {
        const organizations = (
          await client.query(
            "SELECT id,name,status,admin_revision AS revision FROM customer_tenants ORDER BY id LIMIT 26 OFFSET $1",
            [input.organizationPage * pageSize],
          )
        ).rows;
        const base = {
          writesEnabled,
          organizationPage: input.organizationPage,
          organizationsMore: organizations.length > pageSize,
          organizations: organizations.slice(0, pageSize),
        };
        if (!input.tenantId) return { ...base, selected: null };
        const tenant = (
          await client.query(
            "SELECT id,name,status,admin_revision AS revision FROM customer_tenants WHERE id=$1",
            [input.tenantId],
          )
        ).rows[0];
        if (!tenant) throw new ClientAccessDenied();
        const values = [input.tenantId, input.page * pageSize];
        const source = (
          await client.query(
            "SELECT data,md5(data::text) AS digest FROM workspaces WHERE id='primary'",
          )
        ).rows[0];
        const workspace = parsePublicationWorkspace(source?.data).workspace;
        const projects = (
          await client.query(
            `SELECT m.project_id AS id,m.status,m.admin_revision AS revision,
          EXISTS(SELECT 1 FROM client_project_publications p WHERE p.tenant_id=m.tenant_id AND p.project_id=m.project_id AND p.kind='project' AND p.state='approved' AND p.source_digest=$3) AS approved,
          EXISTS(SELECT 1 FROM customer_project_grants g JOIN customer_tenant_memberships mem ON mem.tenant_id=g.tenant_id AND mem.identity_id=g.identity_id JOIN customer_identities ident ON ident.id=g.identity_id WHERE g.tenant_id=m.tenant_id AND g.project_id=m.project_id AND g.status='active' AND mem.status='active' AND ident.status='active') AS valid_access
          FROM customer_tenant_projects m WHERE m.tenant_id=$1 ORDER BY m.project_id LIMIT 26 OFFSET $2`,
            [...values, source?.digest ?? null],
          )
        ).rows;
        const identities = (
          await client.query(
            `SELECT i.id,i.email,i.status,m.status AS membership_status,m.role,m.admin_revision AS revision,
          NOT EXISTS(SELECT 1 FROM customer_project_grants g WHERE g.tenant_id=m.tenant_id AND g.identity_id=m.identity_id) AS orphaned
          FROM customer_tenant_memberships m JOIN customer_identities i ON i.id=m.identity_id
          WHERE m.tenant_id=$1 ORDER BY i.id LIMIT 26 OFFSET $2`,
            values,
          )
        ).rows;
        const grants = (
          await client.query(
            `SELECT g.project_id,g.identity_id,g.status,g.permission,g.admin_revision AS revision,
          (g.status='active' AND m.status='active' AND i.status='active' AND t.status='active' AND p.status='active') AS effective
          FROM customer_project_grants g JOIN customer_tenant_memberships m ON m.tenant_id=g.tenant_id AND m.identity_id=g.identity_id
          JOIN customer_identities i ON i.id=g.identity_id JOIN customer_tenants t ON t.id=g.tenant_id
          JOIN customer_tenant_projects p ON p.tenant_id=g.tenant_id AND p.project_id=g.project_id
          WHERE g.tenant_id=$1 ORDER BY g.project_id,g.identity_id LIMIT 26 OFFSET $2`,
            values,
          )
        ).rows;
        const invitations = (
          await client.query(
            `SELECT i.id,i.status,i.admin_revision AS revision,i.recipient_email,i.created_at,i.expires_at,i.redeemed_at,i.revoked_at,
          (i.status='pending' AND i.expires_at<=clock_timestamp()) AS expired,
          ARRAY(SELECT p.project_id FROM customer_invitation_projects p WHERE p.invitation_id=i.id AND p.tenant_id=i.tenant_id ORDER BY p.project_id LIMIT 100) AS projects
          FROM customer_invitations i WHERE i.tenant_id=$1 ORDER BY i.created_at DESC,i.id LIMIT 26 OFFSET $2`,
            values,
          )
        ).rows;
        const preparations = (
          await client.query(
            "SELECT id,recipient_email,project_ids,expires_in_seconds,created_at,status FROM client_invitation_preparations WHERE tenant_id=$1 ORDER BY created_at DESC,id LIMIT 26 OFFSET $2",
            values,
          )
        ).rows;
        const audit = (
          await client.query(
            "SELECT id::text,record_type,record_id,project_id,identity_id,from_status,to_status,revision,actor_id,created_at FROM client_access_admin_audit WHERE tenant_id=$1 ORDER BY id DESC LIMIT 26 OFFSET $2",
            values,
          )
        ).rows;
        const invitationAudit = (
          await client.query(
            "SELECT id,invitation_id,event_type,actor_id,created_at FROM customer_provisioning_audit WHERE tenant_id=$1 ORDER BY created_at DESC,id LIMIT 26 OFFSET $2",
            values,
          )
        ).rows;
        const blockers = [
          "Customer production enrollment is deliberately disabled.",
          "Customer production project access is deliberately disabled.",
          "Invitation delivery integration is unavailable; delivery status is unknown.",
        ];
        if (tenant.status !== "active") blockers.push("Tenant is inactive.");
        if (!projects.length && input.page === 0)
          blockers.push("No project mappings exist.");
        if (!identities.length && input.page === 0)
          blockers.push("No associated customer memberships exist.");
        return {
          ...base,
          selected: {
            ...tenant,
            page: input.page,
            more: [
              projects,
              identities,
              grants,
              invitations,
              preparations,
              audit,
              invitationAudit,
            ].some((r) => r.length > pageSize),
            launchReady: false,
            blockers,
            projects: projects.slice(0, pageSize).map((p) => {
              const sourceExists = Boolean(
                workspace?.projects.some((s) => s.id === p.id),
              );
              return {
                id: p.id,
                status: p.status,
                revision: p.revision,
                sourceExists,
                approvedContent: p.approved,
                blockers: [
                  ...(tenant.status !== "active" ? ["Tenant inactive"] : []),
                  ...(p.status !== "active" ? ["Mapping inactive"] : []),
                  ...(!sourceExists ? ["Source project missing"] : []),
                  ...(!p.approved
                    ? ["Current owner-approved overview missing"]
                    : []),
                  ...(!p.valid_access
                    ? [
                        "No active identity, membership and view grant configuration",
                      ]
                    : []),
                  "Customer enrollment and access disabled",
                  "Delivery unavailable",
                ],
              };
            }),
            identities: identities
              .slice(0, pageSize)
              .map((i) => ({
                id: i.id,
                email: i.email,
                status: i.status,
                membershipStatus: i.membership_status,
                role: i.role,
                revision: i.revision,
                orphaned: i.orphaned,
              })),
            grants: grants
              .slice(0, pageSize)
              .map((g) => ({
                projectId: g.project_id,
                identityId: g.identity_id,
                status: g.status,
                permission: g.permission,
                revision: g.revision,
                effective: g.effective,
              })),
            invitations: invitations
              .slice(0, pageSize)
              .map((i) => ({
                id: i.id,
                status: i.status,
                revision: i.revision,
                recipient: i.recipient_email,
                createdAt: i.created_at.toISOString(),
                expiresAt: i.expires_at.toISOString(),
                expired: i.expired,
                redeemedAt: i.redeemed_at?.toISOString() ?? null,
                revokedAt: i.revoked_at?.toISOString() ?? null,
                projects: i.projects,
              })),
            preparations: preparations
              .slice(0, pageSize)
              .map((p) => ({
                id: p.id,
                recipient: p.recipient_email,
                projects: p.project_ids,
                expiresInSeconds: p.expires_in_seconds,
                createdAt: p.created_at.toISOString(),
                status: p.status,
              })),
            audit: audit
              .slice(0, pageSize)
              .map((a) => ({
                id: a.id,
                type: a.record_type,
                recordId: a.record_id,
                projectId: a.project_id,
                identityId: a.identity_id,
                from: a.from_status,
                to: a.to_status,
                revision: a.revision,
                actor: a.actor_id,
                at: a.created_at.toISOString(),
              })),
            invitationAudit: invitationAudit
              .slice(0, pageSize)
              .map((a) => ({
                id: a.id,
                invitationId: a.invitation_id,
                event: a.event_type,
                actor: a.actor_id,
                at: a.created_at.toISOString(),
              })),
          },
        };
      });
    },
    async mutate(headers: Headers, value: unknown) {
      const input = clientAccessOperation.parse(value);
      return transaction(headers, true, async (client) => {
        // All administration serializes on tenant first, matching CC-006 issue/redeem/revoke.
        if (input.action === "createTenant") {
          const row = (
            await client.query(
              "INSERT INTO customer_tenants(id,name,status) VALUES ($1,$2,'disabled') ON CONFLICT(id) DO NOTHING RETURNING id",
              [input.tenantId, input.name],
            )
          ).rows[0];
          if (!row) throw new ClientAccessConflict();
          return;
        }
        // Mapping checks follow the existing publication source-first lock order.
        const source = ["createMapping", "archiveMapping"].includes(
          input.action,
        )
          ? (
              await client.query(
                "SELECT data FROM workspaces WHERE id='primary' FOR UPDATE",
              )
            ).rows[0]
          : null;
        const tenant = (
          await client.query(
            "SELECT status,admin_revision FROM customer_tenants WHERE id=$1 FOR UPDATE",
            [input.tenantId],
          )
        ).rows[0];
        if (!tenant) throw new ClientAccessDenied();
        if (input.action === "renameTenant") {
          if (tenant.admin_revision !== input.expectedRevision)
            throw new ClientAccessConflict();
          await client.query(
            "UPDATE customer_tenants SET name=$2,updated_at=clock_timestamp() WHERE id=$1",
            [input.tenantId, input.name],
          );
          return;
        }
        if (input.action === "createMapping") {
          if (
            !parsePublicationWorkspace(source?.data).workspace?.projects.some(
              (p) => p.id === input.projectId,
            )
          )
            throw new ClientAccessDenied();
          const row = (
            await client.query(
              "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'disabled') ON CONFLICT DO NOTHING RETURNING project_id",
              [input.tenantId, input.projectId],
            )
          ).rows[0];
          if (!row) throw new ClientAccessConflict();
          return;
        }
        if (input.action === "prepareInvitation") {
          if (tenant.status !== "active") throw new ClientAccessDenied();
          const projects = (
            await client.query(
              "SELECT project_id FROM customer_tenant_projects WHERE tenant_id=$1 AND project_id=ANY($2::text[]) AND status='active' ORDER BY project_id FOR SHARE",
              [input.tenantId, input.projectIds],
            )
          ).rows;
          if (projects.length !== input.projectIds.length)
            throw new ClientAccessDenied();
          const sorted = [...input.projectIds].sort();
          const previous = (
            await client.query(
              "SELECT tenant_id,recipient_email,project_ids,expires_in_seconds FROM client_invitation_preparations WHERE id=$1",
              [input.preparationId],
            )
          ).rows[0];
          if (previous) {
            if (
              previous.tenant_id !== input.tenantId ||
              previous.recipient_email !== input.recipientEmail ||
              JSON.stringify(previous.project_ids) !== JSON.stringify(sorted) ||
              previous.expires_in_seconds !== input.expiresInSeconds
            )
              throw new ClientAccessConflict();
            return; // Exact retry retains original configuration and audit.
          }
          await client.query(
            "INSERT INTO client_invitation_preparations(id,tenant_id,recipient_email,project_ids,expires_in_seconds) VALUES ($1,$2,$3,$4,$5)",
            [
              input.preparationId,
              input.tenantId,
              input.recipientEmail,
              sorted,
              input.expiresInSeconds,
            ],
          );
          return;
        }
        const check = (
          row: { status: string; admin_revision: number } | undefined,
          allowed: string[],
        ) => {
          if (!row) throw new ClientAccessDenied();
          if (
            row.admin_revision !== input.expectedRevision ||
            !allowed.includes(row.status)
          )
            throw new ClientAccessConflict();
        };
        if (input.action === "revokeInvitation") {
          const row = (
            await client.query(
              "SELECT status,admin_revision FROM customer_invitations WHERE tenant_id=$1 AND id=$2 FOR UPDATE",
              [input.tenantId, input.invitationId],
            )
          ).rows[0];
          check(row, ["pending"]);
          await client.query(
            "UPDATE customer_invitations SET status='revoked',revoked_by=current_setting('yorkstead.provisioning_actor'),revoked_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2",
            [input.tenantId, input.invitationId],
          );
        } else if (input.action === "revokeGrant") {
          const row = (
            await client.query(
              "SELECT status,admin_revision FROM customer_project_grants WHERE tenant_id=$1 AND project_id=$2 AND identity_id=$3 FOR UPDATE",
              [input.tenantId, input.projectId, input.identityId],
            )
          ).rows[0];
          check(row, ["active", "disabled"]);
          await client.query(
            "UPDATE customer_project_grants SET status='revoked',updated_at=clock_timestamp() WHERE tenant_id=$1 AND project_id=$2 AND identity_id=$3",
            [input.tenantId, input.projectId, input.identityId],
          );
        } else if (input.action === "suspendMembership") {
          const row = (
            await client.query(
              "SELECT status,admin_revision FROM customer_tenant_memberships WHERE tenant_id=$1 AND identity_id=$2 FOR UPDATE",
              [input.tenantId, input.identityId],
            )
          ).rows[0];
          check(row, ["active", "disabled"]);
          await client.query(
            "UPDATE customer_tenant_memberships SET status='suspended',updated_at=clock_timestamp() WHERE tenant_id=$1 AND identity_id=$2",
            [input.tenantId, input.identityId],
          );
        } else {
          const row = (
            await client.query(
              "SELECT status,admin_revision FROM customer_tenant_projects WHERE tenant_id=$1 AND project_id=$2 FOR UPDATE",
              [input.tenantId, input.projectId],
            )
          ).rows[0];
          check(row, ["active", "disabled"]);
          await client.query(
            "UPDATE customer_tenant_projects SET status='archived',updated_at=clock_timestamp() WHERE tenant_id=$1 AND project_id=$2",
            [input.tenantId, input.projectId],
          );
        }
      });
    },
  };
}
