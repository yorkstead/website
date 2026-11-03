import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { SystemDirectoryInput } from "@/lib/system-directory";
import type { SystemRegistryInput, SystemRegistryRecord, SystemRegistryRelationshipInput } from "@/lib/system-registry";

const tenant = "yorkstead-owner";
const entryColumns = `id,revision,name,category,provider,purpose,dashboard_url,documentation_url,account_identity,billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,cost_confirmation,renewal_date::text AS renewal_date,pinned,archived_at,manual_health,manual_health_summary,manual_health_checked_at,entity_class,responsible_role,recovery_role,verification_state,provenance_kind,provenance_reference,observed_at,confirmed_at,created_at,updated_at`;
const detailValues = (input: SystemDirectoryInput) => [input.name,input.category,input.provider,input.purpose,input.dashboardURL ?? null,input.documentationURL ?? null,input.accountIdentity,input.billingEntity,input.notes,JSON.stringify(input.relationships),input.billingCadence,input.currency,input.amount,input.amountBasis,input.costConfirmation,input.renewalDate,input.pinned,input.manualHealth,input.manualHealthSummary,input.manualHealthCheckedAt];
type Row = Record<string, unknown>;

function mapDetails(row: Row): SystemDirectoryInput {
  const relationships = typeof row.relationships === "string" ? JSON.parse(row.relationships) : row.relationships;
  return {
    name: String(row.name), category: row.category as SystemDirectoryInput["category"], provider: String(row.provider), purpose: String(row.purpose ?? ""),
    dashboardURL: row.dashboard_url ? String(row.dashboard_url) : undefined, documentationURL: row.documentation_url ? String(row.documentation_url) : undefined,
    accountIdentity: String(row.account_identity ?? ""), billingEntity: String(row.billing_entity ?? ""), notes: String(row.notes ?? ""),
    relationships: Array.isArray(relationships) ? relationships : [], billingCadence: row.billing_cadence as SystemDirectoryInput["billingCadence"],
    currency: String(row.currency).trim(), amount: row.amount === null ? null : Number(row.amount), amountBasis: row.amount_basis as SystemDirectoryInput["amountBasis"],
    costConfirmation: row.cost_confirmation as SystemDirectoryInput["costConfirmation"], renewalDate: row.renewal_date ? String(row.renewal_date).slice(0, 10) : null,
    pinned: row.pinned === true, manualHealth: row.manual_health as SystemDirectoryInput["manualHealth"],
    manualHealthSummary: String(row.manual_health_summary ?? ""), manualHealthCheckedAt: row.manual_health_checked_at ? new Date(String(row.manual_health_checked_at)).toISOString() : null,
  };
}
function mapRecord(row: Row, links: SystemRegistryRecord["links"]): SystemRegistryRecord {
  return {
    ...mapDetails(row), entityClass: row.entity_class as SystemRegistryInput["entityClass"], responsibleRole: row.responsible_role as string | null,
    recoveryRole: row.recovery_role as string | null, verificationState: row.verification_state as SystemRegistryInput["verificationState"],
    provenanceKind: row.provenance_kind as SystemRegistryInput["provenanceKind"], provenanceReference: row.provenance_reference as string | null,
    observedAt: row.observed_at ? new Date(String(row.observed_at)).toISOString() : null, id: String(row.id), revision: Number(row.revision),
    confirmedAt: row.confirmed_at ? new Date(String(row.confirmed_at)).toISOString() : null, archivedAt: row.archived_at ? new Date(String(row.archived_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(), links,
  };
}
async function transaction<T>(pool: Pool, actor: string, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('yorkstead.system_directory_actor',$1,true)", [actor.slice(0, 255)]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export function createSystemRegistryService(pool: Pool) {
  async function loadLinks(entryIds: string[], connection: Pool | PoolClient = pool) {
    const result = await connection.query<Row>(`SELECT r.id,r.revision,r.source_entry_id,r.target_entry_id,r.relationship_kind,r.verification_state,r.provenance_kind,r.provenance_reference,r.observed_at,t.name AS target_name
      FROM system_directory_relationships r JOIN system_directory_entries t ON t.id=r.target_entry_id AND t.tenant_id=r.tenant_id
      WHERE r.tenant_id=$1 AND r.archived_at IS NULL AND r.source_entry_id=ANY($2::uuid[]) ORDER BY lower(t.name),r.relationship_kind`, [tenant, entryIds]);
    const links = new Map<string, SystemRegistryRecord["links"]>();
    for (const row of result.rows) {
      const sourceId = String(row.source_entry_id);
      const items = links.get(sourceId) ?? [];
      items.push({ id: String(row.id), revision: Number(row.revision), targetId: String(row.target_entry_id), targetName: String(row.target_name), kind: row.relationship_kind as SystemRegistryRelationshipInput["kind"], verificationState: row.verification_state as SystemRegistryRelationshipInput["verificationState"], provenanceKind: row.provenance_kind as SystemRegistryRelationshipInput["provenanceKind"], provenanceReference: row.provenance_reference as string | null, observedAt: row.observed_at ? new Date(String(row.observed_at)).toISOString() : null });
      links.set(sourceId, items);
    }
    return links;
  }
  async function mapRows(rows: Row[]) {
    const links = await loadLinks(rows.map((row) => String(row.id)));
    return rows.map((row) => mapRecord(row, links.get(String(row.id)) ?? []));
  }
  return {
    async list(query: { entityClass?: string; search?: string; includeArchived?: boolean }) {
      const params: unknown[] = [tenant];
      let where = "tenant_id=$1";
      if (!query.includeArchived) where += " AND archived_at IS NULL";
      if (query.entityClass) { params.push(query.entityClass); where += ` AND entity_class=$${params.length}`; }
      if (query.search) { params.push(query.search); where += ` AND (position(lower($${params.length}) in lower(name))>0 OR position(lower($${params.length}) in lower(provider))>0 OR position(lower($${params.length}) in lower(purpose))>0 OR position(lower($${params.length}) in lower(account_identity))>0)`; }
      const rows = await pool.query<Row>(`SELECT ${entryColumns} FROM system_directory_entries WHERE ${where} ORDER BY archived_at NULLS FIRST, lower(name) LIMIT 200`, params);
      return mapRows(rows.rows);
    },
    async audit(id: string) {
      const rows = await pool.query<Row>("SELECT id::text,entry_id::text,revision,action,actor_id,created_at,before_state,after_state FROM system_directory_audit WHERE tenant_id=$1 AND entry_id=$2 ORDER BY id DESC LIMIT 30", [tenant, id]);
      return rows.rows.map((row) => {
        const before = row.before_state ?? {}; const after = row.after_state ?? {};
        return { id: String(row.id), entryId: String(row.entry_id), revision: Number(row.revision), action: String(row.action), actor: String(row.actor_id), at: new Date(String(row.created_at)).toISOString(), changedFields: row.action === "created" ? ["record created"] : Object.keys(after as Row).filter((key) => !["id", "revision", "created_at", "updated_at"].includes(key) && JSON.stringify((before as Row)[key]) !== JSON.stringify((after as Row)[key])).map((key) => key.replaceAll("_", " ")) };
      });
    },
    async auditRelationship(id: string) {
      const rows = await pool.query<Row>("SELECT id::text,relationship_id::text,revision,action,actor_id,created_at,before_state,after_state FROM system_directory_relationship_audit WHERE tenant_id=$1 AND relationship_id=$2 ORDER BY id DESC LIMIT 30", [tenant, id]);
      return rows.rows.map((row) => {
        const before=row.before_state??{};const after=row.after_state??{};
        return {id:String(row.id),relationshipId:String(row.relationship_id),revision:Number(row.revision),action:String(row.action),actor:String(row.actor_id),at:new Date(String(row.created_at)).toISOString(),changedFields:row.action==="created"?["relationship created"]:Object.keys(after as Row).filter(key=>!["id","revision","created_at","updated_at"].includes(key)&&JSON.stringify((before as Row)[key])!==JSON.stringify((after as Row)[key])).map(key=>key.replaceAll("_"," "))};
      });
    },
    async create(input: SystemRegistryInput, actor: string) {
      return transaction(pool, actor, async (client) => {
        const id = randomUUID();
        const values = detailValues(input.details);
        if (input.provenanceKind === "legacy") throw Object.assign(new Error("Legacy provenance is reserved for existing Directory entries"),{code:"YS_LEGACY_PROVENANCE_LOCKED"});
        const result = await client.query<Row>(`INSERT INTO system_directory_entries(id,tenant_id,name,category,provider,purpose,dashboard_url,documentation_url,account_identity,billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,cost_confirmation,renewal_date,pinned,manual_health,manual_health_summary,manual_health_checked_at,entity_class,responsible_role,recovery_role,verification_state,provenance_kind,provenance_reference,observed_at,confirmed_at,legacy_directory_entry)
          VALUES($1,$2,${Array.from({length:20},(_,i)=>`$${i+3}`).join(",")},$23,$24,$25,$26,$27,$28,$29::timestamptz,CASE WHEN $26='owner_reviewed' THEN clock_timestamp() ELSE NULL END,FALSE) RETURNING ${entryColumns}`,
        [id, tenant, ...values, input.entityClass, input.responsibleRole, input.recoveryRole, input.verificationState, input.provenanceKind, input.provenanceReference, input.observedAt]);
        const links = await loadLinks([id], client);
        return mapRecord(result.rows[0]!, links.get(id) ?? []);
      });
    },
    async update(id: string, expectedRevision: number, input: SystemRegistryInput, actor: string) {
      return transaction(pool, actor, async (client) => {
        const current = await client.query<{entity_class:string;provenance_kind:string;legacy_directory_entry:boolean}>("SELECT entity_class,provenance_kind,legacy_directory_entry FROM system_directory_entries WHERE tenant_id=$1 AND id=$2 AND revision=$3 FOR UPDATE",[tenant,id,expectedRevision]);
        if (!current.rows[0]) return null;
        if (current.rows[0].legacy_directory_entry && input.entityClass !== "provider_service") {
          throw Object.assign(new Error("Legacy classification is locked to preserve Systems Directory compatibility"),{code:"YS_CLASS_LOCKED"});
        }
        if (current.rows[0].legacy_directory_entry && input.provenanceKind !== "legacy") throw Object.assign(new Error("Legacy provenance must be preserved on existing Directory entries"),{code:"YS_LEGACY_PROVENANCE_LOCKED"});
        if (input.provenanceKind === "legacy" && !current.rows[0].legacy_directory_entry) throw Object.assign(new Error("Legacy provenance is reserved for existing Directory entries"),{code:"YS_LEGACY_PROVENANCE_LOCKED"});
        const values = detailValues(input.details);
        const result = await client.query<Row>(`UPDATE system_directory_entries SET name=$4,category=$5,provider=$6,purpose=$7,dashboard_url=$8,documentation_url=$9,account_identity=$10,billing_entity=$11,notes=$12,relationships=$13::jsonb,billing_cadence=$14,currency=$15,amount=$16,amount_basis=$17,cost_confirmation=$18,renewal_date=$19::date,pinned=$20,manual_health=$21,manual_health_summary=$22,manual_health_checked_at=$23::timestamptz,entity_class=$24,responsible_role=$25,recovery_role=$26,verification_state=$27,provenance_kind=CASE WHEN legacy_directory_entry THEN 'legacy' ELSE $28 END,provenance_reference=$29,observed_at=$30::timestamptz,confirmed_at=CASE WHEN $27='owner_reviewed' THEN clock_timestamp() ELSE NULL END
          WHERE tenant_id=$1 AND id=$2 AND revision=$3 RETURNING ${entryColumns}`, [tenant, id, expectedRevision, ...values, input.entityClass, input.responsibleRole, input.recoveryRole, input.verificationState, input.provenanceKind, input.provenanceReference, input.observedAt]);
        if (!result.rows[0]) return null;
        const links = await loadLinks([id], client);
        return mapRecord(result.rows[0], links.get(id) ?? []);
      });
    },
    async archive(id: string, expectedRevision: number, archived: boolean, actor: string) {
      return transaction(pool, actor, async (client) => {
        const result = await client.query<Row>(`UPDATE system_directory_entries SET archived_at=${archived ? "clock_timestamp()" : "NULL"} WHERE tenant_id=$1 AND id=$2 AND revision=$3 RETURNING ${entryColumns}`, [tenant, id, expectedRevision]);
        if (!result.rows[0]) return null;
        const links = await loadLinks([id], client);
        return mapRecord(result.rows[0], links.get(id) ?? []);
      });
    },
    async createRelationship(sourceId: string, input: SystemRegistryRelationshipInput, actor: string) {
      return transaction(pool, actor, async (client) => {
        const result = await client.query<Row>(`INSERT INTO system_directory_relationships(id,tenant_id,source_entry_id,target_entry_id,relationship_kind,verification_state,provenance_kind,provenance_reference,observed_at,confirmed_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,CASE WHEN $6='owner_reviewed' THEN clock_timestamp() ELSE NULL END) RETURNING id::text,revision`, [randomUUID(), tenant, sourceId, input.targetId, input.kind, input.verificationState, input.provenanceKind, input.provenanceReference, input.observedAt]);
        return { id: String(result.rows[0]!.id), revision: Number(result.rows[0]!.revision) };
      });
    },
    async archiveRelationship(id: string, expectedRevision: number, actor: string) {
      return transaction(pool, actor, async (client) => {
        const result = await client.query<Row>("UPDATE system_directory_relationships SET archived_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING id::text,revision", [tenant, id, expectedRevision]);
        return result.rows[0] ? { id: String(result.rows[0].id), revision: Number(result.rows[0].revision) } : null;
      });
    },
  };
}
