import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";
import { createSystemRegistryBillingService } from "@/lib/system-registry-billing-service";
import { emptySystemDirectoryInput, type SystemRegistryInput } from "@/lib/system-registry";
import { createSystemRegistryService } from "@/lib/system-registry-service";

const configured=process.env.TEST_DATABASE_URL;let parsed:URL|null=null;try{parsed=configured?new URL(configured):null;}catch{}
const safe=Boolean(parsed&&["postgres:","postgresql:"].includes(parsed.protocol)&&["localhost","127.0.0.1","[::1]"].includes(parsed.hostname)&&/(^|[_-])(test|disposable)([_-]|$)/i.test(parsed.pathname));
const dbTest=safe?test:test.skip;const admin=safe?new Pool({connectionString:configured}):null;
afterAll(async()=>{await admin?.end();});
async function makeSchema(){
  const schema=`registry_issue98_${randomUUID().replaceAll("-","")}`;const client=await admin!.connect();
  try{await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET search_path TO ${schema}`);for(const file of ["0020_systems-directory.sql","0023_systems-registry-foundation.sql","0024_registry-evidence-billing-monitoring.sql"]){const migration=parseMigration(file,await readFile(`migrations/${file}`,"utf8"));for(const statement of migration.statements)await client.query(statement);}await client.query("RESET search_path");}
  catch(error){await client.query("RESET search_path").catch(()=>undefined);await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(()=>undefined);client.release();throw error;}
  client.release();return{schema,pool:new Pool({connectionString:configured,options:`-c search_path=${schema}`,max:3,connectionTimeoutMillis:2000})};
}
function input(entityClass:SystemRegistryInput["entityClass"],name:string):SystemRegistryInput{return{entityClass,details:{...emptySystemDirectoryInput,name,provider:"Synthetic vendor",purpose:`Issue 98 ${entityClass}`,category:"other",amount:null,amountBasis:"unknown",costConfirmation:"unverified"},responsibleRole:"Synthetic owner",recoveryRole:"Synthetic operator",verificationState:"unknown",provenanceKind:"unknown",provenanceReference:null,observedAt:null,monitoringConfiguration:"unknown"};}

describe("YS-SYS-001 issue 98 synthetic PostgreSQL evidence workflows",()=>{
  dbTest("records source-backed verification and keeps monitoring configuration separate from observations",async()=>{
    const {schema,pool}=await makeSchema();
    try{
      const registry=createSystemRegistryService(pool);const classes:SystemRegistryInput["entityClass"][]=["provider_service","provider_account","subscription","application_workload","infrastructure_asset","stack_component"];
      const records=[];for(const entityClass of classes)records.push(await registry.create(input(entityClass,`Synthetic ${entityClass}`),"issue98-owner"));
      expect(new Set(records.map(item=>item.entityClass))).toEqual(new Set(classes));
      const workload=records[3]!;
      const configured=await registry.update(workload.id,workload.revision,{...input(workload.entityClass,workload.name),monitoringConfiguration:"configured"},"issue98-owner");
      expect(configured).toMatchObject({monitoringConfiguration:"configured",monitoringOutcome:"unknown",monitoringReviewedAt:null});
      const observed=await registry.recordMonitoring(workload.id,configured!.revision,{outcome:"healthy",method:"provider_console",reference:"synthetic status page",observedAt:"2026-11-03T12:00:00.000Z",reviewDue:"2026-11-04",summary:"Synthetic observation only"},"issue98-owner");
      expect(observed).toMatchObject({monitoringConfiguration:"configured",monitoringOutcome:"healthy",monitoringMethod:"provider_console"});expect(observed?.monitoringReviewedAt).not.toBeNull();
      const verified=await registry.updateVerification(records[0]!.id,records[0]!.revision,{status:"verified",subject:"Provider account exists",method:"provider_console",reference:"synthetic provider console evidence",observedAt:"2026-11-03T12:00:00.000Z",reviewDue:"2026-10-01"},"issue98-owner");
      expect(verified).toMatchObject({verificationStatus:"stale",verificationSubject:"Provider account exists",verificationReference:"synthetic provider console evidence"});expect(verified?.verificationReviewedAt).not.toBeNull();
      expect((await registry.list({entityClass:"provider_service"}))[0]?.verificationStatus).toBe("stale");
      const audit=await registry.audit(workload.id);expect(audit.map(event=>event.action)).toEqual(["updated","created"]);
      const immutable=(await pool.query("SELECT * FROM system_directory_audit WHERE entry_id=$1 ORDER BY id",[workload.id])).rows;
      expect(immutable.at(-1)?.after_state).toMatchObject({monitoring_configuration:"configured"});
      await expect(pool.query("UPDATE system_directory_audit SET action='updated' WHERE entry_id=$1",[workload.id])).rejects.toMatchObject({code:"23514"});
    }finally{await pool.end();await admin!.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);}
  },30000);

  dbTest("deduplicates shared invoice sources, separates periods/bases, and prevents concurrent over-allocation",async()=>{
    const {schema,pool}=await makeSchema();
    try{
      const registry=createSystemRegistryService(pool),billing=createSystemRegistryBillingService(pool);
      const account=await registry.create(input("provider_account","Synthetic shared payer"),"issue98-owner");
      const first=await registry.create(input("subscription","Synthetic subscription one"),"issue98-owner");
      const second=await registry.create(input("subscription","Synthetic subscription two"),"issue98-owner");
      const source={providerAccountId:account.id,sourceKind:"invoice" as const,reference:"synthetic invoice 2026-10",observedAt:"2026-11-03T12:00:00.000Z",periodStart:"2026-10-01",periodEnd:"2026-10-31",amountBasis:"actual" as const,amount:120,currency:"USD",payerLabel:"Synthetic owner account",status:"unverified" as const,reviewDue:null};
      const invoice=await billing.create(source,"issue98-owner");
      await expect(billing.create(source,"issue98-owner")).rejects.toMatchObject({code:"23505"});
      await expect(billing.create({...source,reference:source.reference.toUpperCase()},"issue98-owner")).rejects.toMatchObject({code:"23505"});
      await billing.allocate({evidenceId:invoice.id,subscriptionId:first.id,amount:80},"issue98-owner");
      await billing.allocate({evidenceId:invoice.id,subscriptionId:second.id,amount:40},"issue98-owner");
      await expect(pool.query("UPDATE system_directory_entries SET entity_class='provider_service' WHERE id=$1",[account.id])).rejects.toMatchObject({code:"23514"});
      await expect(pool.query("UPDATE system_directory_entries SET entity_class='application_workload' WHERE id=$1",[first.id])).rejects.toMatchObject({code:"23514"});
      const estimate=await billing.create({...source,reference:"synthetic contract estimate",periodStart:"2026-11-01",periodEnd:"2026-11-30",amountBasis:"estimated",amount:50,status:"verified",reviewDue:"2000-01-01"},"issue98-owner");
      const unknown=await billing.create({...source,reference:"synthetic unknown charge",periodStart:"2026-12-01",periodEnd:"2026-12-31",amountBasis:"unknown",amount:null,currency:null,status:"unknown"},"issue98-owner");
      expect((await billing.list()).evidence.find(item=>item.id===invoice.id)?.allocations).toHaveLength(2);
      const firstRollup=(await billing.list()).rollup;
      expect(firstRollup.find(item=>item.amountBasis==="actual") ).toMatchObject({amountTotal:"120.00",sourceCount:1,unallocatedAmount:"0.00"});
      expect(firstRollup.find(item=>item.amountBasis==="estimated")).toMatchObject({evidenceStatus:"stale",amountTotal:"50.00",sourceCount:1,unallocatedAmount:"50.00"});
      expect(firstRollup.find(item=>item.amountBasis==="unknown")).toMatchObject({amountTotal:null,sourceCount:1,unallocatedAmount:null});
      expect((await billing.list()).evidence.find(item=>item.id===unknown.id)?.amount).toBeNull();
      const raceSource=await billing.create({...source,reference:"synthetic concurrent invoice",periodStart:"2027-01-01",periodEnd:"2027-01-31",amount:50},"issue98-owner");
      const racing=await Promise.allSettled([
        billing.allocate({evidenceId:raceSource.id,subscriptionId:first.id,amount:35},"issue98-owner"),
        billing.allocate({evidenceId:raceSource.id,subscriptionId:second.id,amount:35},"issue98-owner"),
      ]);
      expect(racing.filter(result=>result.status==="fulfilled")).toHaveLength(1);
      expect(racing.filter(result=>result.status==="rejected"&&((result.reason as {code?:string}).code==="YS_ALLOCATION_EXCEEDS_SOURCE"))).toHaveLength(1);
      await expect(billing.allocate({evidenceId:invoice.id,subscriptionId:account.id,amount:1},"issue98-owner")).rejects.toMatchObject({code:"YS_NOT_SUBSCRIPTION"});
      const audit=await billing.audit(invoice.id);expect(audit.filter(event=>event.action==="created")).toHaveLength(3);
      await expect(pool.query("DELETE FROM system_directory_billing_audit WHERE evidence_id=$1",[invoice.id])).rejects.toMatchObject({code:"23514"});
      await expect(billing.archive(invoice.id,invoice.revision,"issue98-owner")).rejects.toMatchObject({code:"YS_BILLING_ALLOCATIONS_ACTIVE"});
      expect(estimate.id).toBeTruthy();
    }finally{await pool.end();await admin!.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);}
  },30000);
});
