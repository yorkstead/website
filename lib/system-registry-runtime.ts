import { Pool } from "pg";
import { getAuthConfiguration } from "@/lib/auth";
import { getOwnerSession } from "@/lib/owner-session";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import { createSystemRegistryService } from "@/lib/system-registry-service";
import { createSystemRegistryAnalysisController } from "@/lib/system-registry-analysis-http";
import { createSystemRegistryController, createSystemRegistryRelationshipsController, } from "@/lib/system-registry-http";
import { createSystemRegistryBillingService } from "@/lib/system-registry-billing-service";
import { createSystemRegistryBillingController, createSystemRegistryMonitoringController, createSystemRegistryVerificationController } from "@/lib/system-registry-workflow-http";

let pool: Pool | undefined;
function dependencies() {
  const config=getAuthConfiguration();
  pool??=new Pool({connectionString:explicitVerifyFullSSL(config.databaseURL),max:2,connectionTimeoutMillis:5000,query_timeout:7000,idleTimeoutMillis:1000});
  return {verifyOwner:getOwnerSession,service:createSystemRegistryService(pool),billing:createSystemRegistryBillingService(pool),origin:new URL(config.baseURL).origin};
}
export async function handleSystemRegistry(request:Request) {
  try{return await createSystemRegistryController(dependencies())(request);}
  catch{return Response.json({error:"Systems Registry temporarily unavailable"},{status:503,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});}
}
export async function handleSystemRegistryAnalysis(request:Request) {
  try{return await createSystemRegistryAnalysisController(dependencies())(request);}
  catch{return Response.json({error:"Registry analysis temporarily unavailable"},{status:503,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});}
}
export async function handleSystemRegistryRelationships(request:Request) {
  try{return await createSystemRegistryRelationshipsController(dependencies())(request);}
  catch{return Response.json({error:"Systems Registry temporarily unavailable"},{status:503,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});}
}
export async function handleSystemRegistryVerification(request:Request) {
  try{return await createSystemRegistryVerificationController(dependencies())(request);}
  catch{return Response.json({error:"Systems Registry temporarily unavailable"},{status:503,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});}
}
export async function handleSystemRegistryMonitoring(request:Request) {
  try{return await createSystemRegistryMonitoringController(dependencies())(request);}
  catch{return Response.json({error:"Systems Registry temporarily unavailable"},{status:503,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});}
}
export async function handleSystemRegistryBilling(request:Request) {
  try{return await createSystemRegistryBillingController(dependencies())(request);}
  catch{return Response.json({error:"Systems Registry temporarily unavailable"},{status:503,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});}
}
