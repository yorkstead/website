import { z } from "zod";
import { isTypedSystemRegistryAllowed } from "@/lib/system-registry-access";
import { directoryJSON } from "@/lib/system-directory-http";
import { systemRegistryBillingAllocationSchema, systemRegistryBillingEvidenceSchema, systemRegistryMonitoringInputSchema, systemRegistryVerificationInputSchema } from "@/lib/system-registry";

type RegistryService=ReturnType<typeof import("@/lib/system-registry-service").createSystemRegistryService>;
type BillingService=ReturnType<typeof import("@/lib/system-registry-billing-service").createSystemRegistryBillingService>;
type Owner={user:{id:string}}|null;
type Dependencies={verifyOwner:(headers:Headers)=>Promise<Owner>;service:RegistryService;billing:BillingService;origin:string;environment?:Record<string,string|undefined>};
const uuid=z.string().uuid();
async function gate(request:Request,deps:Dependencies){const owner=await deps.verifyOwner(request.headers);if(!owner)return{ok:false as const,response:directoryJSON({error:"Owner access required"},401)};if(!isTypedSystemRegistryAllowed(true,deps.environment))return{ok:false as const,response:directoryJSON({error:"Systems Registry is unavailable"},404)};return{ok:true as const,owner};}
function sameOrigin(request:Request,origin:string){return request.headers.get("origin")===origin&&(!request.headers.get("sec-fetch-site")||request.headers.get("sec-fetch-site")==="same-origin");}
async function readJSON(request:Request){const length=Number(request.headers.get("content-length")??0);if(Number.isFinite(length)&&length>65536)return null;const text=await request.text();if(text.length>65536)return null;try{return JSON.parse(text) as unknown;}catch{return null;}}
function jsonRequired(request:Request){return request.headers.get("content-type")?.toLowerCase().startsWith("application/json")===true;}

function entryWorkflowController(deps:Dependencies,kind:"verification"|"monitoring"){
  const payload=kind==="verification"?systemRegistryVerificationInputSchema:systemRegistryMonitoringInputSchema;
  return async(request:Request)=>{
    try{
      const authorized=await gate(request,deps);if(!authorized.ok)return authorized.response;
      if(request.method!=="POST")return directoryJSON({error:"Method not allowed"},405);
      if(!sameOrigin(request,deps.origin))return directoryJSON({error:"Request origin rejected"},403);
      if(!jsonRequired(request))return directoryJSON({error:"JSON required"},415);
      const body=await readJSON(request);if(body===null)return directoryJSON({error:"Invalid or oversized request"},400);
      const shape=z.object({id:uuid,expectedRevision:z.number().int().positive(),evidence:payload}).strict().safeParse(body);
      if(!shape.success)return directoryJSON({error:`${kind==="verification"?"Verification":"Monitoring"} details are invalid: ${shape.error.issues[0]?.message??"check the required fields"}`},400);
      const record=kind==="verification"
        ?await deps.service.updateVerification(shape.data.id,shape.data.expectedRevision,shape.data.evidence as typeof systemRegistryVerificationInputSchema._output,authorized.owner.user.id)
        :await deps.service.recordMonitoring(shape.data.id,shape.data.expectedRevision,shape.data.evidence as typeof systemRegistryMonitoringInputSchema._output,authorized.owner.user.id);
      return record?directoryJSON({entry:record}):directoryJSON({error:"Record changed; reload before retrying"},409);
    }catch{return directoryJSON({error:"Systems Registry temporarily unavailable"},503);}
  };
}
export const createSystemRegistryVerificationController=(deps:Dependencies)=>entryWorkflowController(deps,"verification");
export const createSystemRegistryMonitoringController=(deps:Dependencies)=>entryWorkflowController(deps,"monitoring");

const sourceCreate=z.object({type:z.literal("evidence"),evidence:systemRegistryBillingEvidenceSchema}).strict();
const allocationCreate=z.object({type:z.literal("allocation"),allocation:systemRegistryBillingAllocationSchema}).strict();
const sourceStatus=z.object({type:z.literal("evidence-status"),id:uuid,expectedRevision:z.number().int().positive(),status:z.enum(["verified","unverified","stale","unknown","unavailable"]),reviewDue:z.string().date().nullable()}).strict();
const evidenceArchive=z.object({type:z.literal("archive-evidence"),id:uuid,expectedRevision:z.number().int().positive()}).strict();
const allocationArchive=z.object({type:z.literal("archive-allocation"),id:uuid,expectedRevision:z.number().int().positive()}).strict();

