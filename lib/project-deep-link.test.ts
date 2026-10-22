import { describe, expect, test } from "bun:test";
import { resolveProjectDeepLink } from "@/lib/project-deep-link";

describe("project deep-link resolution", () => {
  const projects = [{ id: "project-1" }, { id: "project-2" }];

  test("opens an existing project after workspace hydration", () => {
    expect(resolveProjectDeepLink(projects, "project-2")).toEqual({ status: "found", projectId: "project-2" });
  });

  test("returns a recoverable not-found state for an orphaned link", () => {
    expect(resolveProjectDeepLink(projects, "missing")).toEqual({ status: "not-found", projectId: "missing" });
  });

  test("ignores an absent project query", () => {
    expect(resolveProjectDeepLink(projects, null)).toEqual({ status: "none" });
  });
});
