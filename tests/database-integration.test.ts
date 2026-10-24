import { afterAll, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, type PoolClient } from "pg";
import { createCustomerAuthOptions } from "@/lib/customer-auth";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { getCustomerProjectAccess } from "@/lib/customer-portal-authorization";
import { resolveCustomerProjectAccessForRequest } from "@/lib/customer-session-authorization";

const databaseURL = process.env.TEST_DATABASE_URL;
const databaseTest = databaseURL ? test : test.skip;
const pool = databaseURL ? new Pool({ connectionString: databaseURL }) : null;

async function expectPostgresError(query: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await query;
  } catch (error) {
    caught = error;
  }
  expect(caught).toMatchObject({ code });
}

async function expectPostgresErrorAtSavepoint(client: PoolClient, query: () => Promise<unknown>, code: string) {
  await client.query("SAVEPOINT expected_error");
  await expectPostgresError(query(), code);
  await client.query("ROLLBACK TO SAVEPOINT expected_error");
  await client.query("RELEASE SAVEPOINT expected_error");
}

afterAll(async () => {
  await pool?.end();
});

describe("PostgreSQL migration integration", () => {
  databaseTest("records every tracked migration with a complete checksum", async () => {
    const expected = readdirSync(resolve(process.cwd(), "migrations")).filter((name) => name.endsWith(".sql")).length;
    const result = await pool!.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM application_migrations WHERE char_length(checksum) = 64");
    expect(result.rows[0]?.count).toBe(expected);
  });

  databaseTest("enforces inquiry status and snapshot relationship constraints", async () => {
    await expectPostgresError(
      pool!.query("INSERT INTO contact_inquiries (name, email, message, ip_hash, status) VALUES ($1, $2, $3, $4, $5)", ["Test", "test@example.com", "Test message", "test-hash", "invalid"]),
      "23514",
    );
    await expectPostgresError(
      pool!.query("INSERT INTO workspace_snapshots (workspace_id, data) VALUES ($1, $2::jsonb)", ["missing-workspace", "{}"]),
      "23503",
    );
  });

  databaseTest("enforces tenant-scoped customer project authorization", async () => {
    const client = await pool!.connect();
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const identityA = `identity-a-${suffix}`;
    const identityB = `identity-b-${suffix}`;
    const tenantA = `tenant-a-${suffix}`;
    const tenantB = `tenant-b-${suffix}`;
    const projectA = `project-a-${suffix}`;
    const projectB = `project-b-${suffix}`;
    const provider = customerAuthBoundary.identityProvider;
    const subjectA = `credential-a-${suffix}`;
    const subjectB = `credential-b-${suffix}`;

    await client.query("BEGIN");
    try {
      await client.query(
        "INSERT INTO customer_identities (id, auth_provider, auth_subject, email, status) VALUES ($1, $2, $3, $4, 'active'), ($5, $2, $6, $7, 'active')",
        [identityA, provider, subjectA, `a-${suffix}@example.test`, identityB, subjectB, `b-${suffix}@example.test`],
      );
      await client.query(
        "INSERT INTO customer_tenants (id, name, status) VALUES ($1, $2, 'active'), ($3, $4, 'active')",
        [tenantA, `Tenant A ${suffix}`, tenantB, `Tenant B ${suffix}`],
      );
      await client.query(
        "INSERT INTO customer_tenant_memberships (tenant_id, identity_id, status) VALUES ($1, $2, 'active'), ($3, $4, 'active')",
        [tenantA, identityA, tenantB, identityB],
      );
      await client.query(
        "INSERT INTO customer_tenant_projects (tenant_id, project_id, status) VALUES ($1, $2, 'active'), ($3, $4, 'active')",
        [tenantA, projectA, tenantB, projectB],
      );
      await client.query(
        "INSERT INTO customer_project_grants (tenant_id, project_id, identity_id, status) VALUES ($1, $2, $3, 'active'), ($4, $5, $6, 'active')",
        [tenantA, projectA, identityA, tenantB, projectB, identityB],
      );

      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toMatchObject({
        identityId: identityA,
        tenantId: tenantA,
        projectId: projectA,
      });
      expect(await resolveCustomerProjectAccessForRequest(
        client,
        new Headers(),
        projectA,
        {
          enabled: true,
          verifySession: async () => ({
            user: { id: subjectA },
            session: { expiresAt: new Date(Date.now() + 60_000) },
          }),
        },
      )).toMatchObject({ identityId: identityA, tenantId: tenantA, projectId: projectA });
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectB)).toBeNull();
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectB }, projectA)).toBeNull();

      await client.query("DELETE FROM customer_project_grants WHERE tenant_id = $1 AND project_id = $2 AND identity_id = $3", [tenantA, projectA, identityA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query(
        "INSERT INTO customer_project_grants (tenant_id, project_id, identity_id, status) VALUES ($1, $2, $3, 'active')",
        [tenantA, projectA, identityA],
      );

      await client.query("DELETE FROM customer_tenant_memberships WHERE tenant_id = $1 AND identity_id = $2", [tenantA, identityA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query(
        "INSERT INTO customer_tenant_memberships (tenant_id, identity_id, status) VALUES ($1, $2, 'active')",
        [tenantA, identityA],
      );
      await client.query(
        "INSERT INTO customer_project_grants (tenant_id, project_id, identity_id, status) VALUES ($1, $2, $3, 'active')",
        [tenantA, projectA, identityA],
      );

      await client.query("UPDATE customer_tenants SET status = 'suspended' WHERE id = $1", [tenantA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query("UPDATE customer_tenants SET status = 'disabled' WHERE id = $1", [tenantA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query("UPDATE customer_tenants SET status = 'active' WHERE id = $1", [tenantA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toMatchObject({
        identityId: identityA,
        tenantId: tenantA,
        projectId: projectA,
      });

      await client.query("UPDATE customer_identities SET status = 'disabled' WHERE id = $1", [identityA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query("UPDATE customer_identities SET status = 'active' WHERE id = $1", [identityA]);

      await client.query("UPDATE customer_tenant_memberships SET status = 'suspended' WHERE tenant_id = $1 AND identity_id = $2", [tenantA, identityA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query("UPDATE customer_tenant_memberships SET status = 'active' WHERE tenant_id = $1 AND identity_id = $2", [tenantA, identityA]);

      await client.query("UPDATE customer_tenant_projects SET status = 'archived' WHERE tenant_id = $1 AND project_id = $2", [tenantA, projectA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query("UPDATE customer_tenant_projects SET status = 'active' WHERE tenant_id = $1 AND project_id = $2", [tenantA, projectA]);

      await client.query("UPDATE customer_project_grants SET status = 'revoked' WHERE tenant_id = $1 AND project_id = $2 AND identity_id = $3", [tenantA, projectA, identityA]);
      expect(await getCustomerProjectAccess(client, { provider, subject: subjectA }, projectA)).toBeNull();
      await client.query("UPDATE customer_project_grants SET status = 'active' WHERE tenant_id = $1 AND project_id = $2 AND identity_id = $3", [tenantA, projectA, identityA]);

      await expectPostgresErrorAtSavepoint(
        client,
        () => client.query("INSERT INTO customer_tenant_projects (tenant_id, project_id, status) VALUES ($1, $2, 'active')", [tenantB, projectA]),
        "23505",
      );
      await expectPostgresErrorAtSavepoint(
        client,
        () => client.query("INSERT INTO customer_project_grants (tenant_id, project_id, identity_id, status) VALUES ($1, $2, $3, 'active')", [tenantB, projectA, identityB]),
        "23503",
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
  databaseTest("isolates customer auth persistence and rejects unprovisioned session creation", async () => {
    const client = await pool!.connect();
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const subject = `customer-auth-subject-${suffix}`;
    const identityId = `customer-auth-identity-${suffix}`;
    const configuration = {
      baseURL: "https://yorkstead.example",
      databaseURL: databaseURL!,
      secret: "0aB!1cD@2eF#3gH$4iJ%5kL^6mN&7pQ*8rS",
    };

    await client.query("BEGIN");
    try {
      const tables = await client.query<{ name: string }>(
        `SELECT table_name AS name
         FROM information_schema.tables
         WHERE table_schema = 'customer_auth'
         ORDER BY table_name`,
      );
      expect(tables.rows.map((row) => row.name)).toEqual([
        "account",
        "session",
        "user",
        "verification",
      ]);

      const options = createCustomerAuthOptions(configuration, client as unknown as Pool);
      expect(await options.databaseHooks.session.create.before({ userId: subject })).toBe(false);

      await client.query(
        "INSERT INTO customer_identities (id, auth_provider, auth_subject, email, status) VALUES ($1, $2, $3, $4, 'disabled')",
        [identityId, customerAuthBoundary.identityProvider, subject, `${suffix}@example.test`],
      );
      expect(await options.databaseHooks.session.create.before({ userId: subject })).toBe(false);

      await client.query("UPDATE customer_identities SET status = 'active' WHERE id = $1", [identityId]);
      expect(await options.databaseHooks.session.create.before({ userId: subject })).toBeUndefined();

      await client.query(
        `INSERT INTO customer_auth."user" ("id", "name", "email", "emailVerified") VALUES ($1, $2, $3, TRUE)`,
        [subject, "Customer Test", `auth-${suffix}@example.test`],
      );
      await client.query(
        `INSERT INTO customer_auth."session" ("id", "userId", "token", "expiresAt") VALUES ($1, $2, $3, NOW() - INTERVAL '1 minute'), ($4, $2, $5, NOW() + INTERVAL '1 hour')`,
        [`expired-${suffix}`, subject, `expired-token-${suffix}`, `active-${suffix}`, `active-token-${suffix}`],
      );
      const active = await client.query<{ token: string }>(
        `SELECT "token" FROM customer_auth."session" WHERE "userId" = $1 AND "expiresAt" > NOW()`,
        [subject],
      );
      expect(active.rows).toEqual([{ token: `active-token-${suffix}` }]);

      await client.query(`DELETE FROM customer_auth."session" WHERE "token" = $1`, [`active-token-${suffix}`]);
      const revoked = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM customer_auth."session" WHERE "token" = $1`,
        [`active-token-${suffix}`],
      );
      expect(revoked.rows[0]?.count).toBe(0);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

});
