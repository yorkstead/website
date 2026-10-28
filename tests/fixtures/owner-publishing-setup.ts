// Disposable fixture only; never imported by application code.
import { Pool } from "pg";
import { getAuth } from "../../lib/auth";
export const publishingOwner = { email: "cc009-owner@example.test", password: "Fictional-publishing-owner-314159265" };
export async function setupOwnerPublishingFixture() {
  const url=new URL(process.env.TEST_DATABASE_URL ?? "http://invalid");
  if (process.env.NODE_ENV==='production' || process.env.DATABASE_URL!==process.env.TEST_DATABASE_URL || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) || !/(test|disposable)/.test(url.pathname) || !['postgres:','postgresql:'].includes(url.protocol)) throw new Error('Disposable loopback database required');
  const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
  try {
    for (const table of ['user','session','account','verification']) await pool.query(`CREATE TABLE IF NOT EXISTS public."${table}" (LIKE customer_auth."${table}" INCLUDING ALL)`);
    const hash=await (await getAuth().$context).password.hash(publishingOwner.password);
    await pool.query('INSERT INTO public."user"(id,name,email,"emailVerified") VALUES (\'cc009-browser-owner\',\'Fictional publishing owner\',$1,true) ON CONFLICT(id) DO NOTHING',[publishingOwner.email]);
    await pool.query('INSERT INTO public."account"(id,"userId","accountId","providerId",password,"updatedAt") VALUES (\'cc009-browser-owner\',\'cc009-browser-owner\',\'cc009-browser-owner\',\'credential\',$1,now()) ON CONFLICT(id) DO UPDATE SET password=excluded.password,"updatedAt"=now()',[hash]);
    const suffix=crypto.randomUUID(),projectId=`cc009-${suffix}`,tenant=`cc009-tenant-${suffix}`;
    await pool.query("INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional publishing tenant','active')",[tenant]);
    await pool.query("INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active')",[tenant,projectId]);
    const workspace={projects:[{id:projectId,name:'Fictional publishing project',description:'Reviewed fictional source summary',status:'Active',kind:'Software',eyebrow:'Internal',stack:[],note:'PRIVATE OWNER NOTE',updatedAt:'2026-10-01T12:00:00Z',updatedLabel:'Fictional',progress:35,accent:'cyan',delivery:{milestones:[{id:'milestone',title:'Fictional milestone',status:'in_progress',targetDate:'2026-11-15',acceptanceCriteria:'PRIVATE ACCEPTANCE'}],deliverables:[{id:'deliverable',title:'Unapproved fictional deliverable',status:'planned',description:'Draft only description'}],decisions:[],activity:[],links:[]}}],tasks:[],activity:[],notes:[{id:'update',projectId,type:'Update',content:'Reviewed fictional update',createdAt:'2026-10-01'}]};
    workspace.notes.push({id:'invalid-update',projectId,type:'Update',content:'Unsupported timestamp source candidate',createdAt:'not-a-date'});
    await pool.query("INSERT INTO workspaces(id,data) VALUES ('primary',$1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=now()",[workspace]);
    return {projectId};
  } finally {await pool.end();}
}
