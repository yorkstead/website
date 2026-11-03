import { handleSystemRegistryBilling } from "@/lib/system-registry-runtime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const GET=(request:Request)=>handleSystemRegistryBilling(request);
export const POST=(request:Request)=>handleSystemRegistryBilling(request);
export const PATCH=(request:Request)=>handleSystemRegistryBilling(request);
