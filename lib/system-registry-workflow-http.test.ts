import { describe, expect, test } from "bun:test";
import { createSystemRegistryBillingController, createSystemRegistryMonitoringController, createSystemRegistryVerificationController } from "@/lib/system-registry-workflow-http";
import { systemRegistryBillingEvidenceSchema, systemRegistryBillingAllocationSchema } from "@/lib/system-registry";

const origin="https://yorkstead.test";const id="00000000-0000-4000-8000-000000000001";
function request(path:string,method:string,body?:unknown,requestOrigin=origin){return new Request(`${origin}${path}`,{method,headers:{origin:requestOrigin,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});}
function dependencies(overrides:Record<string,unknown>={}){
  const service={updateVerification:async()=>({id,revision:2}),recordMonitoring:async()=>({id,revision:2})};
  const billing={list:async()=>({evidence:[],rollup:[]}),audit:async()=>[],create:async()=>({id}),allocate:async()=>({id}),updateStatus:async()=>({id}),archive:async()=>({id}),archiveAllocation:async()=>({id})};
  return {verifyOwner:async()=>({user:{id:"synthetic-owner"}}),service,billing,origin,environment:{YS_SYS_001_ENABLED:"true"},...overrides} as unknown as Parameters<typeof createSystemRegistryVerificationController>[0];
}

describe("YS-SYS-001 evidence workflow HTTP boundaries",()=>{
  test("requires owner access and exact feature flag before invoking evidence reads or writes",async()=>{
    let calls=0;const base=dependencies({service:{updateVerification:async()=>{calls++;return{id,revision:2};}}});
    const anonymous=createSystemRegistryVerificationController({...base,verifyOwner:async()=>null});
    expect((await anonymous(request("/api/systems-registry/verification","POST",{}))).status).toBe(401);
    const disabled=createSystemRegistryVerificationController({...base,environment:{YS_SYS_001_ENABLED:"false"}});
    expect((await disabled(request("/api/systems-registry/verification","POST",{}))).status).toBe(404);expect(calls).toBe(0);
  });
  test("rejects unsupported proof and owner claims as verified",async()=>{
    const controller=createSystemRegistryVerificationController(dependencies());
    const malformed=await controller(request("/api/systems-registry/verification","POST",{id,expectedRevision:1,evidence:{status:"unknown",subject:"Claim",method:"provider_console",reference:"manual claim",observedAt:"2026-11-03T00:00:00Z",reviewDue:null}}));
    expect(malformed.status).toBe(400);
    const claim=await controller(request("/api/systems-registry/verification","POST",{id,expectedRevision:1,evidence:{status:"verified",subject:"Service exists",method:"owner_claim",reference:"synthetic claim",observedAt:"2026-11-03T00:00:00Z",reviewDue:null}}));
    expect(claim.status).toBe(400);
  });
  test("accepts source-backed verification and rejects forged cross-origin monitoring writes",async()=>{
    let received:unknown;
    const base=dependencies({service:{updateVerification:async(_id:string,_revision:number,evidence:unknown)=>{received=evidence;return{id,revision:2};}}});
    const verify=createSystemRegistryVerificationController(base);
    const response=await verify(request("/api/systems-registry/verification","POST",{id,expectedRevision:1,evidence:{status:"verified",subject:"Synthetic account identity",method:"provider_console",reference:"synthetic source",observedAt:"2026-11-03T00:00:00Z",reviewDue:"2026-12-03"}}));
    expect(response.status).toBe(200);expect(received).toMatchObject({status:"verified",reference:"synthetic source"});
    const monitor=createSystemRegistryMonitoringController(base);
    const crossOrigin=await monitor(request("/api/systems-registry/monitoring","POST",{id,expectedRevision:1,evidence:{outcome:"healthy",method:"local_check",reference:"synthetic",observedAt:"2026-11-03T00:00:00Z",reviewDue:null,summary:"synthetic"}},"https://attacker.test"));
    expect(crossOrigin.status).toBe(403);
  });
  test("deduplicates billing source conflicts with a safe response",async()=>{
    const controller=createSystemRegistryBillingController(dependencies({billing:{create:async()=>{throw Object.assign(new Error("internal database detail"),{code:"23505"});}}}));
    const response=await controller(request("/api/systems-registry/billing","POST",{type:"evidence",evidence:{providerAccountId:null,sourceKind:"invoice",reference:"synthetic invoice",observedAt:"2026-11-03T00:00:00Z",periodStart:null,periodEnd:null,amountBasis:"unknown",amount:null,currency:null,payerLabel:null,status:"unknown",reviewDue:null}}));
    expect(response.status).toBe(409);expect(await response.json()).toEqual({error:"This billing source/period already exists; reuse it and add a subscription allocation"});
  });
  test("keeps unknown prices empty and rejects malformed currency and fractional cents",()=>{
    const base={providerAccountId:null,sourceKind:"invoice",reference:"synthetic invoice",observedAt:"2026-11-03T00:00:00Z",periodStart:null,periodEnd:null,amountBasis:"unknown",amount:null,currency:null,payerLabel:null,status:"unknown",reviewDue:null};
    expect(systemRegistryBillingEvidenceSchema.safeParse(base).success).toBe(true);
    expect(systemRegistryBillingEvidenceSchema.safeParse({...base,amount:0}).success).toBe(false);
    expect(systemRegistryBillingEvidenceSchema.safeParse({...base,amountBasis:"actual",amount:12.345,currency:"USD"}).success).toBe(false);
    expect(systemRegistryBillingEvidenceSchema.safeParse({...base,amountBasis:"actual",amount:12.34,currency:"usd"}).success).toBe(false);
    expect(systemRegistryBillingAllocationSchema.safeParse({evidenceId:id,subscriptionId:id,amount:0.29}).success).toBe(true);
    expect(systemRegistryBillingAllocationSchema.safeParse({evidenceId:id,subscriptionId:id,amount:0.291}).success).toBe(false);
  });
  test("returns not found instead of success when the billing source is absent",async()=>{
    const controller=createSystemRegistryBillingController(dependencies({billing:{allocate:async()=>null}}));
    const response=await controller(request("/api/systems-registry/billing","POST",{type:"allocation",allocation:{evidenceId:id,subscriptionId:id,amount:1}}));
    expect(response.status).toBe(404);
  });
});
