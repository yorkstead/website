import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { parseMigration } from "@/scripts/migration-plan";
import { createSystemDirectoryService } from "@/lib/system-directory-service";
import type { SystemDirectoryInput } from "@/lib/system-directory";

const configured=process.env.TEST_DATABASE_URL;
let parsedURL:URL|null=null;try{parsedURL=configured?new URL(configured):null;}catch{}
const safeDatabase=Boolean(parsedURL&&["postgres:","postgresql:"].includes(parsedURL.protocol)&&["localhost","127.0.0.1","[::1]"].includes(parsedURL.hostname)&&/(^|[_-])(test|disposable)([_-]|$)/i.test(parsedURL.pathname));
const dbTest=safeDatabase?test:test.skip;
const admin=safeDatabase?new Pool({connectionString:configured}):null;
afterAll(async()=>{await admin?.end();});

const input=(name:string):SystemDirectoryInput=>({name,category:"hosting",provider:"Vercel",purpose:"Synthetic test record",dashboardURL:"https://vercel.com",documentationURL:undefined,accountIdentity:"owner@example.test",billingEntity:"Test owner",notes:"",relationships:[{kind:"project",name:"Synthetic project"}],billingCadence:"monthly",currency:"USD",amount:12,amountBasis:"actual",costConfirmation:"confirmed",renewalDate:null,pinned:false,manualHealth:"not_monitored",manualHealthSummary:"",manualHealthCheckedAt:null});

describe("CC-023 disposable PostgreSQL persistence",()=>{
 dbTest("creates, rejects duplicates, protects concurrent edits, archives, and retains immutable audit history",async()=>{
  const schema=`cc023_${randomUUID().replaceAll("-","")}`;
  const adminClient=await admin!.connect();let scoped:Pool|undefined;
  try{
   await adminClient.query(`CREATE SCHEMA ${schema}`);
   await adminClient.query(`SET search_path TO ${schema}`);
   const migration=parseMigration("0020_systems-directory.sql",await readFile("migrations/0020_systems-directory.sql","utf8"));
   for(const statement of migration.statements)await adminClient.query(statement);
   scoped=new Pool({connectionString:configured,options:`-c search_path=${schema}`,max:4});
   const service=createSystemDirectoryService(scoped);
   const name=`CC-023 ${randomUUID()}`;
   await expect(scoped.query("INSERT INTO system_directory_entries(id,tenant_id,name,category,provider) VALUES($1,'customer-tenant',$2,'other','Test')",[randomUUID(),name])).rejects.toMatchObject({code:"23514"});
   const created=await service.create(input(name),"cc023-owner");
   await expect(service.create(input(name.toLowerCase()),"cc023-owner")).rejects.toMatchObject({code:"23505"});
   const edits=await Promise.all([
    service.update(created.id,created.revision,{...input(name),purpose:"First concurrent edit"},"cc023-owner"),
    service.update(created.id,created.revision,{...input(name),purpose:"Second concurrent edit"},"cc023-owner"),
   ]);
   expect(edits.filter(Boolean)).toHaveLength(1);
   const current=edits.find(Boolean)!;
   const archived=await service.archive(current.id,current.revision,true,"cc023-owner");
   expect(archived?.archivedAt).toBeTruthy();
   const history=await service.audit(created.id);
   expect(history.map(row=>row.action)).toEqual(["archived","updated","created"]);
   expect(history.every(row=>row.actor==="cc023-owner")).toBe(true);
   await expect(scoped.query("UPDATE system_directory_audit SET action='updated' WHERE entry_id=$1",[created.id])).rejects.toMatchObject({code:"23514"});
  }finally{
   await scoped?.end();
   await adminClient.query("RESET search_path").catch(()=>undefined);
   await adminClient.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(()=>undefined);
   adminClient.release();
  }
 },30000);
});
