import { afterAll, expect, test } from "bun:test";
import { Pool, type PoolClient } from "pg";
import {
  customerProjectAuthorizationListQuery,
  listCustomerProjectAccess,
  getCustomerProjectSelection,
  type CustomerAuthorizationDatabase,
} from "@/lib/customer-portal-authorization";

const databaseTest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
afterAll(() => pool.end());

async function fixture(
  work: (
    client: PoolClient,
    f: {
      credentials: { provider: string; subject: string };
      identity: string;
      tenants: string[];
      projects: string[];
    },
  ) => Promise<void>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = crypto.randomUUID(),
      identity = `list-identity-${id}`;
    const credentials = { provider: "list-test", subject: `subject-${id}` };
    const tenants = ["a", "b", "c"].map((t) => `list-${id}-${t}`);
    const projects = ["a", "b", "c"].map((p) => `list-project-${id}-${p}`);
    await client.query(
      "INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,$2,$3,$4,'active'),($5,$2,$5,$6,'active')",
      [
        identity,
        credentials.provider,
        credentials.subject,
        `${id}@example.test`,
        `other-${id}`,
        `other-${id}@example.test`,
      ],
    );
    for (let i = 0; i < tenants.length; i++) {
      await client.query(
        "INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional list tenant','active')",
        [tenants[i]],
      );
      await client.query(
        "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active')",
        [tenants[i], projects[i]],
      );
      await client.query(
        "INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'active')",
        [tenants[i], identity],
      );
      if (i < 2)
        await client.query(
          "INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ($1,$2,$3,'active')",
          [tenants[i], projects[i], identity],
        );
    }
    // Another customer's project must not appear even with an active tenant membership.
    await client.query(
      "INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'active')",
      [tenants[2], `other-${id}`],
    );
    await client.query(
      "INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ($1,$2,$3,'active')",
      [tenants[2], projects[2], `other-${id}`],
    );
    await work(client, { credentials, identity, tenants, projects });
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

test("list binds credentials as parameters and rejects invalid subjects before querying", async () => {
  const calls: unknown[][] = [];
  const database = {
    query: async (...args: unknown[]) => {
      calls.push(args);
      return { rows: [] };
    },
  } as unknown as CustomerAuthorizationDatabase;
  const subject = "subject' OR true --";
  expect(
    await listCustomerProjectAccess(database, {
      provider: "LIST-TEST",
      subject,
    }),
  ).toEqual([]);
  expect(calls).toEqual([
    [customerProjectAuthorizationListQuery, ["list-test", subject]],
  ]);
  expect(customerProjectAuthorizationListQuery).not.toContain(subject);
  for (const credentials of [
    { provider: "", subject },
    { provider: "list-test", subject: "" },
    { provider: "list-test", subject: " spaced " },
  ]) {
    expect(await listCustomerProjectAccess(database, credentials)).toEqual([]);
  }
  expect(calls).toHaveLength(1);
});

databaseTest(
  "one subject lists explicit projects across multiple tenants, excluding another customer's grant",
  () =>
    fixture(async (client, f) => {
      const rows = await listCustomerProjectAccess(client, f.credentials);
      expect(rows.map((r) => [r.tenantId, r.projectId])).toEqual([
        [f.tenants[0], f.projects[0]],
        [f.tenants[1], f.projects[1]],
      ]);
      expect(
        rows.every(
          (r) => r.identityId === f.identity && r.permission === "view",
        ),
      ).toBe(true);
      const selection = await getCustomerProjectSelection(
        client,
        f.credentials,
        f.projects[1],
      );
      expect(selection.selected?.tenantId).toBe(f.tenants[1]);
    }),
);

databaseTest(
  "removed grants disappear from fresh lists and cannot fall back to another authorized project",
  () =>
    fixture(async (client, f) => {
      expect(
        await listCustomerProjectAccess(client, f.credentials),
      ).toHaveLength(2);
      await client.query(
        "DELETE FROM customer_project_grants WHERE identity_id=$1 AND project_id=$2",
        [f.identity, f.projects[0]],
      );
      const selection = await getCustomerProjectSelection(
        client,
        f.credentials,
        f.projects[0],
      );
      expect(selection.projects.map((r) => r.projectId)).toEqual([
        f.projects[1],
      ]);
      expect(selection.selected).toBeNull();
    }),
);

databaseTest(
  "suspended membership removes only that tenant's projects and rejects its selection",
  () =>
    fixture(async (client, f) => {
      await client.query(
        "UPDATE customer_tenant_memberships SET status='suspended' WHERE identity_id=$1 AND tenant_id=$2",
        [f.identity, f.tenants[0]],
      );
      const selection = await getCustomerProjectSelection(
        client,
        f.credentials,
        f.projects[0],
      );
      expect(selection.projects.map((r) => r.tenantId)).toEqual([f.tenants[1]]);
      expect(selection.selected).toBeNull();
    }),
);

databaseTest(
  "unauthorized, unknown, empty and injection-like project selectors deny without fallback",
  () =>
    fixture(async (client, f) => {
      for (const project of [f.projects[2], "unknown", "", "' OR true --"]) {
        const selection = await getCustomerProjectSelection(
          client,
          f.credentials,
          project,
        );
        expect(selection.projects).toHaveLength(2);
        expect(selection.selected).toBeNull();
      }
      expect(
        (await getCustomerProjectSelection(client, f.credentials)).selected
          ?.projectId,
      ).toBe(f.projects[0]);
    }),
);

databaseTest(
  "list requires active identity, tenant, project mapping and grant",
  () =>
    fixture(async (client, f) => {
      for (const [table, column, id, state] of [
        ["customer_tenants", "id", f.tenants[0], "suspended"],
        ["customer_tenant_projects", "project_id", f.projects[0], "archived"],
        ["customer_project_grants", "project_id", f.projects[0], "revoked"],
      ]) {
        await client.query(`UPDATE ${table} SET status=$1 WHERE ${column}=$2`, [
          state,
          id,
        ]);
        expect(
          (await listCustomerProjectAccess(client, f.credentials)).map(
            (r) => r.projectId,
          ),
        ).toEqual([f.projects[1]]);
        await client.query(
          `UPDATE ${table} SET status='active' WHERE ${column}=$1`,
          [id],
        );
      }
      await client.query(
        "UPDATE customer_identities SET status='disabled' WHERE id=$1",
        [f.identity],
      );
      expect(await listCustomerProjectAccess(client, f.credentials)).toEqual(
        [],
      );
    }),
);

databaseTest(
  "selected project is reauthorized after listing if a grant is revoked between queries",
  () =>
    fixture(async (client, f) => {
      const database = {
        query: async (text: string, values: unknown[]) => {
          const result = await client.query(text, values);
          if (text === customerProjectAuthorizationListQuery)
            await client.query(
              "UPDATE customer_project_grants SET status='revoked' WHERE identity_id=$1 AND project_id=$2",
              [f.identity, f.projects[0]],
            );
          return result;
        },
      } as CustomerAuthorizationDatabase;
      const selection = await getCustomerProjectSelection(
        database,
        f.credentials,
        f.projects[0],
      );
      expect(selection.projects).toHaveLength(2);
      expect(selection.selected).toBeNull();
    }),
);
