import { handleSystemRegistryMonitoring } from "@/lib/system-registry-runtime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const POST=(request:Request)=>handleSystemRegistryMonitoring(request);
