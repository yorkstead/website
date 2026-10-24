// Server domain service. No HTTP endpoint or Server Action exports.
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { OwnerPublishingView } from "@/lib/owner-publishing-view";
import { parseWorkspace } from "@/lib/workspace-validation";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";
import type { CustomerSessionVerifier } from "@/lib/customer-session-authorization";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { getCustomerAuth } from "@/lib/customer-auth";
import {
  assembleClientProjectProjection, prepareSourceContent, publicationKind, safePublication,
  type PublicationKind, type SafePublication, type VisiblePublication,
} from "@/lib/client-project-projection";

export const clientProjectCapabilities = Object.freeze({ customerRead: false } as const);
export class ClientProjectAccessError extends Error {
  constructor() { super("Client project access denied"); }
}
export class ClientProjectConflictError extends Error {
  constructor() { super("Client project publication conflict"); }
}
const id = z.string().min(1).max(200).refine(v => v === v.trim());
const revision = z.number().int().positive();
const preparation = z.object({ kind: publicationKind, sourceId: id, includeDescription: z.boolean().default(false), expectedRevision: z.number().int().nonnegative() }).strict();
export type PublicationRecord = {
  id: string; tenant_id: string; project_id: string; kind: PublicationKind;
  source_id: string; payload: SafePublication; source_digest: string | null;
  state: "private" | "draft" | "approved" | "withdrawn"; revision: number;
  decided_by: string | null; decided_at: Date | null;
};
async function ownerSession(headers: Headers) {
  const { getOwnerSession } = await import("@/lib/owner-session");
  return getOwnerSession(headers);
}

