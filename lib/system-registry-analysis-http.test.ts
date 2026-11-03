import { describe, expect, test } from "bun:test";
import { createSystemRegistryAnalysisController } from "@/lib/system-registry-analysis-http";
import type { createSystemRegistryService } from "@/lib/system-registry-service";

const snapshot={nodes:[],edges:[],truncated:{entries:false,relationships:false}};
function setup(options:{owner?:boolean;flag?:string}={}) {
  const calls:string[]=[];
  const service={analysisSnapshot:async()=>{calls.push("snapshot");return snapshot;}} as unknown as ReturnType<typeof createSystemRegistryService>;
  const controller=createSystemRegistryAnalysisController({verifyOwner:async()=>options.owner===false?null:{user:{id:"owner"}},service,environment:options.flag===undefined?{}:{YS_SYS_001_ENABLED:options.flag}});
  return {controller,calls};
}
const request=(url="https://yorkstead.com/api/systems-registry/analysis",method="GET")=>new Request(url,{method});

describe("Registry analysis API boundary",()=>{
  test("denies unauthenticated and feature-disabled requests before reading the database",async()=>{
    const anonymous=setup({owner:false,flag:"true"});
    expect((await anonymous.controller(request())).status).toBe(401);
    expect(anonymous.calls).toHaveLength(0);
    for(const flag of [undefined,"false","TRUE","1"]){const disabled=setup({flag});expect((await disabled.controller(request())).status).toBe(404);expect(disabled.calls).toHaveLength(0);}
  });
  test("serves a private no-store snapshot only for the owner with the exact flag",async()=>{
    const context=setup({flag:"true"});const response=await context.controller(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(context.calls).toEqual(["snapshot"]);
    expect((await response.json()).analysis.readiness.ready).toBe(false);
  });
  test("rejects extra query controls, malformed selected IDs, and non-GET methods",async()=>{
    const context=setup({flag:"true"});
    expect((await context.controller(request("https://yorkstead.com/api/systems-registry/analysis?tenant=other"))).status).toBe(400);
    expect((await context.controller(request("https://yorkstead.com/api/systems-registry/analysis?selected=not-a-uuid"))).status).toBe(400);
    expect((await context.controller(request(undefined,"POST"))).status).toBe(405);
    expect(context.calls).toHaveLength(0);
  });
});
