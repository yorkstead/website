import { getCustomerAuth } from "@/lib/customer-auth";
import { customerPortalCapabilities } from "@/lib/customer-portal-authorization";
import { toNextJsHandler } from "better-auth/next-js";

export const runtime = "nodejs";

function disabledResponse() {
  return Response.json(
    { error: "Not Found" },
    {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function getHandlers() {
  return toNextJsHandler(getCustomerAuth());
}

export async function GET(request: Request) {
  if (!customerPortalCapabilities.login) return disabledResponse();
  return getHandlers().GET(request);
}

export async function POST(request: Request) {
  if (!customerPortalCapabilities.login) return disabledResponse();
  return getHandlers().POST(request);
}
