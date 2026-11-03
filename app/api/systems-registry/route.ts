import { handleSystemRegistry } from "@/lib/system-registry-runtime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const GET=(request:Request)=>handleSystemRegistry(request);
export const POST=(request:Request)=>handleSystemRegistry(request);
export const PATCH=(request:Request)=>handleSystemRegistry(request);
