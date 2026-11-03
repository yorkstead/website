import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { SystemRegistryBillingAllocationInput, SystemRegistryBillingEvidenceInput } from "@/lib/system-registry";

const tenant="yorkstead-owner";
type Row=Record<string,unknown>;

async function withTransaction<T>(pool:Pool,actor:string,work:(client:PoolClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT set_config('yorkstead.system_directory_actor',$1,true)",[actor.slice(0,255)]);
    const result=await work(client);await client.query("COMMIT");return result;
  }catch(error){await client.query("ROLLBACK").catch(()=>undefined);throw error;}
  finally{client.release();}
}

function mapEvidence(row:Row,allocations:Row[]=[]){
  return {
    id:String(row.id),revision:Number(row.revision),providerAccountId:row.provider_account_id?String(row.provider_account_id):null,
    providerAccountName:row.provider_account_name?String(row.provider_account_name):null,
    sourceKind:String(row.source_kind),reference:String(row.evidence_reference),observedAt:new Date(String(row.observed_at)).toISOString(),
    periodStart:row.period_start?String(row.period_start).slice(0,10):null,periodEnd:row.period_end?String(row.period_end).slice(0,10):null,
    amountBasis:String(row.amount_basis),amount:row.amount===null?null:Number(row.amount),currency:row.currency?String(row.currency):null,
    payerLabel:row.payer_label?String(row.payer_label):null,status:String(row.effective_evidence_status??row.evidence_status),reviewDue:row.review_due?String(row.review_due).slice(0,10):null,
    reviewedAt:new Date(String(row.reviewed_at)).toISOString(),allocations:allocations.map(allocation=>({id:String(allocation.id),revision:Number(allocation.revision),subscriptionId:String(allocation.subscription_id),subscriptionName:String(allocation.subscription_name),amount:allocation.allocated_amount===null?null:Number(allocation.allocated_amount)})),
  };
}

