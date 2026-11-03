import { describe, expect, test } from "bun:test";
import { createSystemRegistryController, createSystemRegistryRelationshipsController } from "@/lib/system-registry-http";
import { emptySystemDirectoryInput, systemRegistryInputSchema } from "@/lib/system-registry";
import type { createSystemRegistryService } from "@/lib/system-registry-service";

function request(url:string,method="GET",body?:unknown){return new Request(url,{method,headers:method==="GET"?{}:{origin:"https://yorkstead.com","sec-fetch-site":"same-origin","content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});}
function setup(options:{owner?:boolean;flag?:string}={}){
  const calls:{method:string;args:unknown[]}[]=[];
  const service={
    list:async(...args:unknown[])=>{calls.push({method:"list",args});return[];},
    audit:async(...args:unknown[])=>{calls.push({method:"audit",args});return[];},
    auditRelationship:async(...args:unknown[])=>{calls.push({method:"auditRelationship",args});return[];},
    create:async(...args:unknown[])=>{calls.push({method:"create",args});return{id:"00000000-0000-4000-8000-000000000001",revision:1};},
    update:async(...args:unknown[])=>{calls.push({method:"update",args});return null;},
    archive:async(...args:unknown[])=>{calls.push({method:"archive",args});return null;},
    createRelationship:async(...args:unknown[])=>{calls.push({method:"createRelationship",args});return{id:"link",revision:1};},
    archiveRelationship:async(...args:unknown[])=>{calls.push({method:"archiveRelationship",args});return null;},
  } as unknown as ReturnType<typeof createSystemRegistryService>;
  const deps={verifyOwner:async()=>options.owner===false?null:{user:{id:"owner-test"}},service,origin:"https://yorkstead.com",environment:options.flag===undefined?{}:{YS_SYS_001_ENABLED:options.flag}};
  return {controller:createSystemRegistryController(deps),relationships:createSystemRegistryRelationshipsController(deps),calls};
}

describe("typed Systems Registry boundary",()=>{
  test("allows legacy provenance only as an unknown existing-entry value",()=>{
    const legacy={entityClass:"provider_service",details:{...emptySystemDirectoryInput,name:"Synthetic legacy",provider:"Synthetic provider"},responsibleRole:null,recoveryRole:null,verificationState:"unknown",provenanceKind:"legacy",provenanceReference:null,observedAt:null};
    expect(systemRegistryInputSchema.safeParse(legacy).success).toBe(true);
    expect(systemRegistryInputSchema.safeParse({...legacy,verificationState:"candidate"}).success).toBe(false);
  });
  test("denies anonymous requests before checking the feature flag or querying",async()=>{
    const context=setup({owner:false,flag:"true"});
    const response=await context.controller(request("https://yorkstead.com/api/systems-registry"));
    expect(response.status).toBe(401);expect(context.calls).toHaveLength(0);expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  test("denies the owner when the default-off feature flag is absent or not exact true",async()=>{
    for(const flag of [undefined,"false","TRUE","1"]){
      const context=setup({flag});
      const response=await context.controller(request("https://yorkstead.com/api/systems-registry"));
      expect(response.status).toBe(404);expect(context.calls).toHaveLength(0);
    }
  });
  test("queries only after owner and exact feature flag checks",async()=>{
    const context=setup({flag:"true"});
    const response=await context.controller(request("https://yorkstead.com/api/systems-registry?q=cloud&class=provider_service"));
    expect(response.status).toBe(200);expect(context.calls[0]).toEqual({method:"list",args:[{entityClass:"provider_service",search:"cloud",includeArchived:false}]});
  });
  test("rejects malformed and unverified typed records with readable validation errors",async()=>{
    const context=setup({flag:"true"});
    const response=await context.controller(request("https://yorkstead.com/api/systems-registry","POST",{entityClass:"provider_service",details:{},responsibleRole:null,recoveryRole:null,verificationState:"candidate",provenanceKind:"unknown",provenanceReference:null,observedAt:null}));
    expect(response.status).toBe(400);expect(context.calls).toHaveLength(0);expect((await response.json()).error).toContain("Registry details are invalid");
  });
  test("requires same-origin mutations and rejects caller-selected tenant",async()=>{
    const context=setup({flag:"true"});
    const foreign=new Request("https://yorkstead.com/api/systems-registry",{method:"POST",headers:{origin:"https://attacker.example","content-type":"application/json"},body:JSON.stringify({tenant:"other"})});
    expect((await context.controller(foreign)).status).toBe(403);expect(context.calls).toHaveLength(0);
    const tenantQuery=await context.controller(request("https://yorkstead.com/api/systems-registry?tenant=other"));
    expect(tenantQuery.status).toBe(400);expect(context.calls).toHaveLength(0);
  });
  test("applies the same owner and flag gate to relationship writes",async()=>{
    const context=setup({flag:"false"});
    const response=await context.relationships(request("https://yorkstead.com/api/systems-registry/relationships","POST",{}));
    expect(response.status).toBe(404);expect(context.calls).toHaveLength(0);
  });
});
