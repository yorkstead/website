import { afterAll, expect, test } from "bun:test";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { createCustomerAuthOptions } from "@/lib/customer-auth";
import { createClientOnboardingService } from "@/lib/client-onboarding";
import {
  createCustomerEnrollmentService,
  customerEnrollmentEnabled,
  unavailableEnrollmentDelivery,
} from "@/lib/customer-enrollment";
import { createEnrollmentController } from "@/lib/customer-enrollment-http";
import { getCustomerProjectAccess } from "@/lib/customer-portal-authorization";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { handleCustomerEnrollment } from "@/lib/customer-enrollment-runtime";

const dbTest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const authPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
  options: "-c search_path=customer_auth",
});
const origin = "http://localhost:3100",
  password = "fictional-enrollment-password-7ac319";
const auth = betterAuth(
  createCustomerAuthOptions(
    {
      baseURL: origin,
      databaseURL:
        process.env.TEST_DATABASE_URL ?? "postgresql://localhost/disposable",
      secret: "fictional-enrollment-auth-secret-3189a7c9531a",
    },
    authPool,
  ),
);
const verify = (headers: Headers) =>
  auth.api.getSession({ headers, query: { disableCookieCache: true } });
const onboarding = createClientOnboardingService(
  pool,
  async () => ({ user: { id: "fictional-enrollment-owner" } }),
  verify,
);
const mailbox = new Map<string, string>();
const delivery = {
  async send({ recipient, proof }: { recipient: string; proof: string }) {
    if (!recipient.endsWith("@example.test")) throw new Error("Not synthetic");
    mailbox.set(recipient, proof);
  },
};
const hash = async (p: string) => (await auth.$context).password.hash(p);
const enrollment = createCustomerEnrollmentService(pool, delivery, hash);
const controller = createEnrollmentController({
  enabled: () => true,
  origin,
  enrollment,
  onboarding,
  auth: auth.api,
});
afterAll(async () => {
  await Promise.all([pool.end(), authPool.end()]);
});
async function fixture() {
  const id = crypto.randomUUID(),
    tenant = `enrollment-${id}`,
    project = `enrollment-project-${id}`,
    email = `${id}@example.test`;
  await pool.query(
    "INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional enrollment','active')",
    [tenant],
  );
  await pool.query(
    "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active')",
    [tenant, project],
  );
  const invitation = await onboarding.issue(new Headers(), {
    tenantId: tenant,
    projectIds: [project],
    recipientEmail: email,
  });
  return { tenant, project, email, ...invitation };
}
const request = (
  operation: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  controller(
    new Request(`${origin}/api/customer-enrollment/${operation}`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    operation,
  );
const cookies = (r: Response) =>
  new Headers({
    cookie: r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  });
async function proof(f: Awaited<ReturnType<typeof fixture>>) {
  const challenge = await enrollment.begin(f.token);
  return {
    token: f.token,
    challengeId: challenge.challengeId,
    proof: mailbox.get(f.email)!,
    password,
  };
}

test("production/default gates deny even with disposable opt-in", async () => {
  expect(
    customerEnrollmentEnabled({
      NODE_ENV: "production",
      CUSTOMER_ENROLLMENT_DISPOSABLE: "enabled",
      DATABASE_URL: "postgresql://localhost/cc007_test",
      TEST_DATABASE_URL: "postgresql://localhost/cc007_test",
    }),
  ).toBe(false);
  expect(customerEnrollmentEnabled({ NODE_ENV: "test" })).toBe(false);
  expect(
    customerEnrollmentEnabled({
      NODE_ENV: "test",
      CUSTOMER_ENROLLMENT_DISPOSABLE: "enabled",
      DATABASE_URL: "postgresql://remote/cc007_test",
      TEST_DATABASE_URL: "postgresql://remote/cc007_test",
    }),
  ).toBe(false);
  expect(
    (
      await handleCustomerEnrollment(
        new Request(`${origin}/api/customer-enrollment/begin`),
        "begin",
      )
    ).status,
  ).toBe(404);
});
dbTest(
  "independent delivered proof creates first account, real session and explicit project grant",
  async () => {
    const f = await fixture(),
      challenge = await proof(f);
    expect(
      (
        await pool.query('SELECT id FROM customer_auth."user" WHERE email=$1', [
          f.email,
        ])
      ).rowCount,
    ).toBe(0);
    const wrong = await request("complete", {
      ...challenge,
      proof: "A".repeat(43),
    });
    expect(wrong.status).toBe(400);
    expect(
      (
        await pool.query('SELECT id FROM customer_auth."user" WHERE email=$1', [
          f.email,
        ])
      ).rowCount,
    ).toBe(0);
    const response = await request("complete", challenge);
    expect(response.status).toBe(200);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const session = await verify(cookies(response));
    expect(session?.user.emailVerified).toBe(true);
    const access = await getCustomerProjectAccess(
      pool,
      {
        provider: customerAuthBoundary.identityProvider,
        subject: session!.user.id,
      },
      f.project,
    );
    expect(access?.tenantId).toBe(f.tenant);
    const other = await fixture();
    expect(
      await getCustomerProjectAccess(
        pool,
        {
          provider: customerAuthBoundary.identityProvider,
          subject: session!.user.id,
        },
        other.project,
      ),
    ).toBeNull();
    expect((await request("complete", challenge)).status).toBe(400);
    const stored = JSON.stringify(
      (
        await pool.query(
          "SELECT * FROM customer_enrollment_challenges WHERE id=$1",
          [challenge.challengeId],
        )
      ).rows,
    );
    expect(stored).not.toContain(challenge.proof);
    expect(stored).not.toContain(f.token);
    const out = await request(
      "sign-out",
      {},
      { cookie: cookies(response).get("cookie")! },
    );
    expect(out.ok).toBe(true);
    expect(await verify(cookies(response))).toBeNull();
    const signed = await request("sign-in", { email: f.email, password });
    expect(signed.status).toBe(200);
    await pool.query(
      'UPDATE customer_auth."session" SET "expiresAt"=now()-interval \'1 second\' WHERE id=$1',
      [(await verify(cookies(signed)))!.session.id],
    );
    expect(await verify(cookies(signed))).toBeNull();
  },
  20000,
);
dbTest(
  "proof belongs to exact invitation; concurrent proof consumers create only one account",
  async () => {
    const a = await fixture(),
      b = await fixture(),
      challenge = await proof(a);
    await expect(
      enrollment.complete({ ...challenge, token: b.token }),
    ).rejects.toThrow();
    const results = await Promise.allSettled([
      enrollment.complete(challenge),
      enrollment.complete(challenge),
      enrollment.complete(challenge),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (
        await pool.query('SELECT id FROM customer_auth."user" WHERE email=$1', [
          a.email,
        ])
      ).rowCount,
    ).toBe(1);
    // Interrupted before authentication/provisioning: account exists, but no grant; normal sign-in resumes.
    expect(
      (
        await pool.query(
          "SELECT * FROM customer_project_grants WHERE tenant_id=$1",
          [a.tenant],
        )
      ).rowCount,
    ).toBe(0);
    const signed = await request("sign-in", { email: a.email, password });
    expect(
      (
        await request(
          "redeem",
          { token: a.token },
          { cookie: cookies(signed).get("cookie")! },
        )
      ).status,
    ).toBe(200);
  },
  20000,
);
dbTest(
  "existing verified account keeps password and subject; unverified and disabled accounts fail closed",
  async () => {
    const f = await fixture();
    const first = await request("complete", await proof(f));
    const subject = (await verify(cookies(first)))!.user.id;
    const second = await onboarding.issue(new Headers(), {
      tenantId: f.tenant,
      projectIds: [f.project],
      recipientEmail: f.email,
    });
    // Synthetic fixture: advance prior challenge creation to allow a second delivery.
    await pool.query(
      "UPDATE customer_enrollment_challenges SET created_at=created_at-interval '61 seconds',expires_at=expires_at-interval '61 seconds' WHERE invitation_id=$1",
      [f.invitation.id],
    );
    const challenge = await proof({ ...f, ...second });
    expect(
      (
        await request("complete", {
          ...challenge,
          password: "different-fictional-password",
        })
      ).status,
    ).toBe(400);
    const signed = await request("sign-in", { email: f.email, password });
    expect((await verify(cookies(signed)))!.user.id).toBe(subject);
    expect(
      (
        await request(
          "redeem",
          { token: second.token },
          { cookie: cookies(signed).get("cookie")! },
        )
      ).status,
    ).toBe(200);
    await pool.query(
      'UPDATE customer_auth."user" SET "emailVerified"=false WHERE id=$1',
      [subject],
    );
    expect(
      (await request("sign-in", { email: f.email, password })).status,
    ).toBe(400);
    await pool.query(
      'UPDATE customer_auth."user" SET "emailVerified"=true WHERE id=$1',
      [subject],
    );
    await pool.query(
      "UPDATE customer_identities SET status='disabled' WHERE auth_subject=$1 AND auth_provider=$2",
      [subject, customerAuthBoundary.identityProvider],
    );
    expect(
      (await request("sign-in", { email: f.email, password })).status,
    ).toBe(400);
  },
  20000,
);
dbTest(
  "expired/revoked/superseded invitations, expired proofs and inactive scopes deny",
  async () => {
    for (const state of [
      "revoked",
      "superseded",
      "proof-expired",
      "tenant-suspended",
      "project-archived",
    ]) {
      const f = await fixture(),
        challenge = await proof(f);
      if (state === "revoked")
        await onboarding.revoke(new Headers(), f.invitation.id);
      if (state === "superseded")
        await onboarding.issue(new Headers(), {
          tenantId: f.tenant,
          projectIds: [f.project],
          recipientEmail: f.email,
        });
      if (state === "proof-expired")
        await pool.query(
          "UPDATE customer_enrollment_challenges SET created_at=created_at-interval '11 minutes',expires_at=expires_at-interval '11 minutes' WHERE id=$1",
          [challenge.challengeId],
        );
      if (state === "tenant-suspended")
        await pool.query(
          "UPDATE customer_tenants SET status='suspended' WHERE id=$1",
          [f.tenant],
        );
      if (state === "project-archived")
        await pool.query(
          "UPDATE customer_tenant_projects SET status='archived' WHERE project_id=$1",
          [f.project],
        );
      await expect(enrollment.complete(challenge)).rejects.toThrow();
      expect(
        (
          await pool.query(
            'SELECT id FROM customer_auth."user" WHERE email=$1',
            [f.email],
          )
        ).rowCount,
      ).toBe(0);
    }
  },
  20000,
);
dbTest(
  "delivery unavailable denies without account creation, signup stays blocked, CSRF and shared limits enforced",
  async () => {
    const f = await fixture();
    await expect(
      createCustomerEnrollmentService(
        pool,
        unavailableEnrollmentDelivery,
        hash,
      ).begin(f.token),
    ).rejects.toThrow();
    expect(
      (
        await pool.query('SELECT id FROM customer_auth."user" WHERE email=$1', [
          f.email,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await auth.api.signUpEmail({
          body: { email: f.email, name: "Fictional", password },
          asResponse: true,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await request(
          "begin",
          { token: f.token },
          { origin: "https://attacker.test" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "begin",
          { token: f.token },
          { "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          "begin",
          { token: f.token },
          { "content-type": "text/plain" },
        )
      ).status,
    ).toBe(403);
    const key = crypto.randomUUID();
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () => enrollment.limit(key, 3)),
    );
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(
      JSON.stringify(
        await (await request("begin", { token: "A".repeat(43) })).json(),
      ),
    ).not.toContain(f.email);
  },
  20000,
);
dbTest(
  "bootstrap transaction failure restores challenge and leaves no partial user or identity",
  async () => {
    const f = await fixture(),
      challenge = await proof(f);
    const failing = {
      query: pool.query.bind(pool),
      connect: async () => {
        const client = await pool.connect();
        return new Proxy(client, {
          get(target, key) {
            if (key === "query")
              return async (sql: string, values?: unknown[]) => {
                if (sql.includes('INSERT INTO customer_auth."account"'))
                  throw new Error("Synthetic write failure");
                return target.query(sql, values);
              };
            const v = Reflect.get(target, key);
            return typeof v === "function" ? v.bind(target) : v;
          },
        });
      },
    };
    await expect(
      createCustomerEnrollmentService(failing, delivery, hash).complete(
        challenge,
      ),
    ).rejects.toThrow("Synthetic write failure");
    expect(
      (
        await pool.query('SELECT id FROM customer_auth."user" WHERE email=$1', [
          f.email,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await pool.query(
          "SELECT consumed_at FROM customer_enrollment_challenges WHERE id=$1",
          [challenge.challengeId],
        )
      ).rows[0].consumed_at,
    ).toBeNull();
    expect((await request("complete", challenge)).status).toBe(200);
  },
  20000,
);

dbTest(
  "0013 prepared-protocol repeatable upgrade preserves preexisting data",
  async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { parseMigration } = await import("@/scripts/migration-plan");
    const client = await pool.connect(),
      schema = `enrollment_upgrade_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      for (const file of (await readdir("migrations"))
        .filter((f) => f.endsWith(".sql") && f < "0013")
        .sort()) {
        for (const text of parseMigration(
          file,
          await readFile(`migrations/${file}`, "utf8"),
        ).statements)
          await client.query({ text, name: crypto.randomUUID() });
      }
      await client.query(
        "INSERT INTO workspaces(id,data) VALUES ('fictional-upgrade',$1)",
        [{ projects: [{ id: "fictional-project" }] }],
      );
      await client.query(
        "INSERT INTO customer_tenants(id,name,status) VALUES ('fictional-upgrade','Fictional','active')",
      );
      await client.query(
        "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ('fictional-upgrade','fictional-project','active')",
      );
      await client.query(
        "SELECT set_config('yorkstead.provisioning_actor','fictional-owner',true),set_config('yorkstead.provisioning_role','owner_internal',true)",
      );
      await client.query(
        "INSERT INTO customer_invitations(tenant_id,recipient_email,token_verifier,issued_by,expires_at) VALUES ('fictional-upgrade','upgrade@example.test',repeat('a',64),'fictional-owner',clock_timestamp()+interval '1 day')",
      );
      await client.query(
        "INSERT INTO customer_invitation_projects(invitation_id,tenant_id,project_id) SELECT id,tenant_id,'fictional-project' FROM customer_invitations",
      );
      const tables = [
        "workspaces",
        "customer_tenants",
        "customer_tenant_projects",
        "customer_invitations",
        "customer_invitation_projects",
        "customer_provisioning_audit",
      ];
      const before = await Promise.all(
        tables.map(
          async (t) =>
            (await client.query(`SELECT * FROM ${t} ORDER BY 1`)).rows,
        ),
      );
      const migration = parseMigration(
        "0013_customer-enrollment.sql",
        await readFile("migrations/0013_customer-enrollment.sql", "utf8"),
      );
      for (let repeat = 0; repeat < 2; repeat++)
        for (const text of migration.statements)
          await client.query({ text, name: crypto.randomUUID() });
      expect(
        await Promise.all(
          tables.map(
            async (t) =>
              (await client.query(`SELECT * FROM ${t} ORDER BY 1`)).rows,
          ),
        ),
      ).toEqual(before);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  },
  20000,
);

dbTest(
  "unverified existing account cannot be claimed and lifecycle races never provision revoked access",
  async () => {
    const f = await fixture(),
      challenge = await proof(f),
      subject = crypto.randomUUID();
    await pool.query(
      'INSERT INTO customer_auth."user"(id,name,email,"emailVerified") VALUES ($1,\'Fictional unverified\',$2,false)',
      [subject, f.email],
    );
    await expect(enrollment.complete(challenge)).rejects.toThrow();
    expect(
      (
        await pool.query(
          'SELECT "emailVerified" FROM customer_auth."user" WHERE id=$1',
          [subject],
        )
      ).rows[0].emailVerified,
    ).toBe(false);
    expect(
      (
        await pool.query(
          "SELECT * FROM customer_identities WHERE auth_subject=$1",
          [subject],
        )
      ).rowCount,
    ).toBe(0);
    const other = await fixture(),
      otherProof = await proof(other);
    await Promise.allSettled([
      enrollment.complete(otherProof),
      onboarding.revoke(new Headers(), other.invitation.id),
    ]);
    const signed = await request("sign-in", { email: other.email, password });
    if (signed.ok)
      expect(
        (
          await request(
            "redeem",
            { token: other.token },
            { cookie: cookies(signed).get("cookie")! },
          )
        ).status,
      ).toBe(400);
    expect(
      (
        await pool.query(
          "SELECT * FROM customer_project_grants WHERE tenant_id=$1",
          [other.tenant],
        )
      ).rowCount,
    ).toBe(0);
  },
  20000,
);
