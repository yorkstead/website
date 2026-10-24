import { Pool } from "pg";
import { getOwnerSession } from "@/lib/owner-session";
import { getAuthConfiguration } from "@/lib/auth";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import { createReadinessInspector } from "@/lib/portal-readiness-adapters";
import { readinessWritesEnabled } from "@/lib/portal-readiness-schema";
import { createPortalReadinessService } from "@/lib/portal-readiness-service";
import {
  createReadinessController,
  readinessJSON,
} from "@/lib/portal-readiness-http";
let pool: Pool | undefined;
export async function handlePortalReadiness(request: Request) {
  try {
    if (!(await getOwnerSession(request.headers)))
      return readinessJSON({ error: "Owner access required" }, 401);
    const config = getAuthConfiguration();
    pool ??= new Pool({
      connectionString: explicitVerifyFullSSL(config.databaseURL),
      connectionTimeoutMillis: 10000,
      query_timeout: 15000,
    });
    return createReadinessController({
      verifyOwner: getOwnerSession,
      origin: new URL(config.baseURL).origin,
      service: createPortalReadinessService(
        pool,
        createReadinessInspector(),
        getOwnerSession,
        readinessWritesEnabled(),
      ),
    })(request);
  } catch {
    return readinessJSON({ error: "Readiness temporarily unavailable" }, 503);
  }
}
