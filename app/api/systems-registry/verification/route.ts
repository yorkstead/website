import { handleSystemRegistryVerification } from "@/lib/system-registry-runtime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const POST=(request:Request)=>handleSystemRegistryVerification(request);
