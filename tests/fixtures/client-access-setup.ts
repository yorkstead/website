// Disposable test process only. Reuses the established owner authentication fixture.
import { Pool } from "pg";
import { setupOwnerPublishingFixture } from "./owner-publishing-setup";
import { createClientOnboardingService } from "../../lib/client-onboarding";
export async function setupClientAccessFixture() {
  const { projectId } = await setupOwnerPublishingFixture();
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const tenantId = (
      await pool.query(
        "SELECT tenant_id FROM customer_tenant_projects WHERE project_id=$1",
        [projectId],
      )
    ).rows[0].tenant_id;
    const identityId = `cc010-${crypto.randomUUID()}`;
    await pool.query(
      "INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,'fixture',$1,'fictional-access@example.test','active')",
      [identityId],
    );
    await pool.query(
      "INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'active')",
      [tenantId, identityId],
    );
    await pool.query(
      "INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ($1,$2,$3,'active')",
      [tenantId, projectId, identityId],
    );
    const service = createClientOnboardingService(pool, async () => ({
      user: { id: "fictional-cc010-fixture-owner" },
    }));
    // Issuance is isolated here; application administration never imports this fixture or issues tokens.
    await service.issue(new Headers(), {
      tenantId,
      recipientEmail: "fictional-invited@example.test",
      projectIds: [projectId],
    });
    return { projectId, tenantId, identityId };
  } finally {
    await pool.end();
  }
}
