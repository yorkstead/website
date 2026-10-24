import { Pool } from "pg";
import { getOwnerSession } from "@/lib/owner-session";
import { getAuthConfiguration } from "@/lib/auth";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import {
  createCustomerCommunicationsController,
  createCustomerCommunicationsService,
} from "@/lib/customer-communications";
let pool: Pool | undefined;
export async function handleCustomerCommunications(request: Request) {
  try {
    if (!(await getOwnerSession(request.headers)))
      return Response.json(
        { error: "Owner access required" },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
          },
        },
      );
    pool ??= new Pool({
      connectionString: explicitVerifyFullSSL(
        getAuthConfiguration().databaseURL,
      ),
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
    });
    return createCustomerCommunicationsController({
      verifyOwner: getOwnerSession,
      service: createCustomerCommunicationsService(pool, getOwnerSession),
    })(request);
  } catch {
    return Response.json(
      { error: "Communications temporarily unavailable" },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  }
}
