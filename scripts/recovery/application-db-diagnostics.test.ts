import { describe, expect, test } from "bun:test";
import { formatPreparationFailure } from "@/scripts/recovery/application-db-diagnostics";

describe("synthetic application database preparation diagnostics", () => {
  test("reports the migration, SQLSTATE, and fixed failure category without private error text", () => {
    const diagnostic = formatPreparationFailure("synthetic migration application", "0017", {
      code: "42501",
      message: "secret=synthetic-password; SQL: INSERT INTO private.records VALUES ('synthetic-person')",
    });

    expect(diagnostic).toContain("category syntax_or_access_failure");
    expect(diagnostic).toContain("phase synthetic migration application");
    expect(diagnostic).toContain("migration 0017");
    expect(diagnostic).toContain("SQLSTATE 42501");
    expect(diagnostic).toContain("private details suppressed");
    expect(diagnostic).not.toContain("synthetic-password");
    expect(diagnostic).not.toContain("private.records");
    expect(diagnostic).not.toContain("synthetic-person");
    expect(diagnostic.length).toBeLessThan(240);
  });

  test("keeps invalid versions, SQLSTATEs, and phases out of diagnostics", () => {
    const diagnostic = formatPreparationFailure("migration failed\nsecret", "0024-secret", {
      code: "42501\npassword=secret",
      message: "private data",
    });

    expect(diagnostic).toContain("category unexpected_failure");
    expect(diagnostic).toContain("phase unexpected phase");
    expect(diagnostic).not.toContain("migration 0024");
    expect(diagnostic).not.toContain("SQLSTATE");
    expect(diagnostic).not.toContain("secret");
    expect(diagnostic).not.toContain("private data");
    expect(diagnostic.length).toBeLessThan(240);
  });

  test("categorizes bounded startup connection failures without exposing driver text", () => {
    const diagnostic = formatPreparationFailure("empty source verification", undefined, {
      code: "ECONNRESET",
      message: "password=synthetic-secret host=private.internal SQL: SELECT private_column",
    });

    expect(diagnostic).toContain("category connection_failure");
    expect(diagnostic).not.toContain("ECONNRESET");
    expect(diagnostic).not.toContain("synthetic-secret");
    expect(diagnostic).not.toContain("private.internal");
    expect(diagnostic).not.toContain("private_column");
    expect(diagnostic.length).toBeLessThan(240);
  });
});
