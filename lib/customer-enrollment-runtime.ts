import { Pool } from "pg";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import {
  getCustomerAuth,
  getCustomerAuthConfiguration,
} from "@/lib/customer-auth";
import { createClientOnboardingService } from "@/lib/client-onboarding";
import {
  createCustomerEnrollmentService,
  customerEnrollmentEnabled,
  unavailableEnrollmentDelivery,
} from "@/lib/customer-enrollment";
import { createEnrollmentController } from "@/lib/customer-enrollment-http";

let pool: Pool | undefined;
export function getEnrollmentPool() {
  pool ??= new Pool({
    connectionString: explicitVerifyFullSSL(
      getCustomerAuthConfiguration().databaseURL,
    ),
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });
  return pool;
}
export async function handleCustomerEnrollment(
  request: Request,
  operation: string,
) {
  // Gate before configuration, database or provider initialization.
  if (!customerEnrollmentEnabled())
    return Response.json(
      { error: "Not Found" },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  const auth = getCustomerAuth();
  const enrollment = createCustomerEnrollmentService(
    getEnrollmentPool(),
    unavailableEnrollmentDelivery,
    async (password) => (await auth.$context).password.hash(password),
  );
  return createEnrollmentController({
    enabled: customerEnrollmentEnabled,
    origin: getCustomerAuthConfiguration().baseURL,
    enrollment,
    onboarding: createClientOnboardingService(getEnrollmentPool()),
    auth: auth.api,
  })(request, operation);
}
