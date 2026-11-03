import { handleSystemRegistryRelationships } from "@/lib/system-registry-runtime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const POST=(request:Request)=>handleSystemRegistryRelationships(request);
export const PATCH=(request:Request)=>handleSystemRegistryRelationships(request);
