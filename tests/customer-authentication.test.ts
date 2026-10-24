import { describe, expect, test } from "bun:test";
import type { Pool } from "pg";
import { createCustomerAuthOptions } from "@/lib/customer-auth";
import {
  customerAuthBoundary,
  resolveCustomerAuthConfiguration,
  type CustomerAuthConfiguration,
} from "@/lib/customer-auth-config";
import {
  resolveCustomerProjectAccessForRequest,
  type VerifiedCustomerSession,
} from "@/lib/customer-session-authorization";
import type {
  CustomerAuthorizationDatabase,
  CustomerProjectAccess,
} from "@/lib/customer-portal-authorization";
import { GET, POST } from "@/app/api/customer-auth/[...all]/route";

const productionConfiguration: CustomerAuthConfiguration = {
  baseURL: "https://yorkstead.example",
  databaseURL: "postgresql://database.example/yorkstead",
  secret: "0aB!1cD@2eF#3gH$4iJ%5kL^6mN&7pQ*8rS",
};

type AccessFixture = CustomerProjectAccess & {
  provider: string;
  subject: string;
};

function fixtureDatabase(fixtures: AccessFixture[]) {
  const calls: unknown[][] = [];
  const database = {
    query: async (_text: string, values: unknown[] = []) => {
      calls.push(values);
      const [provider, subject, projectId] = values;
      const match = fixtures.find((fixture) =>
        fixture.provider === provider &&
        fixture.subject === subject &&
        fixture.projectId === projectId
      );
      return { rows: match ? [match] : [] };
    },
  } as unknown as CustomerAuthorizationDatabase;

  return { database, calls };
}

function session(subject: string, expiresAt = new Date(Date.now() + 60_000)): VerifiedCustomerSession {
  return {
    user: { id: subject },
    session: { expiresAt },
  };
}

const customerA: AccessFixture = {
  provider: customerAuthBoundary.identityProvider,
  subject: "customer-auth-user-a",
  identityId: "identity-a",
  tenantId: "tenant-a",
  projectId: "project-a",
  role: "member",
  permission: "view",
};

const customerB: AccessFixture = {
  provider: customerAuthBoundary.identityProvider,
  subject: "customer-auth-user-b",
  identityId: "identity-b",
  tenantId: "tenant-b",
  projectId: "project-b",
  role: "member",
  permission: "view",
};

describe("customer authentication configuration", () => {
  test("requires an independent production secret", () => {
    expect(() => resolveCustomerAuthConfiguration({
      BETTER_AUTH_URL: productionConfiguration.baseURL,
      DATABASE_URL: productionConfiguration.databaseURL,
    }, "production")).toThrow("CUSTOMER_AUTH_SECRET");

    expect(resolveCustomerAuthConfiguration({
      BETTER_AUTH_URL: productionConfiguration.baseURL,
      DATABASE_URL: productionConfiguration.databaseURL,
      CUSTOMER_AUTH_SECRET: productionConfiguration.secret,
    }, "production")).toEqual(productionConfiguration);
  });

  test("isolates customer auth from owner auth and disables account registration", async () => {
    const database = {
      query: async () => ({ rows: [{ authorized: false }] }),
    } as unknown as Pool;
    const options = createCustomerAuthOptions(productionConfiguration, database);

    expect(options.basePath).toBe("/api/customer-auth");
    expect(options.secret).toBe(productionConfiguration.secret);
    expect(options.secrets).toEqual([{ version: 1, value: productionConfiguration.secret }]);
    expect(options.advanced.cookiePrefix).toBe("yorkstead-customer");
    expect(options.advanced.cookiePrefix).not.toBe("better-auth");
    expect(options.emailAndPassword.disableSignUp).toBe(true);
    expect(options.emailAndPassword.requireEmailVerification).toBe(true);
    expect(options.session.expiresIn).toBe(60 * 60 * 8);
    expect(await options.databaseHooks.user.create.before()).toBe(false);
  });

  test("rejects session creation for unprovisioned customer auth subjects", async () => {
    const calls: unknown[][] = [];
    const database = {
      query: async (_text: string, values: unknown[]) => {
        calls.push(values);
        return { rows: [{ authorized: false }] };
      },
    } as unknown as Pool;
    const options = createCustomerAuthOptions(productionConfiguration, database);

    expect(await options.databaseHooks.session.create.before({ userId: "unprovisioned" })).toBe(false);
    expect(calls).toEqual([[customerAuthBoundary.identityProvider, "unprovisioned"]]);
  });
});

describe("disabled customer authentication route", () => {
  test("does not expose session or credential endpoints", async () => {
    for (const method of [GET, POST]) {
      const response = await method(new Request("https://yorkstead.example/api/customer-auth/sign-in/email", {
        method: method === GET ? "GET" : "POST",
      }));
      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "Not Found" });
    }
  });
});

describe("verified customer session authorization", () => {
  test("denies before session or project lookup while the capability is disabled", async () => {
    const { database, calls } = fixtureDatabase([customerA]);
    let verificationCalls = 0;

    const access = await resolveCustomerProjectAccessForRequest(
      database,
      new Headers(),
      customerA.projectId,
      {
        enabled: false,
        verifySession: async () => {
          verificationCalls += 1;
          return session(customerA.subject);
        },
      },
    );

    expect(access).toBeNull();
    expect(verificationCalls).toBe(0);
    expect(calls).toHaveLength(0);
  });

  test("denies missing, expired, and revoked sessions before project lookup", async () => {
    const { database, calls } = fixtureDatabase([customerA]);
    const deniedSessions: Array<VerifiedCustomerSession | null> = [
      null,
      session(customerA.subject, new Date("2020-01-01T00:00:00.000Z")),
      null,
    ];

    for (const deniedSession of deniedSessions) {
      expect(await resolveCustomerProjectAccessForRequest(
        database,
        new Headers(),
        customerA.projectId,
        {
          enabled: true,
          verifySession: async () => deniedSession,
          now: () => Date.parse("2026-10-23T00:00:00.000Z"),
        },
      )).toBeNull();
    }

    expect(calls).toHaveLength(0);
  });

  test("binds authorization to the verified subject and blocks impersonation", async () => {
    const { database, calls } = fixtureDatabase([customerA, customerB]);

    expect(await resolveCustomerProjectAccessForRequest(
      database,
      new Headers(),
      customerA.projectId,
      {
        enabled: true,
        verifySession: async () => session(customerA.subject),
      },
    )).toEqual(customerA);

    expect(await resolveCustomerProjectAccessForRequest(
      database,
      new Headers(),
      customerB.projectId,
      {
        enabled: true,
        verifySession: async () => session(customerA.subject),
      },
    )).toBeNull();

    expect(calls).toEqual([
      [customerAuthBoundary.identityProvider, customerA.subject, customerA.projectId],
      [customerAuthBoundary.identityProvider, customerA.subject, customerB.projectId],
    ]);
  });

  test("rejects non-canonical verified subjects", async () => {
    const { database, calls } = fixtureDatabase([customerA]);

    expect(await resolveCustomerProjectAccessForRequest(
      database,
      new Headers(),
      customerA.projectId,
      {
        enabled: true,
        verifySession: async () => session(` ${customerA.subject}`),
      },
    )).toBeNull();

    expect(calls).toHaveLength(0);
  });
});
