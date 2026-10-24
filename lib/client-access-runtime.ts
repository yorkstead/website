import { Pool } from "pg";
import { getAuthConfiguration } from "@/lib/auth";
import { getOwnerSession } from "@/lib/owner-session";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import { createClientAccessAdminService } from "@/lib/client-access-admin";
import { clientAccessDisposableEnabled } from "@/lib/client-access-schema";
import {
  clientAccessJSON,
  createClientAccessController,
} from "@/lib/client-access-http";
let pool: Pool | undefined;
export async function handleClientAccess(request: Request) {
  try {
    if (!(await getOwnerSession(request.headers)))
      return clientAccessJSON({ error: "Owner access required" }, 401);
    const config = getAuthConfiguration();
    pool ??= new Pool({
      connectionString: explicitVerifyFullSSL(config.databaseURL),
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
    });
    return createClientAccessController({
      verifyOwner: getOwnerSession,
      service: createClientAccessAdminService(
        pool,
        getOwnerSession,
        clientAccessDisposableEnabled(),
      ),
      origin: new URL(config.baseURL).origin,
    })(request);
  } catch {
    return clientAccessJSON(
      { error: "Administration temporarily unavailable" },
      503,
    );
  }
}
