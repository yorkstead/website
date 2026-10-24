import { z } from "zod";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";
import { ClientProjectAccessError, ClientProjectConflictError, type createClientProjectPublicationService } from "@/lib/client-project-data";
import { publicationKind } from "@/lib/client-project-projection";
import { readRequestTextWithLimit } from "@/lib/request-body";

const id = z.string().min(1).max(200).refine(v => v===v.trim());
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), projectId: id, kind: publicationKind, sourceId: id, includeDescription: z.boolean(), expectedRevision: z.number().int().nonnegative() }).strict(),
  ...(["approve", "withdraw"] as const).map(value => z.object({ action: z.literal(value), projectId: id, publicationId: z.uuid(), expectedRevision: z.number().int().positive() }).strict()),
]);
const safeHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export const ownerPublishingJSON = (data: unknown, status=200) => Response.json(data, { status, headers: safeHeaders });
type Service = ReturnType<typeof createClientProjectPublicationService>;
export function createOwnerPublishingController(dependencies: { verifyOwner: DocumentOwnerVerifier; service: Pick<Service, "publishingWorkspace" | "prepare" | "approve" | "withdraw">; origin: string }) {
  return async (request: Request) => {
    try {
      if (!(await dependencies.verifyOwner(request.headers))) return ownerPublishingJSON({ error: "Owner access required" }, 401);
      if (request.method === "GET") {
        if (request.headers.get("sec-fetch-site")==="cross-site") return ownerPublishingJSON({ error: "Request unavailable" },403);
        const url = new URL(request.url);
        if ([...url.searchParams.keys()].some(k => k!=="projectId") || url.searchParams.getAll("projectId").length>1) return ownerPublishingJSON({ error: "Invalid request" },400);
        const projectId = url.searchParams.get("projectId");
        if (projectId!==null) id.parse(projectId);
        return ownerPublishingJSON(await dependencies.service.publishingWorkspace(request.headers, projectId ?? undefined));
      }
      if (request.method!=="POST") return ownerPublishingJSON({ error: "Method unavailable" },405);
      if (request.headers.get("origin")!==dependencies.origin || request.headers.get("sec-fetch-site")==="cross-site" || request.headers.get("content-type")?.split(";")[0].trim()!=="application/json") return ownerPublishingJSON({ error: "Request unavailable" },403);
      if (new URL(request.url).search) return ownerPublishingJSON({ error: "Invalid request" },400);
      const body = await readRequestTextWithLimit(request, 4096);
      if (!body.ok) return ownerPublishingJSON({ error: "Request too large" },413);
      const input = action.parse(JSON.parse(body.value));
      if (input.action==="prepare") {
        const { action: _, projectId, ...value } = input;
        void _;
        await dependencies.service.prepare(request.headers, projectId, value);
      } else await dependencies.service[input.action](request.headers, input.projectId, input.publicationId, input.expectedRevision);
      return ownerPublishingJSON({ ok: true });
    } catch (error) {
      if (error instanceof ClientProjectConflictError) return ownerPublishingJSON({ error: "Publication changed. Refresh and review the current draft before trying again.", conflict: true },409);
      if (error instanceof ClientProjectAccessError) return ownerPublishingJSON({ error: "Project or publication is unavailable" },403);
      if (error instanceof z.ZodError || error instanceof SyntaxError) return ownerPublishingJSON({ error: "Invalid request" },400);
      return ownerPublishingJSON({ error: "Publishing is temporarily unavailable. Refresh before retrying." },503);
    }
  };
}
