import { describe, expect, test } from "bun:test";
import { readinessMigrationManifest } from "@/lib/portal-readiness-migrations";
import {
  createOnePerWindowLimiter,
  neonEndpointId,
  readSystemsDirectoryPreflight,
  summarizeMigrationLedger,
} from "@/lib/systems-directory-preflight";

describe("YS-SYS-001 production preflight", () => {
  test("extracts only the Neon endpoint identifier from pooled or direct URLs", () => {
    expect(neonEndpointId("postgresql://private-user:private-pass@ep-main-safe123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"))
      .toBe("ep-main-safe123");
    expect(neonEndpointId("postgresql://private-user:private-pass@ep-main-safe123.us-east-2.aws.neon.tech/neondb"))
      .toBe("ep-main-safe123");
    expect(neonEndpointId("postgresql://user:pass@db.example.test/private"))
      .toBeNull();
    expect(neonEndpointId("not a URL")).toBeNull();
  });

  test("applies a fixed-window request limit", () => {
    const allowed = createOnePerWindowLimiter(60_000);
    expect(allowed(100_000)).toBe(true);
    expect(allowed(100_001)).toBe(false);
    expect(allowed(159_999)).toBe(false);
    expect(allowed(160_000)).toBe(true);
  });

  test("compares applied versions and checksums without returning checksum values", () => {
    const rows = readinessMigrationManifest.map(([version, checksum]) => ({ version, checksum }));
    const matched = summarizeMigrationLedger(rows, rows.length);
    expect(matched.state).toBe("matches_repository");
    expect(matched.required).toEqual([
      { version: "0020", applied: true, checksumMatchesRepository: true },
      { version: "0022", applied: true, checksumMatchesRepository: true },
    ]);
    expect(JSON.stringify(matched)).not.toContain(readinessMigrationManifest[0]?.[1] ?? "");

    const mismatch = summarizeMigrationLedger(
      [{ version: "0020", checksum: "not-the-repository-checksum" }],
      1,
    );
    expect(mismatch.state).toBe("mismatch_or_incomplete");
    expect(mismatch.required[0]).toEqual({
      version: "0020",
      applied: true,
      checksumMatchesRepository: false,
    });
    expect(JSON.stringify(mismatch)).not.toContain("not-the-repository-checksum");
  });

  test("returns redacted registry, migration, audit-protection and identity evidence using SELECTs only", async () => {
    const statements: string[] = [];
    const entries = Array.from({ length: 7 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      revision: index + 1,
      archived: index === 6,
      entry_fingerprint: `entry-fingerprint-${index + 1}`,
      audit_count: index === 0 ? 5 : 1,
      audit_fingerprint: `audit-fingerprint-${index + 1}`,
    }));
    const sql = {
      async query(statement: string) {
        statements.push(statement);
        if (statement.includes("current_database()")) {
          return [{ database_name: "neondb", current_schema: "public", server_version_num: 180002 }];
        }
        if (statement.includes("to_regclass")) {
          return [{ entries_table_present: true, audit_table_present: true, migrations_table_present: true }];
        }
        if (statement.includes("total_count")) return [{ total_count: readinessMigrationManifest.length }];
        if (statement.includes("SELECT version, checksum")) {
          return readinessMigrationManifest.map(([version, checksum]) => ({ version, checksum }));
        }
        if (statement.includes("AS entry_count")) {
          return [{ entry_count: 7, audit_count: 11, orphan_audit_count: 0 }];
        }
        if (statement.includes("AS audit_fingerprint")) return entries;
        if (statement.includes("AS audit_append_enabled")) {
          return [{ audit_append_enabled: true, audit_immutability_enabled: true, revision_trigger_enabled: true }];
        }
        if (statement.includes("AS entries_primary_keys")) {
          return [{ entries_primary_keys: 1, entries_check_constraints: 8, audit_primary_keys: 1, audit_check_constraints: 4, audit_entry_foreign_keys: 0 }];
        }
        throw new Error("Unexpected diagnostic statement");
      },
    };

    const result = await readSystemsDirectoryPreflight(
      sql,
      "postgresql://private-user:private-password@ep-main-safe123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    );
    expect(result.identity).toEqual({
      provider: "neon",
      endpointId: "ep-main-safe123",
      databaseName: "neondb",
      currentSchema: "public",
      serverVersionNum: 180002,
    });
    expect(result.migrations.state).toBe("matches_repository");
    expect(result.systemDirectory).toMatchObject({
      entryCount: 7,
      auditCount: 11,
      orphanAuditCount: 0,
      entryListTruncated: false,
      auditProtection: {
        appendTriggerEnabled: true,
        immutabilityTriggerEnabled: true,
        revisionTriggerEnabled: true,
      },
      constraints: {
        entriesPrimaryKeyCount: 1,
        auditPrimaryKeyCount: 1,
        auditEntryForeignKeyCount: 0,
      },
    });
    const evidenceEntries = result.systemDirectory.entries as Record<string, unknown>[];
    expect(evidenceEntries).toHaveLength(7);
    expect(evidenceEntries[0]).toHaveProperty("id");
    expect(evidenceEntries[0]).toHaveProperty("revision");
    expect(evidenceEntries[0]).toHaveProperty("archived");
    expect(evidenceEntries[0]).toHaveProperty("auditCount");
    expect(evidenceEntries[0]).toHaveProperty("entryFingerprint");
    expect(evidenceEntries[0]).toHaveProperty("auditFingerprint");
    expect(JSON.stringify(result)).not.toContain("private-user");
    expect(JSON.stringify(result)).not.toContain("private-password");
    expect(JSON.stringify(result)).not.toContain("hostname");
    expect(JSON.stringify(result)).not.toContain("actor_id");
    expect(statements.every((statement) => /^\s*SELECT\b/i.test(statement))).toBe(true);
    expect(statements.join(" ")).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i);
  });
});
