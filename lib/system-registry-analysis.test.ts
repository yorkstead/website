import { describe, expect, test } from "bun:test";
import { analyzeRegistry, type RegistryAnalysisEdge, type RegistryAnalysisNode } from "@/lib/system-registry-analysis";

const node=(id:string,overrides:Partial<RegistryAnalysisNode>={}):RegistryAnalysisNode=>({id,name:`Synthetic ${id}`,entityClass:"application_workload",revision:1,responsibleRolePresent:true,recoveryRolePresent:true,verificationState:"owner_reviewed",verificationStatus:"verified",verificationReviewDue:null,monitoringConfiguration:"configured",monitoringOutcome:"healthy",monitoringReviewDue:null,billingReady:null,...overrides});
const edge=(id:string,sourceId:string,targetId:string,kind:RegistryAnalysisEdge["kind"]="depends_on",verificationState:RegistryAnalysisEdge["verificationState"]="owner_reviewed"):RegistryAnalysisEdge=>({id,sourceId,targetId,kind,verificationState,provenanceKind:"provider_export",endpointsPresent:true});

describe("Systems Registry dependency and readiness analysis",()=>{
  test("traverses upstream and reverse downstream through operational links only",()=>{
    const nodes=[node("app"),node("api"),node("db"),node("account",{entityClass:"provider_account"})];
    const result=analyzeRegistry({nodes,edges:[edge("app-api","app","api"),edge("api-db","api","db","runs_on"),edge("owner","account","app","owns"),edge("bill","app","account","billed_through")],truncated:{entries:false,relationships:false}},"api");
    expect(result.upstream?.records.map((item)=>item.id)).toEqual(["db"]);
    expect(result.downstream?.records.map((item)=>item.id)).toEqual(["app"]);
    expect(result.upstream?.records[0]?.verifiedPath).toBe(true);
    expect(result.edges.map((item)=>item.kind)).toContain("owns");
    expect(result.edges.map((item)=>item.kind)).toContain("billed_through");
  });

  test("keeps candidate/unknown paths visible but unverified",()=>{
    const result=analyzeRegistry({nodes:[node("app"),node("provider",{entityClass:"provider_service"})],edges:[edge("candidate","app","provider","depends_on","candidate")],truncated:{entries:false,relationships:false}},"app");
    expect(result.upstream?.records).toMatchObject([{id:"provider",verifiedPath:false}]);
    expect(result.issues.some((issue)=>issue.code==="dependency_unverified"&&issue.severity==="critical")).toBe(true);
  });

  test("detects recorded cycles and preserves their evidence state",()=>{
    const result=analyzeRegistry({nodes:[node("a"),node("b"),node("c")],edges:[edge("ab","a","b"),edge("bc","b","c"),edge("ca","c","a","uses","candidate")],truncated:{entries:false,relationships:false}});
    expect(result.cycles).toHaveLength(1);
    expect(result.cycles[0]?.verified).toBe(false);
    expect(result.issues.some((issue)=>issue.code==="dependency_cycle")).toBe(true);
  });

  test("reports missing endpoints, truncated inventory, and cycles without claiming completeness",()=>{
    const result=analyzeRegistry({nodes:[node("a")],edges:[{...edge("orphan","a","missing"),endpointsPresent:false}],truncated:{entries:true,relationships:false}});
    expect(result.incompleteRelationshipCount).toBe(1);
    expect(result.limits.truncated).toBe(true);
    expect(result.readiness.ready).toBe(false);
    expect(result.issues.map((issue)=>issue.code)).toContain("relationship_incomplete");
    expect(result.issues.map((issue)=>issue.code)).toContain("snapshot_truncated");
  });

  test("enforces depth and node traversal bounds",()=>{
    const nodes=Array.from({length:11},(_,index)=>node(String(index)));
    const edges=nodes.slice(0,-1).map((item,index)=>edge(`e${index}`,String(index),String(index+1)));
    const deep=analyzeRegistry({nodes,edges,truncated:{entries:false,relationships:false}},"0");
    expect(deep.upstream?.records).toHaveLength(8);
    expect(deep.upstream?.truncated).toBe(true);
    const manyNodes=Array.from({length:102},(_,index)=>node(String(index).padStart(3,"0")));
    const manyEdges=manyNodes.slice(1).map((item,index)=>edge(`edge${index}`,item.id,manyNodes[0]!.id));
    const wide=analyzeRegistry({nodes:manyNodes,edges:manyEdges,truncated:{entries:false,relationships:false}},"000");
    expect(wide.downstream?.records).toHaveLength(100);
    expect(wide.downstream?.truncated).toBe(true);
  });

  test("supports empty and partially populated inventories with all-class counts",()=>{
    const empty=analyzeRegistry({nodes:[],edges:[],truncated:{entries:false,relationships:false}});
    expect(empty.byClass).toEqual({provider_service:0,provider_account:0,subscription:0,application_workload:0,infrastructure_asset:0,stack_component:0});
    expect(empty.readiness.ready).toBe(false);
    expect(empty.issues[0]?.code).toBe("empty_inventory");
    const partial=analyzeRegistry({nodes:[node("service",{entityClass:"provider_service",responsibleRolePresent:false,recoveryRolePresent:false,verificationStatus:"stale"}),node("subscription",{entityClass:"subscription",billingReady:false})],edges:[],truncated:{entries:false,relationships:false}});
    expect(partial.byClass.provider_service).toBe(1);
    expect(partial.byClass.subscription).toBe(1);
    expect(partial.issues.map((issue)=>issue.code)).toContain("missing_owner");
    expect(partial.issues.map((issue)=>issue.code)).toContain("missing_recovery");
    expect(partial.issues.map((issue)=>issue.code)).toContain("billing_unknown");
    expect(partial.issues.map((issue)=>issue.code)).toContain("dependency_coverage_unknown");
  });
});
