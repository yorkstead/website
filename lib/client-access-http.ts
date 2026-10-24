import { z } from "zod";
import type { DocumentOwnerVerifier } from "@/lib/document-approval";
import {
  ClientAccessConflict,
  ClientAccessDenied,
  type createClientAccessAdminService,
} from "@/lib/client-access-admin";
import {
  accessSelection,
  clientAccessOperation,
} from "@/lib/client-access-schema";
import { readRequestTextWithLimit } from "@/lib/request-body";
export const clientAccessJSON = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
type Service = ReturnType<typeof createClientAccessAdminService>;
export function createClientAccessController(deps: {
  verifyOwner: DocumentOwnerVerifier;
  service: Service;
  origin: string;
}) {
  return async (request: Request) => {
    try {
      if (!(await deps.verifyOwner(request.headers)))
        return clientAccessJSON({ error: "Owner access required" }, 401);
      if (!deps.origin || new URL(deps.origin).origin !== deps.origin)
        return clientAccessJSON({ error: "Administration unavailable" }, 503);
      if (request.headers.get("sec-fetch-site") === "cross-site")
        return clientAccessJSON({ error: "Request unavailable" }, 403);
      const url = new URL(request.url);
      if (request.method === "GET") {
        if (
          [...url.searchParams.keys()].some(
            (k) => url.searchParams.getAll(k).length !== 1,
          )
        )
          return clientAccessJSON({ error: "Invalid request" }, 400);
        const selection = accessSelection.parse(
          Object.fromEntries(url.searchParams),
        );
        return clientAccessJSON(
          await deps.service.inspect(request.headers, selection),
        );
      }
      if (request.method !== "POST")
        return clientAccessJSON({ error: "Method unavailable" }, 405);
      if (
        request.headers.get("origin") !== deps.origin ||
        request.headers.get("content-type")?.split(";")[0].trim() !==
          "application/json"
      )
        return clientAccessJSON({ error: "Request unavailable" }, 403);
      if (url.search)
        return clientAccessJSON({ error: "Invalid request" }, 400);
      const body = await readRequestTextWithLimit(request, 8192);
      if (!body.ok)
        return clientAccessJSON({ error: "Request too large" }, 413);
      const input = clientAccessOperation.parse(JSON.parse(body.value));
      await deps.service.mutate(request.headers, input);
      return clientAccessJSON({ ok: true });
    } catch (error) {
      if (error instanceof ClientAccessConflict)
        return clientAccessJSON(
          {
            error:
              "Records changed. Refresh and review the exact scope before trying again.",
            conflict: true,
          },
          409,
        );
      if (error instanceof ClientAccessDenied)
        return clientAccessJSON(
          {
            error:
              "Administration is read-only or the requested scope is unavailable",
          },
          403,
        );
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return clientAccessJSON({ error: "Invalid request" }, 400);
      return clientAccessJSON(
        {
          error:
            "Administration temporarily unavailable. Refresh before retrying.",
        },
        503,
      );
    }
  };
}
