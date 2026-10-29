import { headers } from "next/headers";
import { getOwnerSession } from "@/lib/owner-session";
import { getAutomationHubData } from "@/lib/automation-hub-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  if (!(await getOwnerSession(await headers())))
    return Response.json({ state: "unauthorized" }, { status: 401, headers: privateHeaders });

  return Response.json(await getAutomationHubData(), { headers: privateHeaders });
}
