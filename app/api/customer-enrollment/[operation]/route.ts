import { handleCustomerEnrollment } from "@/lib/customer-enrollment-runtime";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  return handleCustomerEnrollment(request, (await context.params).operation);
}