export function createSystemRegistryBillingController(deps:Dependencies){
  return async(request:Request)=>{
    try{
      const authorized=await gate(request,deps);if(!authorized.ok)return authorized.response;
      const url=new URL(request.url);
      if(request.method==="GET"){
        const audit=url.searchParams.get("audit");
        if(url.searchParams.size>(audit?1:0)||url.searchParams.getAll("audit").length>1)return directoryJSON({error:"Invalid billing query"},400);
        if(audit){if(!uuid.safeParse(audit).success)return directoryJSON({error:"Invalid billing evidence record"},400);return directoryJSON({audit:await deps.billing.audit(audit)});}
        return directoryJSON(await deps.billing.list());
      }
      if(request.method!=="POST"&&request.method!=="PATCH")return directoryJSON({error:"Method not allowed"},405);
      if(!sameOrigin(request,deps.origin))return directoryJSON({error:"Request origin rejected"},403);
      if(!jsonRequired(request))return directoryJSON({error:"JSON required"},415);
      const body=await readJSON(request);if(body===null)return directoryJSON({error:"Invalid or oversized request"},400);
      if(request.method==="POST"){
        const source=sourceCreate.safeParse(body);if(source.success){const evidence=await deps.billing.create(source.data.evidence,authorized.owner.user.id);return directoryJSON({evidence},201);}
        const allocation=allocationCreate.safeParse(body);if(!allocation.success)return directoryJSON({error:"Billing evidence or allocation details are invalid"},400);
        try{const created=await deps.billing.allocate(allocation.data.allocation,authorized.owner.user.id);return created?directoryJSON({allocation:created},201):directoryJSON({error:"Billing source is missing, archived, or no longer available"},404);}
        catch(error){const code=(error as {code?:string}).code;if(code==="YS_UNKNOWN_ALLOCATION")return directoryJSON({error:"Unknown charges cannot be allocated as a numeric amount"},400);if(code==="YS_NOT_SUBSCRIPTION"||code==="23503")return directoryJSON({error:"Choose an existing provider account and subscription of the correct type"},400);if(code==="YS_ALLOCATION_EXCEEDS_SOURCE")return directoryJSON({error:"Allocations cannot exceed the source charge"},409);throw error;}
      }
      const status=sourceStatus.safeParse(body);if(status.success){const record=await deps.billing.updateStatus(status.data.id,status.data.expectedRevision,status.data.status,status.data.reviewDue,authorized.owner.user.id);return record?directoryJSON({evidence:record}):directoryJSON({error:"Billing evidence changed; reload before retrying"},409);}
      const archive=evidenceArchive.safeParse(body);if(archive.success){const record=await deps.billing.archive(archive.data.id,archive.data.expectedRevision,authorized.owner.user.id);return record?directoryJSON({evidence:record}):directoryJSON({error:"Billing evidence changed; reload before retrying"},409);}
      const allocation=allocationArchive.safeParse(body);if(allocation.success){const record=await deps.billing.archiveAllocation(allocation.data.id,allocation.data.expectedRevision,authorized.owner.user.id);return record?directoryJSON({allocation:record}):directoryJSON({error:"Billing allocation changed; reload before retrying"},409);}
      return directoryJSON({error:"Billing action is invalid"},400);
    }catch(error){
      const code=(error as {code?:string}).code;
      if(code==="23505")return directoryJSON({error:"This billing source/period already exists; reuse it and add a subscription allocation"},409);
      if(code==="23514")return directoryJSON({error:"Billing evidence does not meet the data constraints"},400);
      if(code==="YS_BILLING_ALLOCATIONS_ACTIVE")return directoryJSON({error:"Archive active subscription allocations before archiving source evidence"},409);
      return directoryJSON({error:"Systems Registry temporarily unavailable"},503);
    }
  };
}
