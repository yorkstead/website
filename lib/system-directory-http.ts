import { z } from "zod";
import { systemDirectoryInputSchema } from "@/lib/system-directory";

const privateHeaders = { "Cache-Control":"private, no-store", "Referrer-Policy":"no-referrer", "X-Content-Type-Options":"nosniff" };
export const directoryJSON = (body: unknown, status = 200) => Response.json(body,{status,headers:privateHeaders});
const patchSchema = z.object({ id:z.string().uuid(), expectedRevision:z.number().int().positive(), entry:systemDirectoryInputSchema }).strict();
const archiveSchema = z.object({ id:z.string().uuid(), expectedRevision:z.number().int().positive(), action:z.enum(["archive","restore"]) }).strict();
type Service = ReturnType<typeof import("@/lib/system-directory-service").createSystemDirectoryService>;

function sameOrigin(request: Request, expected: string) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return origin === expected && (!fetchSite || fetchSite === "same-origin");
}

async function readBody(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > 32_768) return null;
  const body = await request.text();
  if (body.length > 32_768) return null;
  try { return JSON.parse(body) as unknown; } catch { return null; }
}

export function createSystemDirectoryController(deps: { verifyOwner:(headers:Headers)=>Promise<{user:{id:string}}|null>; service:Service; origin:string }) {
  return async (request:Request) => {
    try {
      const owner = await deps.verifyOwner(request.headers);
      if (!owner) return directoryJSON({error:"Owner access required"},401);
      const url = new URL(request.url);
      if (request.method === "GET") {
        if (url.searchParams.has("tenant") || url.searchParams.getAll("q").length > 1 || url.searchParams.getAll("category").length > 1) return directoryJSON({error:"Invalid directory query"},400);
        const q=(url.searchParams.get("q") ?? "").trim().slice(0,100);
        const category=(url.searchParams.get("category") ?? "").trim();
        if (category && !["hosting","database","development","productivity","payments","communications","analytics","automation","security","infrastructure","other"].includes(category)) return directoryJSON({error:"Invalid category"},400);
        if (url.searchParams.get("audit")) {
          const id=url.searchParams.get("audit")!;
          if (!z.string().uuid().safeParse(id).success) return directoryJSON({error:"Invalid audit record"},400);
          return directoryJSON({audit:await deps.service.audit(id)});
        }
        const entries=await deps.service.list(url.searchParams.get("archived")==="true",q,category);
        return directoryJSON({entries});
      }
      if (!sameOrigin(request,deps.origin)) return directoryJSON({error:"Request origin rejected"},403);
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return directoryJSON({error:"JSON required"},415);
      const raw=await readBody(request);
      if (raw===null) return directoryJSON({error:"Invalid or oversized request"},400);
      if (request.method === "POST") {
        const parsed=systemDirectoryInputSchema.safeParse(raw);
        if (!parsed.success) return directoryJSON({error:"Directory details are invalid"},400);
        try { return directoryJSON({entry:await deps.service.create(parsed.data,owner.user.id)},201); }
        catch (error) { if ((error as {code?:string})?.code==="23505") return directoryJSON({error:"A service with that name and provider already exists"},409); throw error; }
      }
      if (request.method === "PATCH") {
        const archive=archiveSchema.safeParse(raw);
        if (archive.success) {
          const entry=await deps.service.archive(archive.data.id,archive.data.expectedRevision,archive.data.action==="archive",owner.user.id);
          return entry ? directoryJSON({entry}) : directoryJSON({error:"Directory record changed; reload before retrying"},409);
        }
        const parsed=patchSchema.safeParse(raw);
        if (!parsed.success) return directoryJSON({error:"Directory details are invalid"},400);
        const entry=await deps.service.update(parsed.data.id,parsed.data.expectedRevision,parsed.data.entry,owner.user.id);
        return entry ? directoryJSON({entry}) : directoryJSON({error:"Directory record changed; reload before retrying"},409);
      }
      return directoryJSON({error:"Method not allowed"},405);
    } catch { return directoryJSON({error:"Systems Directory temporarily unavailable"},503); }
  };
}
