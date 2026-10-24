import { afterAll, expect, test } from "bun:test";
import { Pool } from "pg";
import { readFile, readdir } from "node:fs/promises";
import { createPortalReadinessService } from "@/lib/portal-readiness-service";
import { createReadinessInspector } from "@/lib/portal-readiness-adapters";
import { readinessMigrationManifest } from "@/lib/portal-readiness-migrations";
import { manualReadinessIds } from "@/lib/portal-readiness-catalog";
import { parseMigration } from "@/scripts/migration-plan";
import { syntheticInspection } from "./fixtures/portal-readiness-synthetic";
const dbtest = process.env.TEST_DATABASE_URL ? test : test.skip,
  pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const owner = async () => ({ user: { id: "fictional-readiness-owner" } }),
  headers = new Headers();
afterAll(() => pool.end());
function fixture() {
  let inspection = syntheticInspection(crypto.randomUUID()),
    offset = 0;
  const service = createPortalReadinessService(
    pool,
    async () => inspection,
    owner,
    true,
    () => new Date(Date.now() + offset),
  );
  return {
    service,
    get inspection() {
      return inspection;
    },
    set inspection(value) {
      inspection = value;
    },
    expire() {
      offset = 7200000;
    },
  };
}
async function operation(
  service: ReturnType<typeof createPortalReadinessService>,
  action: string,
  extra: Record<string, unknown> = {},
) {
  const v = await service.inspect(headers);
  return service.mutate(headers, {
    action,
    expectedRevision: v.revision,
    contextDigest: v.assessment.contextDigest,
    assessmentDigest: v.assessment.digest,
    confirmed: true,
    ...extra,
  });
}
async function qualify(f: ReturnType<typeof fixture>) {
  await operation(f.service, "verify");
  for (const requirementId of manualReadinessIds)
    await operation(f.service, "attest", { requirementId });
}
dbtest(
  "technical registry and manual attestations allow only global review; no customer eligibility or secrets",
  async () => {
    const f = fixture();
    await expect(operation(f.service, "approve")).rejects.toThrow(
      "unavailable",
    );
    await qualify(f);
    const qualified = await f.service.inspect(headers);
    expect(qualified.assessment.globalReady).toBe(true);
    await operation(f.service, "approve");
    const v = await f.service.inspect(headers);
    expect(v.assessment.decision.state).toBe("approved");
    expect(v.assessment.decision.current).toBe(true);
    expect(v.assessment.launchReady).toBe(false);
    expect(v.assessment.customerBlockers).toHaveLength(3);
    expect(v.audit.every((e) => e.actor === "fictional-readiness-owner")).toBe(
      true,
    );
    expect(v.audit.some((e) => e.event === "approved")).toBe(true);
    for (const forbidden of [
      "token_verifier",
      "password",
      "postgresql://",
      "recipient_email",
      "auth_subject",
    ])
      expect(JSON.stringify(v)).not.toContain(forbidden);
    await operation(f.service, "withdraw");
    expect((await f.service.inspect(headers)).assessment.decision.state).toBe(
      "withdrawn",
    );
  },
);
dbtest(
  "missing/expired/changed evidence, commit/schema/config invalidate approvals; history survives",
  async () => {
    const f = fixture();
    await qualify(f);
    await operation(f.service, "approve");
    f.expire();
    let v = await f.service.inspect(headers);
    expect(v.assessment.decision.state).toBe("stale");
    expect(v.assessment.globalReady).toBe(false);
    for (const key of [
      "codeRevision",
      "schemaIdentity",
      "configurationIdentity",
    ] as const) {
      const other = fixture();
      await qualify(other);
      await operation(other.service, "approve");
      const previous = other.inspection;
      other.inspection = {
        ...previous,
        context: {
          ...previous.context,
          [key]: key === "codeRevision" ? "f".repeat(40) : "f".repeat(64),
        },
      };
      v = await other.service.inspect(headers);
      expect(v.revision).toBe(0);
      expect(v.assessment.globalReady).toBe(false);
      expect(
        v.history.some(
          (h) =>
            h.codeRevision === previous.context.codeRevision &&
            h.decision === "stale",
        ),
      ).toBe(true);
    }
    const changed = fixture();
    await qualify(changed);
    await operation(changed.service, "approve");
    changed.inspection = {
      ...changed.inspection,
      facts: changed.inspection.facts.map((f) =>
        f.id === "email.provider" ? { ...f, status: "blocked" } : f,
      ),
    };
    expect(
      (await changed.service.inspect(headers)).assessment.decision.state,
    ).toBe("stale");
  },
);
dbtest(
  "manual acknowledgments cannot bypass technical failure, renewal invalidates decisions, CAS rejects stale and concurrent approvals",
  async () => {
    const blocked = fixture();
    blocked.inspection = {
      ...blocked.inspection,
      facts: blocked.inspection.facts.map((f) =>
        f.id === "email.provider" ? { ...f, status: "blocked" } : f,
      ),
    };
    await qualify(blocked);
    await operation(blocked.service, "acknowledge");
    expect(
      (await blocked.service.inspect(headers)).assessment.globalReady,
    ).toBe(false);
    await expect(operation(blocked.service, "approve")).rejects.toThrow(
      "unavailable",
    );
    await expect(
      operation(blocked.service, "attest", {
        requirementId: "production.secrets",
      }),
    ).rejects.toThrow();
    const f = fixture();
    await qualify(f);
    const v = await f.service.inspect(headers),
      input = {
        action: "approve",
        expectedRevision: v.revision,
        contextDigest: v.assessment.contextDigest,
        assessmentDigest: v.assessment.digest,
        confirmed: true,
      };
    const results = await Promise.allSettled([
      f.service.mutate(headers, input),
      f.service.mutate(headers, input),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(f.service.mutate(headers, input)).rejects.toThrow("changed");
    await operation(f.service, "verify");
    const renewed = await f.service.inspect(headers);
    expect(renewed.assessment.decision.state).toBe("none");
    expect(
      renewed.audit.some((a) => a.from === "approved" && a.to === "none"),
    ).toBe(true);
  },
);
dbtest(
  "append-only evidence/audit/context enforced and failed transactions leave no fabricated history",
  async () => {
    const f = fixture();
    await qualify(f);
    const v = await f.service.inspect(headers),
      review = (
        await pool.query(
          "SELECT id FROM portal_release_reviews WHERE context_digest=$1",
          [v.assessment.contextDigest],
        )
      ).rows[0];
    for (const table of ["portal_release_evidence", "portal_release_audit"]) {
      await expect(
        pool.query(`UPDATE ${table} SET actor_id='forged' WHERE review_id=$1`, [
          review.id,
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(`DELETE FROM ${table} WHERE review_id=$1`, [review.id]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(`TRUNCATE ${table} CASCADE`),
      ).rejects.toMatchObject({ code: "23514" });
    }
    await expect(
      pool.query("DELETE FROM portal_release_reviews WHERE id=$1", [review.id]),
    ).rejects.toMatchObject({ code: "23514" });
    const before = v.audit.length;
    await expect(
      operation(f.service, "approve", { actor: "forged" }),
    ).rejects.toThrow();
    expect((await f.service.inspect(headers)).audit).toHaveLength(before);
    await expect(
      createPortalReadinessService(
        pool,
        async () => f.inspection,
        owner,
        false,
      ).mutate(headers, {
        action: "verify",
        expectedRevision: v.revision,
        contextDigest: v.assessment.contextDigest,
        assessmentDigest: v.assessment.digest,
        confirmed: true,
      }),
    ).rejects.toThrow("unavailable");
  },
);
dbtest(
  "runtime adapters verify only disposable schema/code; production qualification remains unavailable without sending",
  async () => {
    const env = {
      NODE_ENV: "development" as const,
      PORTAL_READINESS_DISPOSABLE: "enabled",
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
      VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
      PORTAL_RELEASE_CONFIGURATION_ID: "b".repeat(64),
    };
    const service = createPortalReadinessService(
      pool,
      createReadinessInspector(env),
      owner,
      true,
    );
    await operation(service, "verify");
    const v = await service.inspect(headers);
    expect(
      v.assessment.requirements.find((r) => r.id === "schema.applied")?.status,
    ).toBe("passed");
    expect(
      v.assessment.requirements.find((r) => r.id === "code.disabled-routes")
        ?.status,
    ).toBe("passed");
    expect(
      v.assessment.requirements.find((r) => r.id === "email.provider")?.status,
    ).toBe("blocked");
    expect(
      v.assessment.requirements.find((r) => r.id === "production.secrets")
        ?.status,
    ).toBe("not_verified");
    expect(v.assessment.globalReady).toBe(false);
    const prod = createPortalReadinessService(
      pool,
      createReadinessInspector({ ...env, NODE_ENV: "production" }),
      owner,
    );
    const p = await prod.inspect(headers);
    expect(p.writesEnabled).toBe(false);
    expect(
      p.assessment.requirements.find((r) => r.id === "schema.applied")?.status,
    ).toBe("not_verified");
  },
);
dbtest(
  "0016 prepared-query upgrade retains all prior access/publication/admin history and checksums",
  async () => {
    const client = await pool.connect(),
      schema = `readiness_upgrade_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      for (const file of (await readdir("migrations"))
        .filter((f) => f.endsWith(".sql") && f < "0016")
        .sort())
        for (const text of parseMigration(
          file,
          await readFile(`migrations/${file}`, "utf8"),
        ).statements)
          await client.query({
            text,
            name: `readiness-${crypto.randomUUID()}`,
          });
      await client.query(
        "SELECT set_config('yorkstead.access_admin_actor','fictional-upgrade-owner',true)",
      );
      await client.query(
        "INSERT INTO customer_tenants(id,name,status) VALUES ('fictional-preserved','Fictional retained','suspended')",
      );
      const tables = [
        "customer_tenants",
        "customer_tenant_projects",
        "customer_identities",
        "customer_tenant_memberships",
        "customer_project_grants",
        "customer_invitations",
        "customer_provisioning_audit",
        "client_project_publications",
        "client_project_publication_audit",
        "client_access_admin_audit",
        "client_invitation_preparations",
      ];
      const before = [];
      for (const table of tables)
        before.push(
          (await client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows,
        );
      for (const text of parseMigration(
        "0016_customer-release-readiness.sql",
        await readFile(
          "migrations/0016_customer-release-readiness.sql",
          "utf8",
        ),
      ).statements)
        await client.query({ text, name: `readiness-${crypto.randomUUID()}` });
      const after = [];
      for (const table of tables)
        after.push(
          (await client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows,
        );
      expect(after).toEqual(before);
      expect(
        (await client.query("SELECT id FROM portal_release_reviews")).rows,
      ).toHaveLength(0);
      expect(readinessMigrationManifest).toHaveLength(16);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  },
  20000,
);

dbtest(
  "same-status live observation changes stale acknowledgments and reject old mutation digests",
  async () => {
    const f = fixture();
    f.inspection = {
      ...f.inspection,
      facts: f.inspection.facts.map((f) =>
        f.id === "email.provider" ? { ...f, status: "blocked" } : f,
      ),
    };
    await operation(f.service, "verify");
    await operation(f.service, "acknowledge");
    const before = await f.service.inspect(headers);
    const input = {
      action: "acknowledge",
      expectedRevision: before.revision,
      contextDigest: before.assessment.contextDigest,
      assessmentDigest: before.assessment.digest,
      confirmed: true,
    };
    f.inspection = {
      ...f.inspection,
      facts: f.inspection.facts.map((f) =>
        f.id === "email.provider" ? { ...f, fingerprint: "f".repeat(64) } : f,
      ),
    };
    const after = await f.service.inspect(headers);
    expect(
      after.assessment.requirements.find((r) => r.id === "email.provider")
        ?.status,
    ).toBe("blocked");
    expect(after.assessment.digest).not.toBe(before.assessment.digest);
    expect(after.assessment.decision.state).toBe("stale");
    await expect(f.service.mutate(headers, input)).rejects.toThrow("changed");
  },
);
