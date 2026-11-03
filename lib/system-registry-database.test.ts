import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";
import { createSystemDirectoryService } from "@/lib/system-directory-service";
import { createSystemRegistryService } from "@/lib/system-registry-service";
import { createSystemRegistryBillingService } from "@/lib/system-registry-billing-service";
import { emptySystemDirectoryInput } from "@/lib/system-registry";
import type { SystemRegistryInput } from "@/lib/system-registry";

const configured=process.env.TEST_DATABASE_URL;
let parsed:URL|null=null;try{parsed=configured?new URL(configured):null;}catch{}
const safe=Boolean(parsed&&["postgres:","postgresql:"].includes(parsed.protocol)&&["localhost","127.0.0.1","[::1]"].includes(parsed.hostname)&&/(^|[_-])(test|disposable)([_-]|$)/i.test(parsed.pathname));
const dbTest=safe?test:test.skip;const admin=safe?new Pool({connectionString:configured}):null;
afterAll(async()=>{await admin?.end();});

async function schemaPool(adminPool:Pool,name:string,includeRegistry:boolean){
  const schema=`registry_${name}_${randomUUID().replaceAll("-","")}`;const client=await adminPool.connect();
  try{
    await client.query(`CREATE SCHEMA ${schema}`);await client.query(`SET search_path TO ${schema}`);
    const files=includeRegistry?["0020_systems-directory.sql","0023_systems-registry-foundation.sql","0024_registry-evidence-billing-monitoring.sql"]:["0020_systems-directory.sql"];
    for(const fileName of files){const migration=parseMigration(fileName,await readFile(`migrations/${fileName}`,"utf8"));for(const statement of migration.statements)await client.query(statement);}
  }catch(error){await client.query("RESET search_path").catch(()=>undefined);await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(()=>undefined);client.release();throw error;}
  await client.query("RESET search_path");client.release();
  return {schema,pool:new Pool({connectionString:configured,options:`-c search_path=${schema}`,max:2,connectionTimeoutMillis:1500})};
}
function typedInput(entityClass:SystemRegistryInput["entityClass"],name:string):SystemRegistryInput{return{entityClass,details:{...emptySystemDirectoryInput,name,provider:"Synthetic provider",purpose:`Synthetic ${entityClass}`,category:"other",billingCadence:entityClass==="subscription"?"annual":"unknown",currency:"USD",amount:entityClass==="subscription"?120:null,amountBasis:entityClass==="subscription"?"actual":"unknown",costConfirmation:entityClass==="subscription"?"confirmed":"unverified",renewalDate:entityClass==="subscription"?"2026-12-31":null},responsibleRole:"Synthetic operator",recoveryRole:"Synthetic recovery",verificationState:"unknown",provenanceKind:"unknown",provenanceReference:null,observedAt:null,monitoringConfiguration:"unknown"};}

