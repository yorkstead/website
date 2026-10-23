import { describe, expect, test } from "bun:test";
import {
  customerPortalCapabilities,
  customerProjectAuthorizationQuery,
  getCustomerProjectAccess,
  type CustomerAuthorizationDatabase,
  type CustomerProjectAccess,
} from "@/lib/customer-portal-authorization";

type AccessFixture = CustomerProjectAccess & {
  provider: string;
  subject: string;
};

function fixtureDatabase(fixtures: AccessFixture[]) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const database = {
    query: async (text: string, values: unknown[] = []) => {
      calls.push({ text, values });
      const [provider, subject, projectId] = values;
      const match = fixtures.find((fixture) =>
        fixture.provider === provider &&
        fixture.subject === subject &&
        fixture.projectId === projectId
      );
      if (!match) return { rows: [] };
      const { provider: _provider, subject: _subject, ...access } = match;
      return { rows: [access] };
    },
  } as unknown as CustomerAuthorizationDatabase;

  return { database, calls };
}

const customerA: AccessFixture = {
  provider: "future-auth",
  subject: "credential-customer-a",
  identityId: "identity-a",
  tenantId: "tenant-a",
  projectId: "project-a",
  role: "member",
  permission: "view",
};

const customerB: AccessFixture = {
  provider: "future-auth",
  subject: "credential-customer-b",
  identityId: "identity-b",
  tenantId: "tenant-b",
  projectId: "project-b",
  role: "admin",
  permission: "view",
};

describe("customer portal capability boundary", () => {
  test("keeps every customer-facing delivery capability disabled", () => {
    expect(customerPortalCapabilities).toEqual({
      login: false,
      invitations: false,
      publishedUpdates: false,
      documentSharing: false,
    });
  });
});

describe("customer project authorization", () => {
  test("allows a customer's credential subject to resolve its explicit project grant", async () => {
    const { database, calls } = fixtureDatabase([customerA, customerB]);

    const access = await getCustomerProjectAccess(
      database,
      { provider: "FUTURE-AUTH", subject: customerA.subject },
      customerA.projectId,
    );

    expect(access).toEqual({
      identityId: "identity-a",
      tenantId: "tenant-a",
      projectId: "project-a",
      role: "member",
      permission: "view",
    });
    expect(calls[0]?.values).toEqual(["future-auth", customerA.subject, customerA.projectId]);
  });

  test("does not let one customer's credentials resolve another customer's project", async () => {
    const { database } = fixtureDatabase([customerA, customerB]);

    expect(await getCustomerProjectAccess(
      database,
      { provider: customerA.provider, subject: customerA.subject },
      customerB.projectId,
    )).toBeNull();

    expect(await getCustomerProjectAccess(
      database,
      { provider: customerB.provider, subject: customerB.subject },
      customerA.projectId,
    )).toBeNull();
  });

  test("rejects empty or non-canonical identifiers before database access", async () => {
    const { database, calls } = fixtureDatabase([customerA]);

    expect(await getCustomerProjectAccess(database, { provider: "", subject: customerA.subject }, customerA.projectId)).toBeNull();
    expect(await getCustomerProjectAccess(database, { provider: customerA.provider, subject: ` ${customerA.subject}` }, customerA.projectId)).toBeNull();
    expect(await getCustomerProjectAccess(database, { provider: customerA.provider, subject: customerA.subject }, `${customerA.projectId} `)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test("requires every identity, membership, project, and grant status to be active", () => {
    expect(customerProjectAuthorizationQuery).toContain("identity.status = 'active'");
    expect(customerProjectAuthorizationQuery).toContain("membership.status = 'active'");
    expect(customerProjectAuthorizationQuery).toContain("project.status = 'active'");
    expect(customerProjectAuthorizationQuery).toContain("grant_record.status = 'active'");
    expect(customerProjectAuthorizationQuery).toContain("grant_record.tenant_id = membership.tenant_id");
    expect(customerProjectAuthorizationQuery).toContain("grant_record.identity_id = identity.id");
  });
});
