import { z } from "zod";
import { isTypedSystemRegistryAllowed } from "@/lib/system-registry-access";
import { registryProvenanceKinds, registryRelationshipKinds, registryVerificationStates, safeRegistryReference, systemEntityClasses, systemRegistryInputSchema, type SystemRegistryRelationshipInput } from "@/lib/system-registry";
import { directoryJSON } from "@/lib/system-directory-http";

const uuid = z.string().uuid();
const patchEntity = z.object({ id: uuid, expectedRevision: z.number().int().positive(), entry: systemRegistryInputSchema }).strict();
const archiveEntity = z.object({ id: uuid, expectedRevision: z.number().int().positive(), action: z.enum(["archive", "restore"]) }).strict();
const relationshipInput = z.object({
  targetId: uuid,
  kind: z.enum(registryRelationshipKinds),
  verificationState: z.enum(registryVerificationStates),
  provenanceKind: z.enum(registryProvenanceKinds),
  provenanceReference: safeRegistryReference,
  observedAt: z.string().datetime({ offset: true }).nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.verificationState !== "unknown" && (!value.provenanceReference || value.provenanceKind === "unknown")) ctx.addIssue({ code: "custom", path: ["provenanceReference"], message: "Verified links need a provenance type and evidence reference" });
  if (value.verificationState === "unknown" && value.provenanceReference !== null) ctx.addIssue({ code: "custom", path: ["provenanceReference"], message: "Unknown links cannot have a confirming evidence reference" });
});
const relationshipArchive = z.object({ id: uuid, expectedRevision: z.number().int().positive(), action: z.literal("archive") }).strict();
type RegistryService = ReturnType<typeof import("@/lib/system-registry-service").createSystemRegistryService>;
type Owner = { user: { id: string } } | null;
type Dependencies = { verifyOwner:(headers:Headers)=>Promise<Owner>; service:RegistryService; origin:string; environment?:Record<string,string|undefined> };

const ownerAndFlag = async (request:Request, deps:Dependencies):Promise<{allowed:false;response:Response}|{allowed:true;owner:{user:{id:string}}}> => {
  const owner = await deps.verifyOwner(request.headers);
  if (!owner) return { allowed:false,response: directoryJSON({ error: "Owner access required" }, 401) };
  if (!isTypedSystemRegistryAllowed(true, deps.environment)) return { allowed:false,response: directoryJSON({ error: "Systems Registry is unavailable" }, 404) };
  return { allowed:true,owner };
};
function sameOrigin(request:Request, expected:string) {
  const origin=request.headers.get("origin"); const fetchSite=request.headers.get("sec-fetch-site");
  return origin===expected && (!fetchSite || fetchSite==="same-origin");
}
async function readJSON(request:Request) {
  const length=Number(request.headers.get("content-length")??0);
  if (Number.isFinite(length)&&length>65536) return null;
  const text=await request.text();
  if (text.length>65536) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
}

