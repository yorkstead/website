// Server domain service only. No Server Action or HTTP route is exported.
import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import { getCustomerProjectAccessForRequest } from "@/lib/customer-session-authorization";

export const documentCapabilities = Object.freeze({
  customerRead: false,
  customerApproval: false,
  upload: false,
  download: false,
  publish: false,
} as const);

export const approvalTransitions = Object.freeze({
  draft: ["pending", "cancelled", "superseded"],
  pending: ["approved", "changes_requested", "cancelled", "superseded"],
  approved: [], changes_requested: [], cancelled: [], superseded: [],
} as const);
export type ApprovalState = keyof typeof approvalTransitions;
export function canTransitionApproval(from: ApprovalState, to: ApprovalState) {
  return (approvalTransitions[from] as readonly string[] | undefined)?.includes(to) ?? false;
}

const id = z.string().trim().min(1).max(200);
const uuid = z.uuid();
const metadata = z.object({
  classification: z.string().max(100).optional(),
  reference: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
}).strict();
const versionInput = z.object({ displayName: z.string().trim().min(1).max(300), metadata: metadata.default({}) }).strict();
const createInput = versionInput.extend({ documentType: z.enum(["document", "design", "contract", "invoice", "other"]) });
const stateInput = z.enum(["draft", "pending", "approved", "changes_requested", "cancelled", "superseded"]);

// Verifier is a trusted server dependency, never request data. Production uses
// getOwnerSession; tests inject a verified fictional session without auth accounts.
export type DocumentOwnerVerifier = (headers: Headers) => Promise<{ user: { id: string } } | null>;
async function verifyOwner(headers: Headers) {
  const { getOwnerSession } = await import("@/lib/owner-session");
  return getOwnerSession(headers);
}

export class DocumentAccessError extends Error {
  constructor() { super("Document access denied"); }
}
export class DocumentConflictError extends Error {
  constructor() { super("Document state conflict"); }
}

type Scope = { tenant_id: string; project_id: string };
export type DocumentRecord = Scope & {
  id: string; document_type: "document" | "design" | "contract" | "invoice" | "other";
  display_name: string; metadata: z.infer<typeof metadata>;
  status: "draft" | "internal_review" | "approved" | "archived";
  created_at: Date; updated_at: Date;
};
export type DocumentVersionRecord = Scope & {
  id: string; document_id: string; version_number: number;
  display_name: string; metadata: z.infer<typeof metadata>; created_at: Date;
};
export type DocumentApprovalRecord = Scope & {
  id: string; document_id: string; version_id: string; status: ApprovalState;
  decision_actor_id: string | null; decision_role: "owner_internal" | null;
  decision_comment: string | null; decided_at: Date | null; created_at: Date; updated_at: Date;
};
export type DocumentAuditRecord = Scope & {
  id: string; document_id: string; version_id: string | null; entity_id: string;
  entity_type: "document" | "version" | "approval";
  event_type: "document.created" | "document.updated" | "version.created" | "approval.created" | "approval.transitioned";
  actor_id: string; actor_role: "owner_internal";
  from_state: string | null; to_state: string | null; created_at: Date;
};

