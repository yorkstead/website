import { describe, expect, test } from "bun:test";
import { disposableTestDatabaseURL } from "./fixtures/disposable-database";

describe("disposable database test guard", () => {
  test("accepts only matching loopback databases explicitly named test or disposable", () => {
    const testURL = "postgresql://postgres:postgres@localhost:5432/project_command_center_test";
    expect(disposableTestDatabaseURL({})).toBeNull();
    expect(disposableTestDatabaseURL({ TEST_DATABASE_URL: testURL, DATABASE_URL: testURL, NODE_ENV: "test" })).toBe(testURL);
    expect(() => disposableTestDatabaseURL({ TEST_DATABASE_URL: testURL, DATABASE_URL: "postgresql://localhost/production", NODE_ENV: "test" })).toThrow("identical disposable");
    expect(() => disposableTestDatabaseURL({ TEST_DATABASE_URL: "postgresql://db.example.test/project_command_center_test", DATABASE_URL: "postgresql://db.example.test/project_command_center_test", NODE_ENV: "test" })).toThrow("loopback disposable");
    expect(() => disposableTestDatabaseURL({ TEST_DATABASE_URL: "postgresql://localhost/production", DATABASE_URL: "postgresql://localhost/production", NODE_ENV: "test" })).toThrow("loopback disposable");
    expect(() => disposableTestDatabaseURL({ TEST_DATABASE_URL: testURL, DATABASE_URL: testURL, NODE_ENV: "production" })).toThrow("identical disposable");
  });
});
