import { handleOwnerPublishing } from "@/lib/owner-publishing-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleOwnerPublishing;
export const POST = handleOwnerPublishing;
