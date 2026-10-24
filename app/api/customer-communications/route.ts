import { handleCustomerCommunications } from "@/lib/customer-communications-runtime";
export const runtime = "nodejs";
export const GET = handleCustomerCommunications;
export const POST = handleCustomerCommunications;
