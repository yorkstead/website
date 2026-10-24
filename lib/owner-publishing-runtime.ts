import { Pool } from "pg";
import { getOwnerSession } from "@/lib/owner-session";
import { getAuthConfiguration } from "@/lib/auth";
import { explicitVerifyFullSSL } from "@/lib/database-url";
import { createClientProjectPublicationService } from "@/lib/client-project-data";
import { createOwnerPublishingController, ownerPublishingJSON } from "@/lib/owner-publishing-http";
let pool: Pool | undefined;
export function getOwnerPublishingService() {
  const config = getAuthConfiguration();
  pool ??= new Pool({ connectionString: explicitVerifyFullSSL(config.databaseURL), connectionTimeoutMillis: 10000, query_timeout: 15000 });
  return createClientProjectPublicationService(pool);
}
export async function handleOwnerPublishing(request: Request) {
  try {
    // Deny before creating the data pool or loading workspace/publication records.
    if (!(await getOwnerSession(request.headers))) return ownerPublishingJSON({ error: "Owner access required" },401);
    const config = getAuthConfiguration();
    return createOwnerPublishingController({ verifyOwner: getOwnerSession, service: getOwnerPublishingService(), origin: new URL(config.baseURL).origin })(request);
  } catch { return ownerPublishingJSON({ error: "Publishing is temporarily unavailable" },503); }
}
