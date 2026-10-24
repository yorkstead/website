import { z } from "zod";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";
import { readRequestTextWithLimit } from "@/lib/request-body";
import { readinessOperation } from "@/lib/portal-readiness-schema";
import {
  ReadinessConflict,
  ReadinessDenied,
  type createPortalReadinessService,
} from "@/lib/portal-readiness-service";
export const readinessJSON = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function createReadinessController(deps: {
  verifyOwner: DocumentOwnerVerifier;
  service: ReturnType<typeof createPortalReadinessService>;
  origin: string;
}) {
  return async (request: Request) => {
    try {
      if (!(await deps.verifyOwner(request.headers)))
        return readinessJSON({ error: "Owner access required" }, 401);
      if (!deps.origin || new URL(deps.origin).origin !== deps.origin)
        return readinessJSON({ error: "Readiness unavailable" }, 503);
      if (request.headers.get("sec-fetch-site") === "cross-site")
        return readinessJSON({ error: "Request unavailable" }, 403);
      const url = new URL(request.url);
      if (request.method === "GET") {
        if (
          [...url.searchParams.keys()].some((k) => k !== "page") ||
          url.searchParams.getAll("page").length > 1
        )
          return readinessJSON({ error: "Invalid request" }, 400);
        const page = z.coerce
          .number()
          .int()
          .min(0)
          .max(10000)
          .parse(url.searchParams.get("page") ?? 0);
        return readinessJSON(await deps.service.inspect(request.headers, page));
      }
      if (request.method !== "POST")
        return readinessJSON({ error: "Method unavailable" }, 405);
      if (
        request.headers.get("origin") !== deps.origin ||
        request.headers.get("content-type")?.split(";")[0].trim() !==
          "application/json"
      )
        return readinessJSON({ error: "Request unavailable" }, 403);
      if (url.search) return readinessJSON({ error: "Invalid request" }, 400);
      const body = await readRequestTextWithLimit(request, 4096);
      if (!body.ok) return readinessJSON({ error: "Request too large" }, 413);
      await deps.service.mutate(
        request.headers,
        readinessOperation.parse(JSON.parse(body.value)),
      );
      return readinessJSON({ ok: true });
    } catch (error) {
      if (error instanceof ReadinessConflict)
        return readinessJSON(
          {
            error:
              "Readiness changed. Refresh and review the current evidence before trying again.",
            conflict: true,
          },
          409,
        );
      if (error instanceof ReadinessDenied)
        return readinessJSON(
          {
            error:
              "Review is read-only, mandatory evidence is unresolved, or the operation is unavailable",
          },
          403,
        );
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return readinessJSON({ error: "Invalid request" }, 400);
      return readinessJSON(
        {
          error: "Readiness temporarily unavailable. Refresh before retrying.",
        },
        503,
      );
    }
  };
}
