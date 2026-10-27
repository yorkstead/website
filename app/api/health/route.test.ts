import { describe, expect, test } from "bun:test";
import { GET } from "@/app/api/health/route";

describe("public health endpoint", () => {
  test("reports liveness only without dependency details", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
