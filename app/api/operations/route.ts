import { handleOperations } from "@/lib/operations-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleOperations(request);
}
