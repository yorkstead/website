import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalMigrationSource, parseMigration, validateMigrationPlan } from "@/scripts/migration-plan";

const migrationsDirectory = resolve(import.meta.dir, "../migrations");

describe("application migration plan", () => {
  test("loads ordered, unique, nonempty migrations", async () => {
    const fileNames = (await readdir(migrationsDirectory)).filter((fileName) => fileName.endsWith(".sql")).sort();
    const migrations = await Promise.all(fileNames.map(async (fileName) => parseMigration(fileName, await readFile(resolve(migrationsDirectory, fileName), "utf8"))));
    expect(migrations.map((migration) => migration.version)).toEqual(["0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009", "0010", "0011", "0012", "0013", "0014", "0015", "0016", "0017"]);
    expect(new Set(migrations.map((migration) => migration.version)).size).toBe(migrations.length);
    expect(migrations.every((migration) => migration.statements.length > 0)).toBeTrue();
    expect(migrations.every((migration) => /^[0-9a-f]{64}$/.test(migration.checksum))).toBeTrue();
    expect(() => validateMigrationPlan(migrations)).not.toThrow();
  });

  test("keeps checksums stable across operating-system line endings", () => {
    const lf = "SELECT 1;\n--> statement-breakpoint\nSELECT 2;\n";
    const crlf = lf.replaceAll("\n", "\r\n");
    expect(parseMigration("0001_example.sql", lf).checksum).toBe(parseMigration("0001_example.sql", crlf).checksum);
    expect(canonicalMigrationSource(crlf)).toBe(lf);
  });

  test("rejects malformed migration files before database access", () => {
    expect(() => parseMigration("migration.sql", "SELECT 1")).toThrow("Invalid migration filename");
    expect(() => parseMigration("0001_empty.sql", "   ")).toThrow("contains no SQL statements");
    const migration = parseMigration("0001_example.sql", "SELECT 1");
    expect(() => validateMigrationPlan([migration, migration])).toThrow("versions must be unique");
  });

  test("declares the required constraints, relationships, and query indexes", async () => {
    const plan = (await Promise.all((await readdir(migrationsDirectory)).filter((fileName) => fileName.endsWith(".sql")).map((fileName) => readFile(resolve(migrationsDirectory, fileName), "utf8")))).map(canonicalMigrationSource).join("\n");
    for (const expected of [
      "contact_inquiries_status_check",
      "contact_inquiries_notification_status_check",
      "consultations_status_check",
      "workspace_snapshots_workspace_id_fkey",
      "contact_inquiries_ip_hash_created_at_idx",
      "contact_inquiries_due_follow_up_idx",
      "contact_inquiries_created_at_id_idx",
      "contact_inquiries_archived_at_idx",
      "contact_inquiries_archived_at_check",
      "conversion_events_visitor_hash_idx",
      "morning_briefings_ready_content_check",
      "morning_briefings_ready_generated_at_idx",
      "customer_identities_provider_subject_key",
      "customer_tenant_memberships_identity_fkey",
      "customer_tenant_projects_project_key",
      "customer_project_grants_membership_fkey",
      "customer_project_grants_project_fkey",
      "customer_auth_account_provider_key",
      "customer_auth_session_user_idx",
    ]) expect(plan).toContain(expected);
  });

  test("runs ordered migrations before production Vercel builds", async () => {
    const packageJSON = JSON.parse(await readFile(resolve(import.meta.dir, "../package.json"), "utf8")) as { scripts: Record<string, string> };
    const vercelConfig = JSON.parse(await readFile(resolve(import.meta.dir, "../vercel.json"), "utf8")) as { buildCommand?: string };
    const buildScript = await readFile(resolve(import.meta.dir, "vercel-build.ts"), "utf8");
    expect(packageJSON.scripts["vercel-build"]).toBe("bun scripts/vercel-build.ts");
    expect(vercelConfig.buildCommand).toBe("bun run vercel-build");
    expect(buildScript).toContain('process.env.VERCEL_ENV === "production"');
    expect(buildScript.indexOf('"db:migrate"')).toBeLessThan(buildScript.indexOf('"build"'));
  });
});

describe("prepared-query migration compatibility", () => {
  test("expands grouped trigger declarations while preserving historical checksum", async () => {
    const source = await readFile(resolve(migrationsDirectory, "0011_document-approval-foundation.sql"), "utf8");
    const migration = parseMigration("0011_document-approval-foundation.sql", source);
    expect(migration.checksum).toBe("5aa9ad363a1315b3ce4b34ba622387d25e38ad835b81e8dd80d51c9ff1067915");
    const triggers = migration.statements.filter(sql => sql.startsWith("CREATE TRIGGER "));
    expect(triggers).toHaveLength(17);
    expect(triggers.every(sql => sql.split("CREATE TRIGGER ").length === 2)).toBe(true);
    expect(triggers.some(sql => sql.includes("audit_immutable"))).toBe(true);
  });
  test("does not split function bodies, quoted text or unsupported SQL blocks", () => {
    const functionSQL = "CREATE FUNCTION example() RETURNS text LANGUAGE plpgsql AS $$\nBEGIN\n RETURN 'first;second';\nEND;\n$$;";
    const quotedSQL = "SELECT 'first;\nCREATE TRIGGER not a declaration';";
    const mixedSQL = "CREATE TRIGGER example;\n-- comment between statements\nSELECT 1;";
    for (const sql of [functionSQL, quotedSQL, mixedSQL]) {
      expect(parseMigration("0001_example.sql", sql).statements).toEqual([sql]);
    }
  });
});
