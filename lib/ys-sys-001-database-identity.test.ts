import { describe, expect, test } from "bun:test";
import {
  compareRuntimeDatabaseIdentity,
  parseExpectedDatabaseIdentity,
  parseExpectedDatabaseIdentityJson,
} from "@/lib/ys-sys-001-database-identity";

describe("YS-SYS-001 runtime database identity comparison", () => {
  const configured = "postgresql://synthetic-user:synthetic-password@ep-synthetic.aws.neon.tech/neondb?sslmode=require";
  const expected = { hostname: "ep-synthetic.aws.neon.tech", database: "neondb" };

  test("matches a valid, independently supplied endpoint and database", () => {
    expect(compareRuntimeDatabaseIdentity(configured, parseExpectedDatabaseIdentity(expected))).toBe("MATCH");
  });

  test("compares hostname and database exactly and reports a mismatch without revealing either", () => {
    expect(compareRuntimeDatabaseIdentity(configured, parseExpectedDatabaseIdentity({ ...expected, database: "otherdb" }))).toBe("MISMATCH");
    expect(compareRuntimeDatabaseIdentity(configured, parseExpectedDatabaseIdentity({ ...expected, hostname: "other.aws.neon.tech" }))).toBe("MISMATCH");
  });

  test("fails closed for missing or malformed runtime configuration", () => {
    expect(compareRuntimeDatabaseIdentity(undefined, parseExpectedDatabaseIdentity(expected))).toBe("UNVERIFIED");
    expect(compareRuntimeDatabaseIdentity("not-a-url", parseExpectedDatabaseIdentity(expected))).toBe("UNVERIFIED");
    expect(compareRuntimeDatabaseIdentity("mysql://user:password@ep-synthetic.aws.neon.tech/neondb", parseExpectedDatabaseIdentity(expected))).toBe("UNVERIFIED");
    expect(compareRuntimeDatabaseIdentity("postgres://user:password@ep-synthetic.aws.neon.tech/%E0%A4%A", parseExpectedDatabaseIdentity(expected))).toBe("UNVERIFIED");
    expect(compareRuntimeDatabaseIdentity("postgres://user:password@ep-synthetic.aws.neon.tech/", parseExpectedDatabaseIdentity(expected))).toBe("UNVERIFIED");
  });

  test("fails closed when a node-postgres host query parameter overrides the URL authority", () => {
    expect(compareRuntimeDatabaseIdentity(
      "postgresql://synthetic-user:synthetic-password@ep-synthetic.aws.neon.tech/neondb?sslmode=require&host=ep-other.aws.neon.tech",
      parseExpectedDatabaseIdentity(expected),
    )).toBe("UNVERIFIED");
    expect(compareRuntimeDatabaseIdentity(
      "postgresql://synthetic-user:synthetic-password@ep-synthetic.aws.neon.tech/neondb?host=ep-synthetic.aws.neon.tech&host=ep-other.aws.neon.tech",
      parseExpectedDatabaseIdentity(expected),
    )).toBe("UNVERIFIED");
  });

  test("rejects missing, ambiguous, malformed, and non-canonical expected targets", () => {
    expect(parseExpectedDatabaseIdentity(null)).toBeNull();
    expect(parseExpectedDatabaseIdentity({ hostname: [expected.hostname], database: expected.database })).toBeNull();
    expect(parseExpectedDatabaseIdentity({ hostname: expected.hostname, database: expected.database, branch: "production" })).toBeNull();
    expect(parseExpectedDatabaseIdentity({ hostname: "https://ep-synthetic.aws.neon.tech", database: expected.database })).toBeNull();
    expect(parseExpectedDatabaseIdentityJson('{"database":"neondb","hostname":"ep-synthetic.aws.neon.tech","hostname":"other.aws.neon.tech"}')).toBeNull();
    expect(parseExpectedDatabaseIdentityJson('{"database":"neondb","hostname":"ep-synthetic.aws.neon.tech"}')).toEqual(expected);
  });

  test("never includes runtime credentials or endpoint identifiers in its result", () => {
    const result = compareRuntimeDatabaseIdentity(configured, parseExpectedDatabaseIdentity(expected));
    expect(result).toBe("MATCH");
    expect(JSON.stringify(result)).not.toContain("synthetic-user");
    expect(JSON.stringify(result)).not.toContain("synthetic-password");
    expect(JSON.stringify(result)).not.toContain("ep-synthetic");
  });
});
