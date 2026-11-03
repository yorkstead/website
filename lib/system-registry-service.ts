import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { SystemDirectoryInput } from "@/lib/system-directory";
import type { SystemRegistryInput, SystemRegistryRecord, SystemRegistryRelationshipInput, SystemRegistryVerificationInput, SystemRegistryMonitoringInput } from "@/lib/system-registry";
import type { RegistryAnalysisEdge, RegistryAnalysisInput, RegistryAnalysisNode } from "@/lib/system-registry-analysis";

const tenant = "yorkstead-owner";
const entryColumns = `id,revision,name,category,provider,purpose,dashboard_url,documentation_url,account_identity,billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,cost_confirmation,renewal_date::text AS renewal_date,pinned,archived_at,manual_health,manual_health_summary,manual_health_checked_at,entity_class,responsible_role,recovery_role,verification_state,provenance_kind,provenance_reference,observed_at,confirmed_at,monitoring_configuration,verification_status,verification_subject,verification_method,verification_reference,verification_observed_at,verification_review_due::text AS verification_review_due,verification_reviewed_at,monitoring_outcome,monitoring_method,monitoring_reference,monitoring_observed_at,monitoring_review_due::text AS monitoring_review_due,monitoring_reviewed_at,monitoring_summary,created_at,updated_at`;
const detailValues = (input: SystemDirectoryInput) => [input.name,input.category,input.provider,input.purpose,input.dashboardURL ?? null,input.documentationURL ?? null,input.accountIdentity,input.billingEntity,input.notes,JSON.stringify(input.relationships),input.billingCadence,input.currency,input.amount,input.amountBasis,input.costConfirmation,input.renewalDate,input.pinned,input.manualHealth,input.manualHealthSummary,input.manualHealthCheckedAt];
type Row = Record<string, unknown>;
const utcDateKey=(value:Date)=>`${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,"0")}-${String(value.getUTCDate()).padStart(2,"0")}`;

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
  const today=utcDateKey(new Date());
  const verificationDue=row.verification_review_due?String(row.verification_review_due).slice(0,10):null;
  const monitoringDue=row.monitoring_review_due?String(row.monitoring_review_due).slice(0,10):null;
  const storedVerification=row.verification_status as SystemRegistryRecord["verificationStatus"];
  const storedMonitoring=row.monitoring_outcome as SystemRegistryRecord["monitoringOutcome"];
  return {
    ...mapDetails(row), entityClass: row.entity_class as SystemRegistryInput["entityClass"], responsibleRole: row.responsible_role as string | null,
    recoveryRole: row.recovery_role as string | null, verificationState: row.verification_state as SystemRegistryInput["verificationState"],
    provenanceKind: row.provenance_kind as SystemRegistryInput["provenanceKind"], provenanceReference: row.provenance_reference as string | null,
    observedAt: row.observed_at ? new Date(String(row.observed_at)).toISOString() : null, id: String(row.id), revision: Number(row.revision),
    confirmedAt: row.confirmed_at ? new Date(String(row.confirmed_at)).toISOString() : null, archivedAt: row.archived_at ? new Date(String(row.archived_at)).toISOString() : null,
    monitoringConfiguration: row.monitoring_configuration as SystemRegistryInput["monitoringConfiguration"],
    verificationStatus: storedVerification==="verified"&&verificationDue&&verificationDue<today?"stale":storedVerification, verificationSubject: row.verification_subject as string | null,
    verificationMethod: row.verification_method as SystemRegistryRecord["verificationMethod"], verificationReference: row.verification_reference as string | null,
    verificationObservedAt: row.verification_observed_at ? new Date(String(row.verification_observed_at)).toISOString() : null,
    verificationReviewDue: verificationDue, verificationReviewedAt: row.verification_reviewed_at ? new Date(String(row.verification_reviewed_at)).toISOString() : null,
    monitoringOutcome: storedMonitoring!=="unknown"&&storedMonitoring!=="unavailable"&&monitoringDue&&monitoringDue<today?"stale":storedMonitoring, monitoringMethod: row.monitoring_method as SystemRegistryRecord["monitoringMethod"],
    monitoringReference: row.monitoring_reference as string | null, monitoringObservedAt: row.monitoring_observed_at ? new Date(String(row.monitoring_observed_at)).toISOString() : null,
    monitoringReviewDue: monitoringDue, monitoringReviewedAt: row.monitoring_reviewed_at ? new Date(String(row.monitoring_reviewed_at)).toISOString() : null,
    monitoringSummary: String(row.monitoring_summary ?? ""),
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
    async analysisSnapshot(): Promise<RegistryAnalysisInput> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        const today = utcDateKey(new Date());
        const entriesResult = await client.query<Row>(`SELECT id::text,name,entity_class,revision,
            responsible_role IS NOT NULL AND btrim(responsible_role)<>'' AS responsible_role_present,
            recovery_role IS NOT NULL AND btrim(recovery_role)<>'' AS recovery_role_present,
            verification_state,
            CASE WHEN verification_status='verified' AND verification_review_due<$2::date THEN 'stale' ELSE verification_status END AS verification_status,
            verification_review_due::text AS verification_review_due,
            monitoring_configuration,
            CASE WHEN monitoring_outcome NOT IN ('unknown','unavailable') AND monitoring_review_due<$2::date THEN 'stale' ELSE monitoring_outcome END AS monitoring_outcome,
            monitoring_review_due::text AS monitoring_review_due
          FROM system_directory_entries WHERE tenant_id=$1 AND archived_at IS NULL ORDER BY lower(name),id LIMIT 501`, [tenant, today]);
        const allEntryRows = entriesResult.rows;
        const entryRows = allEntryRows.slice(0, 500);
        const ids = entryRows.map((row) => String(row.id));
        const edgesResult = ids.length ? await client.query<Row>(`SELECT r.id::text,r.source_entry_id::text,r.target_entry_id::text,r.relationship_kind,r.verification_state,r.provenance_kind,
              (source.id IS NOT NULL AND target.id IS NOT NULL) AS endpoints_present
            FROM system_directory_relationships r
            LEFT JOIN system_directory_entries source ON source.id=r.source_entry_id AND source.tenant_id=r.tenant_id AND source.archived_at IS NULL
            LEFT JOIN system_directory_entries target ON target.id=r.target_entry_id AND target.tenant_id=r.tenant_id AND target.archived_at IS NULL
            WHERE r.tenant_id=$1 AND r.archived_at IS NULL
              AND (r.source_entry_id=ANY($2::uuid[]) OR r.target_entry_id=ANY($2::uuid[]))
            ORDER BY r.id LIMIT 3001`, [tenant, ids]) : { rows: [] as Row[] };
        const edgeRows = edgesResult.rows.slice(0, 3000);
        const billingResult = ids.length ? await client.query<Row>(`SELECT a.subscription_id::text AS subscription_id,
              bool_or(e.evidence_status='verified' AND e.amount_basis IN ('actual','estimated') AND (e.review_due IS NULL OR e.review_due>=$3::date)) AS billing_ready
            FROM system_directory_billing_allocations a
            JOIN system_directory_billing_evidence e ON e.id=a.evidence_id AND e.tenant_id=a.tenant_id
            WHERE a.tenant_id=$1 AND a.archived_at IS NULL AND e.archived_at IS NULL AND a.subscription_id=ANY($2::uuid[])
            GROUP BY a.subscription_id`, [tenant, ids, today]) : { rows: [] as Row[] };
        const billingReady = new Map(billingResult.rows.map((row) => [String(row.subscription_id), row.billing_ready === true]));
        const nodes: RegistryAnalysisNode[] = entryRows.map((row) => ({
          id: String(row.id), name: String(row.name), entityClass: row.entity_class as RegistryAnalysisNode["entityClass"], revision: Number(row.revision),
          responsibleRolePresent: row.responsible_role_present === true, recoveryRolePresent: row.recovery_role_present === true,
          verificationState: row.verification_state as RegistryAnalysisNode["verificationState"], verificationStatus: row.verification_status as RegistryAnalysisNode["verificationStatus"],
          verificationReviewDue: row.verification_review_due ? String(row.verification_review_due).slice(0, 10) : null,
          monitoringConfiguration: row.monitoring_configuration as RegistryAnalysisNode["monitoringConfiguration"], monitoringOutcome: row.monitoring_outcome as RegistryAnalysisNode["monitoringOutcome"],
          monitoringReviewDue: row.monitoring_review_due ? String(row.monitoring_review_due).slice(0, 10) : null,
          billingReady: row.entity_class === "subscription" ? billingReady.get(String(row.id)) === true : null,
        }));
        const edges: RegistryAnalysisEdge[] = edgeRows.map((row) => ({
          id: String(row.id), sourceId: String(row.source_entry_id), targetId: String(row.target_entry_id), kind: row.relationship_kind as RegistryAnalysisEdge["kind"],
          verificationState: row.verification_state as RegistryAnalysisEdge["verificationState"], provenanceKind: String(row.provenance_kind), endpointsPresent: row.endpoints_present === true,
        }));
        await client.query("COMMIT");
        return { nodes, edges, truncated: { entries: allEntryRows.length > 500, relationships: edgesResult.rows.length > 3000 } };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally { client.release(); }
    },
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
        const result = await client.query<Row>(`INSERT INTO system_directory_entries(id,tenant_id,name,category,provider,purpose,dashboard_url,documentation_url,account_identity,billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,cost_confirmation,renewal_date,pinned,manual_health,manual_health_summary,manual_health_checked_at,entity_class,responsible_role,recovery_role,verification_state,provenance_kind,provenance_reference,observed_at,confirmed_at,legacy_directory_entry,monitoring_configuration)
          VALUES($1,$2,${Array.from({length:20},(_,i)=>`$${i+3}`).join(",")},$23,$24,$25,$26,$27,$28,$29::timestamptz,CASE WHEN $26='owner_reviewed' THEN clock_timestamp() ELSE NULL END,FALSE,$30) RETURNING ${entryColumns}`,
        [id, tenant, ...values, input.entityClass, input.responsibleRole, input.recoveryRole, input.verificationState, input.provenanceKind, input.provenanceReference, input.observedAt, input.monitoringConfiguration]);
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
        const result = await client.query<Row>(`UPDATE system_directory_entries SET name=$4,category=$5,provider=$6,purpose=$7,dashboard_url=$8,documentation_url=$9,account_identity=$10,billing_entity=$11,notes=$12,relationships=$13::jsonb,billing_cadence=$14,currency=$15,amount=$16,amount_basis=$17,cost_confirmation=$18,renewal_date=$19::date,pinned=$20,manual_health=$21,manual_health_summary=$22,manual_health_checked_at=$23::timestamptz,entity_class=$24,responsible_role=$25,recovery_role=$26,verification_state=$27,provenance_kind=CASE WHEN legacy_directory_entry THEN 'legacy' ELSE $28 END,provenance_reference=$29,observed_at=$30::timestamptz,confirmed_at=CASE WHEN $27='owner_reviewed' THEN clock_timestamp() ELSE NULL END,monitoring_configuration=$31
          WHERE tenant_id=$1 AND id=$2 AND revision=$3 RETURNING ${entryColumns}`, [tenant, id, expectedRevision, ...values, input.entityClass, input.responsibleRole, input.recoveryRole, input.verificationState, input.provenanceKind, input.provenanceReference, input.observedAt, input.monitoringConfiguration]);
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
    async updateVerification(id: string, expectedRevision: number, input: SystemRegistryVerificationInput, actor: string) {
      return transaction(pool, actor, async (client) => {
        const result = await client.query<Row>(`UPDATE system_directory_entries SET verification_status=$4,verification_subject=$5,verification_method=$6,verification_reference=$7,verification_observed_at=$8::timestamptz,verification_review_due=$9::date,verification_reviewed_at=CASE WHEN $4='unknown' THEN NULL ELSE clock_timestamp() END
          WHERE tenant_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING ${entryColumns}`,
        [tenant,id,expectedRevision,input.status,input.subject,input.method,input.reference,input.observedAt,input.reviewDue]);
        if (!result.rows[0]) return null;
        const links=await loadLinks([id],client);
        return mapRecord(result.rows[0],links.get(id)??[]);
      });
    },
    async recordMonitoring(id: string, expectedRevision: number, input: SystemRegistryMonitoringInput, actor: string) {
      return transaction(pool, actor, async (client) => {
        const result = await client.query<Row>(`UPDATE system_directory_entries SET monitoring_outcome=$4,monitoring_method=$5,monitoring_reference=$6,monitoring_observed_at=$7::timestamptz,monitoring_review_due=$8::date,monitoring_summary=$9,monitoring_reviewed_at=CASE WHEN $4='unknown' THEN NULL ELSE clock_timestamp() END
          WHERE tenant_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING ${entryColumns}`,
        [tenant,id,expectedRevision,input.outcome,input.method,input.reference,input.observedAt,input.reviewDue,input.summary]);
        if (!result.rows[0]) return null;
        const links=await loadLinks([id],client);
        return mapRecord(result.rows[0],links.get(id)??[]);
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
