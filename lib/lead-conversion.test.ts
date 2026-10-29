import { describe, expect, test } from "bun:test";
import { convertLeadRecord } from "@/lib/lead-conversion";

const ids = { projectId: "new-project", activityId: "new-activity", now: "2026-10-28T12:00:00.000Z" };

function client(record: Record<string, unknown> | null) {
  const statements: string[] = [];
  return {
    statements,
    query: async (query: string) => {
      statements.push(query);
      return query.includes("LEFT JOIN inquiry_retirements") ? { rows: record ? [record] : [] } : { rows: [] };
    },
  };
}

describe("lead conversion lifecycle", () => {
  test("keeps archived records out of the atomic claim query", async () => {
    const database = client({ converted_project_id: null, status: "archived", retired: false });
    await expect(convertLeadRecord(database, 1, ids)).rejects.toThrow("Restore this archived inquiry");
    expect(database.statements[0]).toContain("AND status <> 'archived'");
  });

  test("returns safe clear errors for retired and missing or expired records", async () => {
    await expect(convertLeadRecord(client({ converted_project_id: null, status: "new", retired: true }), 1, ids)).rejects.toThrow("retired and cannot be converted");
    await expect(convertLeadRecord(client(null), 1, ids)).rejects.toThrow("not found or has expired");
  });

  test("returns the original project ID for an already converted inquiry", async () => {
    await expect(convertLeadRecord(client({ converted_project_id: "existing-project", status: "won", retired: false }), 1, ids)).resolves.toBe("existing-project");
  });

  test("appends projects and activity while preserving existing tasks", async () => {
    const database = client({ converted_project_id: ids.projectId, status: "won", retired: false });
    await convertLeadRecord(database, 1, ids);
    expect(database.statements[0]).toContain("data = workspaces.data || jsonb_build_object(");
    expect(database.statements[0]).toContain("'projects', COALESCE(workspaces.data->'projects', '[]'::jsonb) || COALESCE(EXCLUDED.data->'projects', '[]'::jsonb)");
    expect(database.statements[0]).toContain("'tasks', COALESCE(workspaces.data->'tasks', '[]'::jsonb)");
    expect(database.statements[0]).toContain("'activity', COALESCE(EXCLUDED.data->'activity', '[]'::jsonb) || COALESCE(workspaces.data->'activity', '[]'::jsonb)");
  });
});
