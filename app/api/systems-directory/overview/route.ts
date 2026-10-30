import { handleSystemDirectoryOverview } from "@/lib/system-directory-runtime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(request:Request){return handleSystemDirectoryOverview(request);}