export function createSystemRegistryBillingService(pool:Pool){
  return {
    async list(){
      const evidence=await pool.query<Row>(`SELECT b.*,a.name AS provider_account_name,
          CASE WHEN b.evidence_status='verified' AND b.review_due<CURRENT_DATE THEN 'stale' ELSE b.evidence_status END AS effective_evidence_status
        FROM system_directory_billing_evidence b LEFT JOIN system_directory_entries a ON a.id=b.provider_account_id AND a.tenant_id=b.tenant_id
        WHERE b.tenant_id=$1 AND b.archived_at IS NULL ORDER BY b.period_end DESC NULLS LAST,b.updated_at DESC LIMIT 300`,[tenant]);
      const ids=evidence.rows.map(row=>String(row.id));
      const allocations=ids.length?await pool.query<Row>(`SELECT l.id,l.revision,l.evidence_id,l.subscription_id,l.allocated_amount,s.name AS subscription_name
        FROM system_directory_billing_allocations l JOIN system_directory_entries s ON s.id=l.subscription_id AND s.tenant_id=l.tenant_id
        WHERE l.tenant_id=$1 AND l.archived_at IS NULL AND l.evidence_id=ANY($2::uuid[]) ORDER BY lower(s.name)`,[tenant,ids]):{rows:[] as Row[]};
      const byEvidence=new Map<string,Row[]>();for(const row of allocations.rows){const id=String(row.evidence_id);byEvidence.set(id,[...(byEvidence.get(id)??[]),row]);}
      const rollup=await pool.query<Row>(`WITH allocation_totals AS (
          SELECT evidence_id,count(*)::int AS allocation_count,count(allocated_amount)::int AS apportioned_count,COALESCE(sum(allocated_amount),0)::numeric AS allocated_amount
          FROM system_directory_billing_allocations WHERE tenant_id=$1 AND archived_at IS NULL GROUP BY evidence_id
        )
        SELECT b.amount_basis,CASE WHEN b.evidence_status='verified' AND b.review_due<CURRENT_DATE THEN 'stale' ELSE b.evidence_status END AS evidence_status,b.currency,b.period_start::text AS period_start,b.period_end::text AS period_end,count(*)::int AS source_count,
          CASE WHEN b.amount_basis='unknown' THEN NULL ELSE sum(b.amount)::text END AS amount_total,
          CASE WHEN b.amount_basis='unknown' THEN NULL ELSE sum(b.amount-COALESCE(a.allocated_amount,0))::text END AS unallocated_amount,
          count(*) FILTER(WHERE COALESCE(a.allocation_count,0)=0)::int AS unallocated_source_count,
          count(*) FILTER(WHERE COALESCE(a.allocation_count,0)>a.apportioned_count)::int AS partially_unapportioned_source_count
        FROM system_directory_billing_evidence b LEFT JOIN allocation_totals a ON a.evidence_id=b.id
        WHERE b.tenant_id=$1 AND b.archived_at IS NULL
        GROUP BY b.amount_basis,CASE WHEN b.evidence_status='verified' AND b.review_due<CURRENT_DATE THEN 'stale' ELSE b.evidence_status END,b.currency,b.period_start,b.period_end
        ORDER BY b.period_end DESC NULLS LAST,b.currency,b.amount_basis,evidence_status`,[tenant]);
      return {evidence:evidence.rows.map(row=>mapEvidence(row,byEvidence.get(String(row.id))??[])),rollup:rollup.rows.map(row=>({amountBasis:String(row.amount_basis),evidenceStatus:String(row.evidence_status),currency:row.currency?String(row.currency):null,periodStart:row.period_start?String(row.period_start):null,periodEnd:row.period_end?String(row.period_end):null,sourceCount:Number(row.source_count),amountTotal:row.amount_total===null?null:String(row.amount_total),unallocatedAmount:row.unallocated_amount===null?null:String(row.unallocated_amount),unallocatedSourceCount:Number(row.unallocated_source_count),partiallyUnapportionedSourceCount:Number(row.partially_unapportioned_source_count)}))};
    },
    async audit(evidenceId:string){
      const result=await pool.query<Row>(`SELECT id::text,revision,action,actor_id,created_at,allocation_id::text,before_state,after_state
        FROM system_directory_billing_audit WHERE tenant_id=$1 AND evidence_id=$2 ORDER BY id DESC LIMIT 50`,[tenant,evidenceId]);
      return result.rows.map(row=>({id:String(row.id),revision:Number(row.revision),action:String(row.action),actor:String(row.actor_id),at:new Date(String(row.created_at)).toISOString(),allocationId:row.allocation_id?String(row.allocation_id):null,changedFields:Object.keys((row.after_state??{}) as Row).filter(key=>JSON.stringify(((row.before_state??{}) as Row)[key])!==JSON.stringify(((row.after_state??{}) as Row)[key])).map(key=>key.replaceAll("_"," "))}));
    },
    async create(input:SystemRegistryBillingEvidenceInput,actor:string){
      return withTransaction(pool,actor,async client=>{
        const result=await client.query<Row>(`INSERT INTO system_directory_billing_evidence(id,tenant_id,provider_account_id,source_kind,evidence_reference,observed_at,period_start,period_end,amount_basis,amount,currency,payer_label,evidence_status,review_due)
          VALUES($1,$2,$3,$4,$5,$6::timestamptz,$7::date,$8::date,$9,$10,$11,$12,$13,$14::date) RETURNING *`,
        [randomUUID(),tenant,input.providerAccountId,input.sourceKind,input.reference,input.observedAt,input.periodStart,input.periodEnd,input.amountBasis,input.amount,input.currency,input.payerLabel,input.status,input.reviewDue]);
        return mapEvidence(result.rows[0]!);
      });
    },
    async updateStatus(id:string,expectedRevision:number,status:SystemRegistryBillingEvidenceInput["status"],reviewDue:string|null,actor:string){
      return withTransaction(pool,actor,async client=>{
        const result=await client.query<Row>(`UPDATE system_directory_billing_evidence SET evidence_status=$4,review_due=$5::date,reviewed_at=clock_timestamp()
          WHERE tenant_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *`,[tenant,id,expectedRevision,status,reviewDue]);
        return result.rows[0]?mapEvidence(result.rows[0]):null;
      });
    },
    async allocate(input:SystemRegistryBillingAllocationInput,actor:string){
      return withTransaction(pool,actor,async client=>{
        const source=await client.query<{amount:string|null;currency:string|null;archived_at:string|null}>(`SELECT amount::text,currency,archived_at FROM system_directory_billing_evidence WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,[tenant,input.evidenceId]);
        if(!source.rows[0]||source.rows[0].archived_at) return null;
        if(input.amount!==null&&source.rows[0].amount===null)throw Object.assign(new Error("Unknown charge amounts cannot be allocated numerically"),{code:"YS_UNKNOWN_ALLOCATION"});
        const subscription=await client.query<{id:string}>("SELECT id FROM system_directory_entries WHERE tenant_id=$1 AND id=$2 AND entity_class='subscription' AND archived_at IS NULL",[tenant,input.subscriptionId]);
        if(!subscription.rows[0])throw Object.assign(new Error("Billing allocations must reference an active subscription"),{code:"YS_NOT_SUBSCRIPTION"});
        if(input.amount!==null){
          const existing=await client.query<{amount:string}>("SELECT COALESCE(sum(allocated_amount),0)::text AS amount FROM system_directory_billing_allocations WHERE tenant_id=$1 AND evidence_id=$2 AND archived_at IS NULL",[tenant,input.evidenceId]);
          const cents=(value:string|number)=>Math.round(Number(value)*100);
          if(cents(existing.rows[0]!.amount)+cents(input.amount)>cents(source.rows[0]!.amount!))throw Object.assign(new Error("Subscription allocations cannot exceed the source charge"),{code:"YS_ALLOCATION_EXCEEDS_SOURCE"});
        }
        const result=await client.query<Row>(`INSERT INTO system_directory_billing_allocations(id,tenant_id,evidence_id,subscription_id,allocated_amount)
          VALUES($1,$2,$3,$4,$5) RETURNING id::text,revision,evidence_id::text,subscription_id::text,allocated_amount`,[randomUUID(),tenant,input.evidenceId,input.subscriptionId,input.amount]);
        return result.rows[0];
      });
    },
    async archive(id:string,expectedRevision:number,actor:string){
      return withTransaction(pool,actor,async client=>{
        const source=await client.query<{id:string}>("SELECT id FROM system_directory_billing_evidence WHERE tenant_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL FOR UPDATE",[tenant,id,expectedRevision]);
        if(!source.rows[0])return null;
        const active=await client.query<{count:number}>("SELECT count(*)::int AS count FROM system_directory_billing_allocations WHERE tenant_id=$1 AND evidence_id=$2 AND archived_at IS NULL",[tenant,id]);
        if(active.rows[0]?.count)throw Object.assign(new Error("Archive subscription allocations before archiving their source evidence"),{code:"YS_BILLING_ALLOCATIONS_ACTIVE"});
        const result=await client.query<{id:string;revision:number}>("UPDATE system_directory_billing_evidence SET archived_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING id::text,revision",[tenant,id,expectedRevision]);
        return result.rows[0]??null;
      });
    },
    async archiveAllocation(id:string,expectedRevision:number,actor:string){
      return withTransaction(pool,actor,async client=>{
        const result=await client.query<{id:string;revision:number}>("UPDATE system_directory_billing_allocations SET archived_at=clock_timestamp() WHERE tenant_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING id::text,revision",[tenant,id,expectedRevision]);
        return result.rows[0]??null;
      });
    },
  };
}
