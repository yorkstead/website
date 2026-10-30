import { handleSystemDirectory } from "@/lib/system-directory-runtime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const GET=(request:Request)=>handleSystemDirectory(request);
export const POST=(request:Request)=>handleSystemDirectory(request);
export const PATCH=(request:Request)=>handleSystemDirectory(request);