export function createClientProjectPublicationService(pool: Pick<Pool, "connect">, verifyOwner: DocumentOwnerVerifier = ownerSession) {
  async function transaction<T>(headers: Headers, work: (client: PoolClient) => Promise<T>) {
    const actor = (await verifyOwner(headers))?.user.id;
    if (!actor || actor !== actor.trim() || actor.length > 255) throw new ClientProjectAccessError();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('yorkstead.publication_actor',$1,true)", [actor]);
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async function source(client: PoolClient) {
    const row = (await client.query<{ data: unknown; digest: string }>("SELECT data,md5(data::text) AS digest FROM workspaces WHERE id='primary' FOR UPDATE")).rows[0];
    const workspace = row && parseWorkspace(row.data);
    if (!workspace) throw new ClientProjectAccessError();
    return { workspace, digest: row.digest };
  }
  async function scope(client: PoolClient, projectId: string, active = true) {
    const row = (await client.query<{ tenant_id: string }>(`SELECT p.tenant_id FROM customer_tenant_projects p
      JOIN customer_tenants t ON t.id=p.tenant_id WHERE p.project_id=$1
      AND (NOT $2::boolean OR (p.status='active' AND t.status='active')) FOR SHARE OF p,t`, [id.parse(projectId), active])).rows[0];
    if (!row) throw new ClientProjectAccessError();
    return row.tenant_id;
  }
  async function record(client: PoolClient, tenant: string, project: string, publicationId: string) {
    const row = (await client.query<PublicationRecord>(`SELECT * FROM client_project_publications
      WHERE tenant_id=$1 AND project_id=$2 AND id=$3 FOR UPDATE`, [tenant, project, z.uuid().parse(publicationId)])).rows[0];
    if (!row) throw new ClientProjectAccessError();
    return row;
  }
  return {
    async publishingWorkspace(headers: Headers, projectId?: string): Promise<OwnerPublishingView> {
      if (projectId !== undefined) id.parse(projectId);
      return transaction(headers, async client => {
        // Same lock order as preparation/approval: persisted source, then scope.
        const persisted = (await client.query<{ data: unknown; digest: string }>("SELECT data,md5(data::text) AS digest FROM workspaces WHERE id='primary' FOR UPDATE")).rows[0];
        const workspace = persisted ? parseWorkspace(persisted.data) : null;
        if (persisted && !workspace) throw new ClientProjectAccessError();
        const retained = (await client.query<{ project_id: string }>("SELECT DISTINCT project_id FROM client_project_publications ORDER BY project_id")).rows;
        const projects = (workspace?.projects ?? []).map(p => ({ id: p.id, name: p.name, persisted: true }));
        for (const row of retained) if (!projects.some(p => p.id === row.project_id)) projects.push({ id: row.project_id, name: `Removed project · ${row.project_id}`, persisted: false });
        if (!projectId) return { projects, selected: null };
        const project = workspace?.projects.find(p => p.id === projectId);
        if (!projects.some(p => p.id === projectId)) throw new ClientProjectAccessError();
        const mapping = (await client.query<{ tenant_id: string; active: boolean }>(`SELECT p.tenant_id,(p.status='active' AND t.status='active') AS active
          FROM customer_tenant_projects p JOIN customer_tenants t ON t.id=p.tenant_id WHERE p.project_id=$1 FOR SHARE OF p,t`, [projectId])).rows[0];
        const canPublish = Boolean(project && mapping?.active);
        const reason = !project ? "Source project is no longer persisted. History and withdrawal remain available."
          : !mapping ? "No tenant/project mapping exists. Publishing requires a separately configured mapping."
          : !mapping.active ? "The tenant or project mapping is inactive. Publishing is unavailable." : null;
        const candidates: NonNullable<OwnerPublishingView["selected"]>["candidates"] = [];
        if (workspace && project) {
          const sources: [PublicationKind, string][] = [["project", project.id],
            ...(project.delivery?.milestones ?? []).flatMap(m => [["milestone", m.id], ...(m.targetDate ? [["date", m.id]] : [])] as [PublicationKind, string][]),
            ...(project.delivery?.deliverables ?? []).map(d => ["deliverable", d.id] as [PublicationKind, string]),
            ...(workspace.notes ?? []).filter(n => n.projectId===projectId && n.type==="Update").map(n => ["update", n.id] as [PublicationKind, string])];
          for (const [kind, sourceId] of sources) {
            const content = prepareSourceContent(workspace, projectId, kind, sourceId, true);
            if (content) candidates.push({ kind, sourceId, content, descriptionAvailable: content.kind==='project' ? Boolean(content.summary) : content.kind==='deliverable' && Boolean(content.description) });
          }
        }
        const raw = mapping ? (await client.query<PublicationRecord>("SELECT * FROM client_project_publications WHERE tenant_id=$1 AND project_id=$2 ORDER BY kind,source_id", [mapping.tenant_id, projectId])).rows : [];
        const records = raw.map(r => ({ id: r.id, sourceId: r.source_id, kind: r.kind, content: safePublication.parse(r.payload), state: r.state, revision: r.revision,
          invalidated: !persisted || r.source_digest !== persisted.digest, actor: r.decided_by, decidedAt: r.decided_at?.toISOString() ?? null }));
        const approved = canPublish ? (await client.query<VisiblePublication>(`SELECT source_id,kind,payload FROM client_project_publications
          WHERE tenant_id=$1 AND project_id=$2 AND state='approved' AND source_digest=$3 ORDER BY kind,source_id`, [mapping!.tenant_id, projectId, persisted!.digest])).rows : [];
        const preview = canPublish ? assembleClientProjectProjection(projectId, approved) : null;
        const auditRows = mapping ? (await client.query(`SELECT id::text,publication_id,revision,event,actor_id,actor_role,from_state,to_state,created_at
          FROM client_project_publication_audit WHERE tenant_id=$1 AND project_id=$2 ORDER BY id DESC LIMIT 200`, [mapping.tenant_id, projectId])).rows : [];
        const audit = auditRows.map(r => ({ id: r.id, publicationId: r.publication_id, revision: r.revision, event: r.event, actor: r.actor_id, role: r.actor_role, from: r.from_state, to: r.to_state, at: r.created_at.toISOString() }));
        return { projects, selected: { id: projectId, name: project?.name ?? `Removed project · ${projectId}`, canPublish, reason, candidates, records, preview, audit } };
      });
    },
    async prepare(headers: Headers, projectId: string, value: unknown) {
      const input = preparation.parse(value);
      return transaction(headers, async client => {
        const current = await source(client);
        const tenant = await scope(client, projectId);
        const payload = prepareSourceContent(current.workspace, projectId, input.kind, input.sourceId, input.includeDescription);
        if (!payload) throw new ClientProjectAccessError();
        const previous = (await client.query<PublicationRecord>(`SELECT * FROM client_project_publications
          WHERE tenant_id=$1 AND project_id=$2 AND kind=$3 AND source_id=$4 FOR UPDATE`, [tenant, projectId, input.kind, input.sourceId])).rows[0];
        if ((previous?.revision ?? 0) !== input.expectedRevision) throw new ClientProjectConflictError();
        if (previous) return (await client.query<PublicationRecord>(`UPDATE client_project_publications SET payload=$2,source_digest=$3,state='draft' WHERE id=$1 RETURNING *`, [previous.id, payload, current.digest])).rows[0];
        return (await client.query<PublicationRecord>(`INSERT INTO client_project_publications(tenant_id,project_id,kind,source_id,payload,source_digest,state)
          VALUES ($1,$2,$3,$4,$5,$6,'draft') RETURNING *`, [tenant, projectId, input.kind, input.sourceId, payload, current.digest])).rows[0];
      });
    },
    async approve(headers: Headers, projectId: string, publicationId: string, expectedRevision: number) {
      revision.parse(expectedRevision);
      return transaction(headers, async client => {
        const current = await source(client);
        const tenant = await scope(client, projectId);
        const row = await record(client, tenant, projectId, publicationId);
        if (row.revision !== expectedRevision || row.state !== 'draft' || row.source_digest !== current.digest ||
          !prepareSourceContent(current.workspace, projectId, row.kind, row.source_id)) throw new ClientProjectConflictError();
        return (await client.query<PublicationRecord>("UPDATE client_project_publications SET state='approved' WHERE id=$1 RETURNING *", [row.id])).rows[0];
      });
    },
    async withdraw(headers: Headers, projectId: string, publicationId: string, expectedRevision: number) {
      revision.parse(expectedRevision);
      return transaction(headers, async client => {
        // Same lock order; withdrawal remains possible after source deletion/suspension.
        await client.query("SELECT id FROM workspaces WHERE id='primary' FOR UPDATE");
        const tenant = await scope(client, projectId, false);
        const row = await record(client, tenant, projectId, publicationId);
        if (row.revision !== expectedRevision || row.state === 'withdrawn') throw new ClientProjectConflictError();
        return (await client.query<PublicationRecord>("UPDATE client_project_publications SET state='withdrawn' WHERE id=$1 RETURNING *", [row.id])).rows[0];
      });
    },
    async inspect(headers: Headers, projectId: string) {
      return transaction(headers, async client => {
        const tenant = await scope(client, projectId, false);
        const values = [tenant, projectId];
        const records = (await client.query<PublicationRecord>("SELECT * FROM client_project_publications WHERE tenant_id=$1 AND project_id=$2 ORDER BY kind,source_id", values)).rows;
        const audit = (await client.query("SELECT * FROM client_project_publication_audit WHERE tenant_id=$1 AND project_id=$2 ORDER BY id", values)).rows;
        return { records, audit };
      });
    },
  };
}

// One statement enforces authorization and publication together. No workspace data,
// internal actor/digest, audit or caller-supplied tenant is queried or serialized.
export const clientProjectProjectionQuery = `
SELECT publication.source_id,publication.kind,publication.payload
FROM customer_identities identity
JOIN customer_tenant_memberships membership ON membership.identity_id=identity.id
JOIN customer_tenants tenant ON tenant.id=membership.tenant_id
JOIN customer_tenant_projects project ON project.tenant_id=tenant.id
JOIN customer_project_grants grant_record ON grant_record.tenant_id=tenant.id
  AND grant_record.project_id=project.project_id AND grant_record.identity_id=identity.id
JOIN client_project_publications overview ON overview.tenant_id=tenant.id
  AND overview.project_id=project.project_id AND overview.kind='project'
  AND overview.source_id=project.project_id AND overview.state='approved'
JOIN client_project_publications publication ON publication.tenant_id=tenant.id
  AND publication.project_id=project.project_id AND publication.state='approved'
WHERE identity.auth_provider=$1 AND identity.auth_subject=$2 AND project.project_id=$3
  AND identity.status='active' AND membership.status='active' AND tenant.status='active'
  AND project.status='active' AND grant_record.status='active' AND grant_record.permission='view'
ORDER BY publication.kind,publication.source_id
`;

// Trusted server composition only: the verifier is never accepted in request data.
// Tests use actual isolated Better Auth sessions; there is no exposed read adapter.
export function createClientProjectReader(database: Pick<Pool, "query">, verifySession: CustomerSessionVerifier) {
  return async (headers: Headers, projectId: string) => {
    if (!id.safeParse(projectId).success) return null;
    const session = await verifySession(headers);
    const subject = session?.user.id;
    const expires = session && new Date(session.session.expiresAt).getTime();
    if (!subject || subject !== subject.trim() || !expires || expires <= Date.now()) return null;
    const result = await database.query<VisiblePublication>(clientProjectProjectionQuery, [customerAuthBoundary.identityProvider, subject, projectId]);
    return assembleClientProjectProjection(projectId, result.rows);
  };
}

export async function getClientProjectProjection(database: Pick<Pool, "query">, headers: Headers, projectId: string) {
  if (!clientProjectCapabilities.customerRead) return null;
  return createClientProjectReader(database, h => getCustomerAuth().api.getSession({ headers: h, query: { disableCookieCache: true } }))(headers, projectId);
}
