import { describe, expect, test } from "bun:test";
import { hasBearerAuthorization } from "@/lib/morning-briefing/auth";

describe("morning briefing bearer authorization", () => {
  test("requires an exact bearer token with a safe minimum length", () => {
    const token = "a-secure-token-that-is-long-enough";
    expect(hasBearerAuthorization(new Request("https://example.com", { headers: { Authorization: `Bearer ${token}` } }), token)).toBeTrue();
    expect(hasBearerAuthorization(new Request("https://example.com", { headers: { Authorization: "Bearer wrong-token-value" } }), token)).toBeFalse();
    expect(hasBearerAuthorization(new Request("https://example.com?token=a-secure-token-that-is-long-enough"), token)).toBeFalse();
    expect(hasBearerAuthorization(new Request("https://example.com", { headers: { Authorization: "Bearer too-short" } }), "too-short")).toBeFalse();
  });
});