describe("YS-SYS-001 synthetic PostgreSQL Registry",()=>{
  dbTest("supports empty start, all six classes, revision conflicts, relationships, and immutable audit",async()=>{
    const {schema,pool}=await schemaPool(admin!,"empty",true);const client=await admin!.connect();
    try{
      const service=createSystemRegistryService(pool);expect(await service.list({})).toEqual([]);
      expect(await service.analysisSnapshot()).toEqual({nodes:[],edges:[],truncated:{entries:false,relationships:false}});
      const concurrent=await Promise.all(["one","two"].map(suffix=>service.create(typedInput("provider_service",`Synthetic concurrent ${suffix}`),"registry-test-owner")));
      expect(concurrent).toHaveLength(2);
      const classes:SystemRegistryInput["entityClass"][]=["provider_service","provider_account","subscription","application_workload","infrastructure_asset","stack_component"];
      const created: Awaited<ReturnType<typeof service.create>>[]=[];
      for(const [index,entityClass] of classes.entries())created.push(await service.create(typedInput(entityClass,`Synthetic ${entityClass} ${index}`),"registry-test-owner"));
      expect(new Set(created.map(record=>record.entityClass))).toEqual(new Set(classes));
      expect(created.every(record=>record.revision===1&&record.verificationState==="unknown"&&record.links.length===0)).toBe(true);
      expect(created.find(record=>record.entityClass==="subscription")?.renewalDate).toBe("2026-12-31");
      const candidate={...typedInput("provider_account","Synthetic revised account"),verificationState:"candidate" as const,provenanceKind:"manual_entry" as const,provenanceReference:"synthetic fixture"};
      const updated=await service.update(created[1]!.id,created[1]!.revision,candidate,"registry-test-owner");expect(updated?.revision).toBe(2);expect(updated?.verificationState).toBe("candidate");
      expect(await service.update(created[1]!.id,created[1]!.revision,candidate,"registry-test-owner")).toBeNull();
      await service.updateVerification(created[1]!.id,updated!.revision,{status:"stale",subject:"Synthetic provider account evidence",method:"provider_console",reference:"synthetic stale fixture",observedAt:new Date().toISOString(),reviewDue:"2000-01-01"},"registry-test-owner");
      await service.recordMonitoring(created[3]!.id,created[3]!.revision,{outcome:"healthy",method:"local_check",reference:"synthetic stale monitor",observedAt:new Date().toISOString(),reviewDue:"2000-01-01",summary:"Synthetic fixture"},"registry-test-owner");
      const subscription=created.find(record=>record.entityClass==="subscription")!;
      const account=created.find(record=>record.entityClass==="provider_account")!;
      const billing=createSystemRegistryBillingService(pool);
      const source=await billing.create({providerAccountId:account.id,sourceKind:"invoice",reference:"synthetic verified invoice",observedAt:new Date().toISOString(),periodStart:"2026-11-01",periodEnd:"2026-11-30",amountBasis:"actual",amount:120,currency:"USD",payerLabel:"Synthetic test payer",status:"verified",reviewDue:null},"registry-test-owner");
      await billing.allocate({evidenceId:source.id,subscriptionId:subscription.id,amount:120},"registry-test-owner");
      expect((await service.analysisSnapshot()).nodes.find(node=>node.id===subscription.id)?.billingReady).toBe(true);
      expect((await service.update(subscription.id,subscription.revision,{...typedInput("subscription",subscription.name),details:{...subscription,renewalDate:"2026-12-31"}},"registry-test-owner"))?.renewalDate).toBe("2026-12-31");
      const link=await service.createRelationship(created[3]!.id,{targetId:created[0]!.id,kind:"depends_on",verificationState:"unknown",provenanceKind:"unknown",provenanceReference:null,observedAt:null},"registry-test-owner");
      const analysis=await service.analysisSnapshot();
      expect(analysis.nodes).toHaveLength(8);
      expect(analysis.nodes.find(node=>node.id===created[1]!.id)?.verificationStatus).toBe("stale");
      expect(analysis.nodes.find(node=>node.id===created[3]!.id)?.monitoringOutcome).toBe("stale");
      expect(analysis.edges).toMatchObject([{id:link.id,sourceId:created[3]!.id,targetId:created[0]!.id,kind:"depends_on",verificationState:"unknown",endpointsPresent:true}]);
      expect(Object.keys(analysis.nodes[0]!).sort()).toEqual(["billingReady","entityClass","id","monitoringConfiguration","monitoringOutcome","monitoringReviewDue","name","recoveryRolePresent","responsibleRolePresent","revision","verificationReviewDue","verificationState","verificationStatus"].sort());
      expect(link.revision).toBe(1);expect((await service.list({entityClass:"application_workload"}))[0]?.links[0]).toMatchObject({id:link.id,targetId:created[0]!.id,kind:"depends_on"});
      expect(await service.archiveRelationship(link.id,link.revision,"registry-test-owner")).toMatchObject({revision:2});
      expect((await service.list({entityClass:"application_workload"}))[0]?.links).toEqual([]);
      expect((await service.audit(created[1]!.id)).sort((a,b)=>b.revision-a.revision).map(event=>[event.revision,event.action])).toEqual([[3,"updated"],[2,"updated"],[1,"created"]]);
      await expect(pool.query("UPDATE system_directory_audit SET action='updated' WHERE entry_id=$1",[created[1]!.id])).rejects.toMatchObject({code:"23514"});
      await expect(pool.query("DELETE FROM system_directory_relationship_audit WHERE relationship_id=$1",[link.id])).rejects.toMatchObject({code:"23514"});
    }finally{await pool.end();await client.query("RESET search_path").catch(()=>undefined);await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(()=>undefined);client.release();}
  },30000);

  dbTest("upgrades a partially populated legacy directory without assuming fixed historical counts",async()=>{
    const {schema,pool}=await schemaPool(admin!,"partial",false);const adminClient=await admin!.connect();let scoped:Pool|undefined;
    try{
      const legacy=createSystemDirectoryService(pool);const details={...emptySystemDirectoryInput,name:`Synthetic legacy ${randomUUID()}`,provider:"Synthetic vendor",category:"other" as const,purpose:"Partial-state fixture"};
      const record=await legacy.create(details,"registry-test-owner");
      const before=(await pool.query("SELECT id,revision,name,provider,account_identity,amount,archived_at FROM system_directory_entries WHERE id=$1",[record.id])).rows;
      const auditBefore=(await pool.query("SELECT id,entry_id,revision,action,actor_id,created_at,before_state,after_state FROM system_directory_audit WHERE entry_id=$1 ORDER BY id",[record.id])).rows;
      await adminClient.query(`SET search_path TO ${schema}`);for(const fileName of ["0023_systems-registry-foundation.sql","0024_registry-evidence-billing-monitoring.sql"]){const migration=parseMigration(fileName,await readFile(`migrations/${fileName}`,"utf8"));for(const statement of migration.statements)await adminClient.query(statement);}await adminClient.query("RESET search_path");
      scoped=new Pool({connectionString:configured,options:`-c search_path=${schema}`,max:2});const registry=createSystemRegistryService(scoped);
      expect((await registry.list({})).map(item=>({id:item.id,revision:item.revision,name:item.name,entityClass:item.entityClass}))).toEqual([{id:record.id,revision:record.revision,name:record.name,entityClass:"provider_service"}]);
      const [registryRecord]=await registry.list({});
      expect(registryRecord?.provenanceKind).toBe("legacy");
      const edited=await registry.update(record.id,record.revision,{...typedInput("provider_service",record.name),details:{...registryRecord!,name:`${record.name} edited`},provenanceKind:"legacy"},"registry-test-owner");
      expect(edited).toMatchObject({id:record.id,revision:record.revision+1,provenanceKind:"legacy"});
      await expect(registry.update(record.id,edited!.revision,{...typedInput("provider_service",record.name),details:{...registryRecord!,name:`${record.name} edited`}},"registry-test-owner")).rejects.toMatchObject({code:"YS_LEGACY_PROVENANCE_LOCKED"});
      await expect(registry.update(record.id,edited!.revision,{...typedInput("application_workload",record.name),details:{...registryRecord!,name:`${record.name} edited`}},"registry-test-owner")).rejects.toMatchObject({code:"YS_CLASS_LOCKED"});
      await expect(pool.query("UPDATE system_directory_entries SET legacy_directory_entry=FALSE WHERE id=$1",[record.id])).rejects.toMatchObject({code:"23514"});
      const legacyAfter=await createSystemDirectoryService(scoped).list();expect(legacyAfter.map(item=>({id:item.id,revision:item.revision,name:item.name}))).toEqual([{id:record.id,revision:record.revision+1,name:`${record.name} edited`}]);
      expect((await scoped.query("SELECT id,revision,name,provider,account_identity,amount,archived_at,legacy_directory_entry FROM system_directory_entries WHERE id=$1",[record.id])).rows[0]).toMatchObject({...before[0],revision:record.revision+1,name:`${record.name} edited`,legacy_directory_entry:true});
      const auditAfter=(await scoped.query("SELECT id,entry_id,revision,action,actor_id,created_at,before_state,after_state FROM system_directory_audit WHERE entry_id=$1 ORDER BY id",[record.id])).rows;
      expect(auditAfter.slice(0,auditBefore.length)).toEqual(auditBefore);
      expect(auditAfter.at(-1)).toMatchObject({revision:record.revision+1,action:"updated"});
    }finally{await scoped?.end();await pool.end();await adminClient.query("RESET search_path").catch(()=>undefined);await adminClient.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(()=>undefined);adminClient.release();}
  },30000);
});
