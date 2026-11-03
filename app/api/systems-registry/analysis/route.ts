import { handleSystemRegistryAnalysis } from "@/lib/system-registry-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = (request: Request) => handleSystemRegistryAnalysis(request);
