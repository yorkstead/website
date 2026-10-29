import { describe, expect, test } from "bun:test";
import { isLoopbackDisposableDatabase, postgresQueryFunction } from "@/lib/contact-database";

describe("contact PostgreSQL adapter", () => {
  test("uses a TCP adapter only for development loopback disposable databases", () => {
    const disposable = "postgresql://postgres:postgres@localhost:5432/project_command_center_test";
    expect(isLoopbackDisposableDatabase(disposable, "development")).toBe(true);
    expect(isLoopbackDisposableDatabase(disposable, "production")).toBe(false);
    expect(isLoopbackDisposableDatabase("postgresql://db.example.test/project_command_center_test", "development")).toBe(false);
    expect(isLoopbackDisposableDatabase("postgresql://localhost/project_command_center", "development")).toBe(false);
  });

  test("parameterizes tagged values and unwraps rows for both query forms", async () => {
    const calls: Array<{ statement: string; values?: unknown[] }> = [];
    const sql = postgresQueryFunction({
      query: async (statement: string, values?: unknown[]) => {
        calls.push({ statement, values });
        return { rows: [{ value: values?.[0] ?? "query" }] };
      },
    } as never);

    expect(await sql`SELECT ${"synthetic value"} AS value`).toEqual([{ value: "synthetic value" }]);
    expect(calls[0]).toEqual({ statement: "SELECT $1 AS value", values: ["synthetic value"] });
    expect(await sql.query("SELECT $1 AS value", ["query value"])).toEqual([{ value: "query value" }]);
  });
});
