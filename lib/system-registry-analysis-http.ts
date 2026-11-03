import { z } from "zod";
import { directoryJSON } from "@/lib/system-directory-http";
import { isTypedSystemRegistryAllowed } from "@/lib/system-registry-access";
import { analyzeRegistry } from "@/lib/system-registry-analysis";

type Service = ReturnType<typeof import("@/lib/system-registry-service").createSystemRegistryService>;
type Dependencies = {
  verifyOwner: (headers: Headers) => Promise<{ user: { id: string } } | null>;
  service: Service;
  environment?: Record<string, string | undefined>;
};
const selectedIdSchema = z.string().uuid();

export function createSystemRegistryAnalysisController(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      if (request.method !== "GET") return directoryJSON({ error: "Method not allowed" }, 405);
      const owner = await deps.verifyOwner(request.headers);
      if (!owner) return directoryJSON({ error: "Owner access required" }, 401);
      if (!isTypedSystemRegistryAllowed(true, deps.environment)) return directoryJSON({ error: "Systems Registry is unavailable" }, 404);
      const url = new URL(request.url);
      if ([...url.searchParams.keys()].some((key) => key !== "selected") || url.searchParams.getAll("selected").length > 1) return directoryJSON({ error: "Invalid Registry analysis query" }, 400);
      const selectedId = url.searchParams.get("selected") ?? undefined;
      if (selectedId && !selectedIdSchema.safeParse(selectedId).success) return directoryJSON({ error: "Invalid selected Registry record" }, 400);
      const snapshot = await deps.service.analysisSnapshot();
      return directoryJSON({ analysis: analyzeRegistry(snapshot, selectedId) });
    } catch {
      return directoryJSON({ error: "Registry analysis temporarily unavailable" }, 503);
    }
  };
}
