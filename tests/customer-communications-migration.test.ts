import { afterAll, expect, test } from "bun:test";
import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { parseMigration } from "@/scripts/migration-plan";
import {
  readinessMigrationManifest,
  readinessMigrationManifest0016,
} from "@/lib/portal-readiness-migrations";
import {
  readinessDigest,
  releaseContextDigest,
} from "@/lib/portal-readiness-model";
import { createPortalReadinessService } from "@/lib/portal-readiness-service";
import { syntheticInspection } from "./fixtures/portal-readiness-synthetic";
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL }),
  dbtest = process.env.TEST_DATABASE_URL ? test : test.skip;
afterAll(() => pool.end());
dbtest(
  "prepared additive 0017 preserves historical 0016 release context, audit, evidence and prior schema checksums",
  async () => {
    const client = await pool.connect(),
      schema = `mail_upgrade_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      for (const file of (await readdir("migrations"))
        .filter((f) => f.endsWith(".sql") && f < "0017")
        .sort())
        for (const text of parseMigration(
          file,
          await readFile(`migrations/${file}`, "utf8"),
        ).statements)
          await client.query({
            text,
            name: `mail-upgrade-${crypto.randomUUID()}`,
          });
      await client.query(
        "SELECT set_config('yorkstead.readiness_actor','fictional-historical-owner',true),set_config('yorkstead.readiness_event','verified',true)",
      );
      const oldContext = {
        releaseId: "customer-portal-v1" as const,
        codeRevision: "a".repeat(40),
        schemaVersion: "0016" as const,
        schemaIdentity: readinessDigest(readinessMigrationManifest0016),
        configurationIdentity: "c".repeat(64),
        environment: "disposable" as const,
      };
      const digest = releaseContextDigest(oldContext);
      const review = (
        await client.query(
          `INSERT INTO portal_release_reviews(context_digest,release_id,code_revision,schema_version,schema_identity,configuration_identity,environment,actor_id) VALUES ($1,'customer-portal-v1',$2,'0016',$3,$4,'disposable','fictional-historical-owner') RETURNING id`,
          [
            digest,
            oldContext.codeRevision,
            oldContext.schemaIdentity,
            oldContext.configurationIdentity,
          ],
        )
      ).rows[0];
      await client.query(
        `INSERT INTO portal_release_evidence(review_id,context_digest,review_revision,requirement_id,kind,status,fingerprint,source,actor_id,expires_at) VALUES ($1,$2,1,'email.provider','technical','blocked',$3,'unavailable-adapter','fictional-historical-owner',clock_timestamp()+interval '1 hour')`,
        [review.id, digest, "d".repeat(64)],
      );
      const tables = [
        "portal_release_reviews",
        "portal_release_evidence",
        "portal_release_audit",
        "customer_tenants",
        "customer_invitations",
        "customer_provisioning_audit",
        "client_access_admin_audit",
        "client_project_publications",
      ];
      const before = [];
      for (const table of tables)
        before.push(
          (await client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows,
        );
      for (const text of parseMigration(
        "0017_customer-communications.sql",
        await readFile("migrations/0017_customer-communications.sql", "utf8"),
      ).statements)
        await client.query({
          text,
          name: `mail-upgrade-${crypto.randomUUID()}`,
        });
      const after = [];
      for (const table of tables)
        after.push(
          (await client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows,
        );
      expect(after).toEqual(before);
      expect(readinessMigrationManifest.slice(0, 16)).toEqual([
        ...readinessMigrationManifest0016,
      ]);
      expect(
        releaseContextDigest({
          ...oldContext,
          schemaVersion: "0017",
          schemaIdentity: readinessDigest(readinessMigrationManifest),
        }),
      ).not.toBe(digest);
      expect(
        (await client.query("SELECT id FROM customer_mail_jobs")).rows,
      ).toHaveLength(0);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  },
  20000,
);

dbtest(
  "readiness selects the newest numeric evidence across the 99-to-100 boundary",
  async () => {
    const schema = `mail_evidence_${crypto.randomUUID().replaceAll("-", "")}`;
    await pool.query(`CREATE SCHEMA ${schema}`);
    const scoped = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      options: `-c search_path=${schema}`,
    });
    try {
      for (const text of parseMigration(
        "0016_customer-release-readiness.sql",
        await readFile(
          "migrations/0016_customer-release-readiness.sql",
          "utf8",
        ),
      ).statements)
        await scoped.query(text);
      await scoped.query(
        "SELECT setval('portal_release_evidence_id_seq',95,false)",
      );
      let inspection = syntheticInspection(crypto.randomUUID());
      const service = createPortalReadinessService(
        scoped,
        async () => inspection,
        async () => ({ user: { id: "fictional-evidence-owner" } }),
        true,
      );
      async function verify() {
        const view = await service.inspect(new Headers());
        await service.mutate(new Headers(), {
          action: "verify",
          expectedRevision: view.revision,
          contextDigest: view.assessment.contextDigest,
          assessmentDigest: view.assessment.digest,
          confirmed: true,
        });
      }
      await verify();
      inspection = {
        ...inspection,
        facts: inspection.facts.map((f) =>
          f.id === "release.identity"
            ? {
                ...f,
                fingerprint: readinessDigest("fictional-renewed-observation"),
              }
            : f,
        ),
      };
      await verify();
      const view = await service.inspect(new Headers());
      expect(
        view.assessment.requirements.find((r) => r.id === "release.identity")
          ?.status,
      ).toBe("passed");
      const rows = (
        await scoped.query(
          "SELECT id FROM portal_release_evidence WHERE requirement_id='release.identity' ORDER BY id",
        )
      ).rows;
      expect(Number(rows[0].id)).toBeLessThan(100);
      expect(Number(rows[1].id)).toBeGreaterThanOrEqual(100);
    } finally {
      await scoped.end();
      await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    }
  },
  20000,
);