export function createDocumentService(pool: Pick<Pool, "connect">, ownerVerifier: DocumentOwnerVerifier = verifyOwner) {
  async function transaction<T>(headers: Headers, work: (client: PoolClient) => Promise<T>) {
    const session = await ownerVerifier(headers);
    const actor = session?.user.id;
    if (!actor || actor !== actor.trim() || actor.length > 255) throw new DocumentAccessError();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('yorkstead.document_actor', $1, true), set_config('yorkstead.document_role', 'owner_internal', true)", [actor]);
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async function scope(client: PoolClient, projectId: string): Promise<Scope> {
    // SHARE locks prevent mapping/tenant suspension until this operation commits.
    const result = await client.query<Scope>(`SELECT p.tenant_id, p.project_id
      FROM customer_tenant_projects p JOIN customer_tenants t ON t.id = p.tenant_id
      WHERE p.project_id = $1 AND p.status = 'active' AND t.status = 'active'
      FOR SHARE OF p, t`, [id.parse(projectId)]);
    if (!result.rows[0]) throw new DocumentAccessError();
    return result.rows[0];
  }
  async function document(client: PoolClient, projectId: string, documentId: string) {
    const access = await scope(client, projectId);
    const result = await client.query<DocumentRecord>(`SELECT * FROM document_registry
      WHERE tenant_id = $1 AND project_id = $2 AND id = $3 FOR UPDATE`,
    [access.tenant_id, access.project_id, uuid.parse(documentId)]);
    if (!result.rows[0]) throw new DocumentAccessError();
    return result.rows[0];
  }
  async function latest(client: PoolClient, documentId: string) {
    const result = await client.query<DocumentVersionRecord>("SELECT * FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC LIMIT 1", [documentId]);
    return result.rows[0];
  }
  async function append(client: PoolClient, doc: DocumentRecord, input: z.infer<typeof versionInput>) {
    if (doc.status === "archived") throw new DocumentConflictError();
    const previous = await latest(client, doc.id);
    const result = await client.query<DocumentVersionRecord>(`INSERT INTO document_versions
      (tenant_id, project_id, document_id, version_number, display_name, metadata)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [doc.tenant_id, doc.project_id, doc.id, (previous?.version_number ?? 0) + 1, input.displayName, input.metadata]);
    return result.rows[0];
  }

  return {
    async createDocument(headers: Headers, projectId: string, value: unknown) {
      const input = createInput.parse(value);
      return transaction(headers, async client => {
        const access = await scope(client, projectId);
        const result = await client.query<DocumentRecord>(`INSERT INTO document_registry
          (tenant_id, project_id, document_type, display_name, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [access.tenant_id, access.project_id, input.documentType, input.displayName, input.metadata]);
        const doc = result.rows[0];
        const version = await append(client, doc, input);
        return { document: doc, version };
      });
    },
    async appendVersion(headers: Headers, projectId: string, documentId: string, value: unknown) {
      const input = versionInput.parse(value);
      return transaction(headers, async client => append(client, await document(client, projectId, documentId), input));
    },
    async setLifecycle(headers: Headers, projectId: string, documentId: string, value: unknown) {
      // Approved is reachable only through a version-specific internal decision.
      const status = z.enum(["draft", "internal_review", "archived"]).parse(value);
      return transaction(headers, async client => {
        const doc = await document(client, projectId, documentId);
        if (doc.status === status || doc.status === "archived") throw new DocumentConflictError();
        if (status !== "internal_review") {
          await client.query("UPDATE document_approval_requests SET status = 'cancelled' WHERE document_id = $1 AND status IN ('draft','pending')", [doc.id]);
        }
        return (await client.query<DocumentRecord>("UPDATE document_registry SET status = $2 WHERE id = $1 RETURNING *", [doc.id, status])).rows[0];
      });
    },
    async createApproval(headers: Headers, projectId: string, documentId: string, versionId: string) {
      uuid.parse(versionId);
      return transaction(headers, async client => {
        const doc = await document(client, projectId, documentId);
        const version = await latest(client, doc.id);
        if (!version || version.id !== versionId || doc.status === "archived") throw new DocumentConflictError();
        return (await client.query<DocumentApprovalRecord>(`INSERT INTO document_approval_requests
          (tenant_id, project_id, document_id, version_id) VALUES ($1,$2,$3,$4) RETURNING *`,
        [doc.tenant_id, doc.project_id, doc.id, versionId])).rows[0];
      });
    },
    async transitionApproval(headers: Headers, projectId: string, documentId: string, requestId: string, value: unknown, comment?: string) {
      const status = stateInput.parse(value);
      uuid.parse(requestId);
      z.string().max(2000).optional().parse(comment);
      if (comment !== undefined && !["approved", "changes_requested"].includes(status)) throw new DocumentConflictError();
      return transaction(headers, async client => {
        const doc = await document(client, projectId, documentId);
        const request = (await client.query<DocumentApprovalRecord>(`SELECT * FROM document_approval_requests
          WHERE tenant_id = $1 AND project_id = $2 AND document_id = $3 AND id = $4 FOR UPDATE`,
        [doc.tenant_id, doc.project_id, doc.id, requestId])).rows[0];
        if (!request || !canTransitionApproval(request.status, status) || doc.status === "archived") throw new DocumentConflictError();
        if (["pending", "approved", "changes_requested"].includes(status)) {
          const version = await latest(client, doc.id);
          if (version?.id !== request.version_id || doc.status !== "internal_review") throw new DocumentConflictError();
        }
        const result = (await client.query<DocumentApprovalRecord>("UPDATE document_approval_requests SET status = $2, decision_comment = $3 WHERE id = $1 RETURNING *", [requestId, status, comment ?? null])).rows[0];
        return result;
      });
    },
    async history(headers: Headers, projectId: string, documentId: string) {
      return transaction(headers, async client => {
        const doc = await document(client, projectId, documentId);
        const params = [doc.tenant_id, doc.project_id, doc.id];
        // Explicit scoped predicates even after authorization; no file content exists.
        const versions = await client.query<DocumentVersionRecord>("SELECT * FROM document_versions WHERE tenant_id=$1 AND project_id=$2 AND document_id=$3 ORDER BY version_number", params);
        const approvals = await client.query<DocumentApprovalRecord>("SELECT * FROM document_approval_requests WHERE tenant_id=$1 AND project_id=$2 AND document_id=$3 ORDER BY created_at, id", params);
        const audit = await client.query<DocumentAuditRecord>("SELECT * FROM document_audit_events WHERE tenant_id=$1 AND project_id=$2 AND document_id=$3 ORDER BY id", params);
        return { document: doc, versions: versions.rows, approvals: approvals.rows, audit: audit.rows };
      });
    },
    async customerHistory(headers: Headers, projectId: string, documentId: string) {
      // Future implementation must define a redacted customer projection first.
      // Do not expose internal comments/audit or accept a capability override.
      if (!documentCapabilities.customerRead) throw new DocumentAccessError();
      const client = await pool.connect();
      try {
        const access = await getCustomerProjectAccessForRequest(client, headers, projectId);
        if (!access || !uuid.safeParse(documentId).success) throw new DocumentAccessError();
        throw new DocumentAccessError();
      } finally { client.release(); }
    },
    async customerDecision() { throw new DocumentAccessError(); },
  };
}
