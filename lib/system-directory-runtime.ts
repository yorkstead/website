import { Pool } from "pg";
import { getAuthConfiguration } from "@/lib/auth";
import { getOwnerSession } from "@/lib/owner-session";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import { createSystemDirectoryService } from "@/lib/system-directory-service";
import { createSystemDirectoryController, directoryJSON } from "@/lib/system-directory-http";
import { handleOperations } from "@/lib/operations-runtime";
import { getAutomationHubHealth } from "@/lib/automation-hub-health";
import { getAutomationHubData } from "@/lib/automation-hub-data";
import type { OperationsOverview } from "@/lib/operations-observability";
import type { AutomationHubDataResult } from "@/lib/automation-hub-data";
import type { AutomationHubHealth } from "@/lib/automation-hub-health";
import { staleHealth, orderExceptions, summarizeCosts, servicesLinkedToProject, type HealthObservation } from "@/lib/system-directory";

let pool:Pool|undefined;
function service() {
  const config=getAuthConfiguration();
  pool ??= new Pool({connectionString:explicitVerifyFullSSL(config.databaseURL),max:2,connectionTimeoutMillis:5000,query_timeout:7000,idleTimeoutMillis:1000});
  return { pool, api:createSystemDirectoryService(pool), origin:new URL(config.baseURL).origin };
}
export async function handleSystemDirectory(request:Request) {
  try { const current=service(); return createSystemDirectoryController({verifyOwner:getOwnerSession,service:current.api,origin:current.origin})(request); }
  catch { return directoryJSON({error:"Systems Directory temporarily unavailable"},503); }
}

const privateJSON=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});
let monitorCache:{expiresAt:number;value:Promise<{operations:OperationsOverview|null;hub:AutomationHubHealth;hubData:AutomationHubDataResult}>}|null=null;
function getMonitorSources(request:Request){
  if(monitorCache&&monitorCache.expiresAt>Date.now())return monitorCache.value;
  const value=Promise.all([handleOperations(request),getAutomationHubHealth(),getAutomationHubData(6000)]).then(async([response,hub,hubData])=>({
    operations:response.ok?await response.json() as OperationsOverview:null,hub,hubData,
  }));
  monitorCache={expiresAt:Date.now()+15_000,value};
  void value.then(()=>{if(monitorCache?.value===value)monitorCache.expiresAt=Date.now()+15_000;}).catch(()=>{if(monitorCache?.value===value)monitorCache=null;});
  return value;
}
export async function handleSystemDirectoryOverview(request:Request) {
  try {
    if (!(await getOwnerSession(request.headers))) return privateJSON({error:"Owner access required"},401);
    const current=service();
    const [sources,entries]=await Promise.all([getMonitorSources(request),current.api.list(false)]);
    const {operations,hub,hubData}=sources;
    const now=new Date();
    const observations:HealthObservation[]=[];
    if (operations) {
      for (const check of operations.checks) {
        const status=check.status==="healthy"?"healthy":check.status==="degraded"?(check.id==="database"?"down":"degraded"):check.status==="not_verified"?"not_monitored":"unknown";
        const related=servicesLinkedToProject(entries,"Yorkstead Website");
        observations.push({id:`website:${check.id}`,status,source:`Yorkstead Operations · ${check.label}`,checkedAt:check.checkedAt ?? operations.checkedAt,summary:check.summary,affected:["Yorkstead Website",...related]});
      }
    } else observations.push({id:"website:operations-unavailable",status:"unknown",source:"Yorkstead Operations API",checkedAt:null,summary:"Existing operations checks could not be read.",affected:["Yorkstead Website"]});
    observations.push({id:"hub:health",status:hub.state==="responding"?"healthy":hub.state==="degraded"?"degraded":"unknown",source:"Automation Hub static /api/health",checkedAt:hub.checkedAt,summary:hub.state==="responding"?"Static health endpoint responded; workflows and integrations were not checked.":`Static health endpoint ${hub.state}.`,affected:["Automation Hub"]});
    if(hubData.state==="available"){
      for(const activity of hubData.data.activity.items.filter(item=>item.level==="error"||["failed","failure","error"].includes(item.outcome.toLowerCase())).slice(0,10)) observations.push({id:`hub:workflow:${activity.id}`,status:"degraded",source:"Existing Automation Hub read contract · execution history",checkedAt:activity.createdAt,summary:`${activity.stage.slice(0,100)} reported ${activity.outcome.slice(0,60)}.`,affected:["Automation Hub",activity.automation.slice(0,100)]});
    } else observations.push({id:"hub:workflow-history",status:"unknown",source:"Existing Automation Hub read contract",checkedAt:hubData.checkedAt,summary:hubData.state==="not_configured"?"Workflow history is not configured for safe reads.":"Workflow history could not be read safely.",affected:["Automation Hub"]});
    for (const entry of entries) {
      const mapped=entry.relationships.filter((rel)=>rel.kind==="project").map((rel)=>rel.name);
      observations.push(staleHealth({id:`directory:${entry.id}`,status:entry.manualHealth,source:"Owner-maintained directory observation",checkedAt:entry.manualHealthCheckedAt ?? null,summary:entry.manualHealthSummary || (entry.manualHealth==="not_monitored"?"No health observation is configured.":"Owner-maintained status; not provider verified."),affected:[entry.name,...mapped]},now));
    }
    const ordered=orderExceptions(observations).slice(0,10);
    const costs=summarizeCosts(entries,now);
    const statusCounts=Object.fromEntries(["healthy","degraded","down","unknown","stale","not_monitored"].map((status)=>[status,observations.filter((item)=>item.status===status).length]));
    return privateJSON({checkedAt:now.toISOString(),observations:ordered,counts:statusCounts,costs,entryCount:entries.length});
  } catch { return privateJSON({error:"Systems overview unavailable"},503); }
}
