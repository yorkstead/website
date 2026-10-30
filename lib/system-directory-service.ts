import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { SystemDirectoryInput, SystemDirectoryEntry } from "@/lib/system-directory";

const tenant = "yorkstead-owner";
type Row = Record<string, unknown>;
function dateKey(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0,10);
  const text=String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}
function mapEntry(row: Row): SystemDirectoryEntry {
  const relationships = typeof row.relationships === "string" ? JSON.parse(row.relationships) : row.relationships;
  return {
    id: String(row.id), revision: Number(row.revision), name: String(row.name), category: row.category as SystemDirectoryEntry["category"], provider: String(row.provider),
    purpose: String(row.purpose ?? ""), dashboardURL: row.dashboard_url ? String(row.dashboard_url) : undefined, documentationURL: row.documentation_url ? String(row.documentation_url) : undefined,
    accountIdentity: String(row.account_identity ?? ""), billingEntity: String(row.billing_entity ?? ""), notes: String(row.notes ?? ""), relationships: Array.isArray(relationships) ? relationships : [],
    billingCadence: row.billing_cadence as SystemDirectoryEntry["billingCadence"], currency: String(row.currency).trim(), amount: row.amount === null ? null : Number(row.amount),
    amountBasis: row.amount_basis as SystemDirectoryEntry["amountBasis"], costConfirmation: row.cost_confirmation as SystemDirectoryEntry["costConfirmation"], renewalDate: dateKey(row.renewal_date),
    pinned: row.pinned === true, archivedAt: row.archived_at ? new Date(String(row.archived_at)).toISOString() : null,
    manualHealth: row.manual_health as SystemDirectoryEntry["manualHealth"], manualHealthSummary: String(row.manual_health_summary ?? ""), manualHealthCheckedAt: row.manual_health_checked_at ? new Date(String(row.manual_health_checked_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}
const columns = `id,revision,name,category,provider,purpose,dashboard_url,documentation_url,account_identity,billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,cost_confirmation,renewal_date,pinned,archived_at,manual_health,manual_health_summary,manual_health_checked_at,created_at,updated_at`;
const values = (input: SystemDirectoryInput) => [input.name,input.category,input.provider,input.purpose,input.dashboardURL ?? null,input.documentationURL ?? null,input.accountIdentity,input.billingEntity,input.notes,JSON.stringify(input.relationships),input.billingCadence,input.currency,input.amount,input.amountBasis,input.costConfirmation,input.renewalDate,input.pinned,input.manualHealth,input.manualHealthSummary,input.manualHealthCheckedAt];

async function transaction<T>(pool: Pool, actor: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('yorkstead.system_directory_actor',$1,true)",[actor.slice(0,255)]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}

export function createSystemDirectoryService(pool: Pool) {
  return {
    async list(includeArchived = false, search = "", category = "") {
      const params: unknown[] = [tenant];
      let where = "tenant_id=$1";
      if (!includeArchived) where += " AND archived_at IS NULL";
      if (search) { params.push(`%${search}%`); where += ` AND (name ILIKE $${params.length} OR provider ILIKE $${params.length} OR purpose ILIKE $${params.length} OR account_identity ILIKE $${params.length})`; }
      if (category) { params.push(category); where += ` AND category=$${params.length}`; }
      const result = await pool.query(`SELECT ${columns} FROM system_directory_entries WHERE ${where} ORDER BY archived_at NULLS FIRST,pinned DESC,lower(name) LIMIT 200`,params);
      return result.rows.map(mapEntry);
    },
    async audit(id: string) {
      const result = await pool.query<{id:string;entry_id:string;revision:number;action:string;actor_id:string;created_at:Date|string;before_state:Record<string,unknown>|null;after_state:Record<string,unknown>}>("SELECT id::text,entry_id::text,revision,action,actor_id,created_at,before_state,after_state FROM system_directory_audit WHERE tenant_id=$1 AND entry_id=$2 ORDER BY id DESC LIMIT 30",[tenant,id]);
      return result.rows.map((row) => {
        const before=row.before_state??{};const after=row.after_state??{};
        const changedFields=row.action==="created"?["record created"]:Object.keys(after).filter((key)=>!["id","revision","created_at","updated_at"].includes(key)&&JSON.stringify(before[key])!==JSON.stringify(after[key])).map((key)=>key.replaceAll("_"," "));
        return { id:String(row.id), entryId:String(row.entry_id), revision:Number(row.revision), action:String(row.action), actor:String(row.actor_id), at:new Date(String(row.created_at)).toISOString(), changedFields };
      });
    },
    async create(input: SystemDirectoryInput, actor: string) {
      return transaction(pool,actor,async (client) => {
        const id = randomUUID();
        const result = await client.query(`INSERT INTO system_directory_entries(id,tenant_id,name,category,provider,purpose,dashboard_url,documentation_url,account_identity,billing_entity,notes,relationships,billing_cadence,currency,amount,amount_basis,cost_confirmation,renewal_date,pinned,manual_health,manual_health_summary,manual_health_checked_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18::date,$19,$20,$21,$22::timestamptz) RETURNING ${columns}`,[id,tenant,...values(input)]);
        return mapEntry(result.rows[0]!);
      });
    },
    async update(id: string, expectedRevision: number, input: SystemDirectoryInput, actor: string) {
      return transaction(pool,actor,async (client) => {
        const result = await client.query(`UPDATE system_directory_entries SET name=$4,category=$5,provider=$6,purpose=$7,dashboard_url=$8,documentation_url=$9,account_identity=$10,billing_entity=$11,notes=$12,relationships=$13::jsonb,billing_cadence=$14,currency=$15,amount=$16,amount_basis=$17,cost_confirmation=$18,renewal_date=$19::date,pinned=$20,manual_health=$21,manual_health_summary=$22,manual_health_checked_at=$23::timestamptz
          WHERE tenant_id=$1 AND id=$2 AND revision=$3 RETURNING ${columns}`,[tenant,id,expectedRevision,...values(input)]);
        return result.rows[0] ? mapEntry(result.rows[0]) : null;
      });
    },
    async archive(id: string, expectedRevision: number, archived: boolean, actor: string) {
      return transaction(pool,actor,async (client) => {
        const result = await client.query(`UPDATE system_directory_entries SET archived_at=${archived ? "clock_timestamp()" : "NULL"} WHERE tenant_id=$1 AND id=$2 AND revision=$3 RETURNING ${columns}`,[tenant,id,expectedRevision]);
        return result.rows[0] ? mapEntry(result.rows[0]) : null;
      });
    },
  };
}