export function createSystemRegistryController(deps:Dependencies) {
  return async (request:Request) => {
    try {
      const gate=await ownerAndFlag(request,deps); if (!gate.allowed) return gate.response;
      const url=new URL(request.url);
      if (request.method==="GET") {
        if (url.searchParams.has("tenant") || ["q","class","archived","audit","relationshipAudit"].some((key)=>url.searchParams.getAll(key).length>1) || (url.searchParams.has("audit")&&url.searchParams.has("relationshipAudit"))) return directoryJSON({error:"Invalid Registry query"},400);
        const entityClass=url.searchParams.get("class")??undefined;
        if (entityClass && !systemEntityClasses.includes(entityClass as typeof systemEntityClasses[number])) return directoryJSON({error:"Invalid entity class"},400);
        const search=(url.searchParams.get("q")??"").trim().slice(0,100);
        if (url.searchParams.has("audit")) {
          const id=url.searchParams.get("audit")!; if(!uuid.safeParse(id).success)return directoryJSON({error:"Invalid audit record"},400);
          return directoryJSON({audit:await deps.service.audit(id)});
        }
        if (url.searchParams.has("relationshipAudit")) {
          const id=url.searchParams.get("relationshipAudit")!; if(!uuid.safeParse(id).success)return directoryJSON({error:"Invalid relationship audit record"},400);
          return directoryJSON({audit:await deps.service.auditRelationship(id)});
        }
        return directoryJSON({entries:await deps.service.list({entityClass,search,includeArchived:url.searchParams.get("archived")==="true"})});
      }
      if (!sameOrigin(request,deps.origin)) return directoryJSON({error:"Request origin rejected"},403);
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return directoryJSON({error:"JSON required"},415);
      const body=await readJSON(request); if(body===null)return directoryJSON({error:"Invalid or oversized request"},400);
      if(request.method==="POST"){
        const parsed=systemRegistryInputSchema.safeParse(body); if(!parsed.success)return directoryJSON({error:`Registry details are invalid: ${parsed.error.issues[0]?.message??"check the required fields"}`},400);
        try{return directoryJSON({entry:await deps.service.create(parsed.data,gate.owner.user.id)},201);}
        catch(error){if((error as {code?:string})?.code==="23505")return directoryJSON({error:"A record with that name and provider already exists"},409);if((error as {code?:string})?.code==="23514"||(error as {code?:string})?.code==="YS_LEGACY_PROVENANCE_LOCKED")return directoryJSON({error:"Legacy provenance is reserved for and must be preserved on existing Directory entries"},400);throw error;}
      }
      if(request.method==="PATCH"){
        const archive=archiveEntity.safeParse(body);
        if(archive.success){const entry=await deps.service.archive(archive.data.id,archive.data.expectedRevision,archive.data.action==="archive",gate.owner.user.id);return entry?directoryJSON({entry}):directoryJSON({error:"Record changed; reload before retrying"},409);}
        const parsed=patchEntity.safeParse(body);if(!parsed.success)return directoryJSON({error:`Registry details are invalid: ${parsed.error.issues[0]?.message??"check the required fields"}`},400);
        try{const entry=await deps.service.update(parsed.data.id,parsed.data.expectedRevision,parsed.data.entry,gate.owner.user.id);return entry?directoryJSON({entry}):directoryJSON({error:"Record changed; reload before retrying"},409);}
        catch(error){if((error as {code?:string})?.code==="YS_CLASS_LOCKED")return directoryJSON({error:"This legacy service must remain classified as a provider/service so the existing Systems Directory stays compatible"},409);if((error as {code?:string})?.code==="YS_LEGACY_PROVENANCE_LOCKED")return directoryJSON({error:"Legacy provenance must be preserved on existing Directory entries"},409);throw error;}
      }
      return directoryJSON({error:"Method not allowed"},405);
    }catch{return directoryJSON({error:"Systems Registry temporarily unavailable"},503);}
  };
}

export function createSystemRegistryRelationshipsController(deps:Dependencies) {
  return async (request:Request) => {
    try {
      const gate=await ownerAndFlag(request,deps);if(!gate.allowed)return gate.response;
      if(!sameOrigin(request,deps.origin))return directoryJSON({error:"Request origin rejected"},403);
      if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return directoryJSON({error:"JSON required"},415);
      const body=await readJSON(request);if(body===null)return directoryJSON({error:"Invalid or oversized request"},400);
      if(request.method==="POST"){
        const raw=z.object({sourceId:uuid,relationship:relationshipInput}).strict().safeParse(body);
        if(!raw.success)return directoryJSON({error:`Relationship details are invalid: ${raw.error.issues[0]?.message??"check the required fields"}`},400);
        const link=await deps.service.createRelationship(raw.data.sourceId,raw.data.relationship as SystemRegistryRelationshipInput,gate.owner.user.id);
        return directoryJSON({relationship:link},201);
      }
      if(request.method==="PATCH"){
        const parsed=relationshipArchive.safeParse(body);if(!parsed.success)return directoryJSON({error:"Relationship action is invalid"},400);
        const link=await deps.service.archiveRelationship(parsed.data.id,parsed.data.expectedRevision,gate.owner.user.id);
        return link?directoryJSON({relationship:link}):directoryJSON({error:"Relationship changed; reload before retrying"},409);
      }
      return directoryJSON({error:"Method not allowed"},405);
    }catch(error){if((error as {code?:string})?.code==="23505")return directoryJSON({error:"That relationship already exists"},409);if((error as {code?:string})?.code==="23503")return directoryJSON({error:"Both relationship records must exist"},400);if((error as {code?:string})?.code==="23514")return directoryJSON({error:"Relationship details do not meet the database constraints"},400);return directoryJSON({error:"Systems Registry temporarily unavailable"},503);}
  };
}
