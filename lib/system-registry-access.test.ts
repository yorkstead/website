import { describe, expect, test } from "bun:test";
import { isTypedSystemRegistryAllowed } from "@/lib/system-registry-access";

describe("typed Systems Registry access gate", () => {
  test("is off unless explicitly enabled and owner authorization is true", () => {
    expect(isTypedSystemRegistryAllowed(true, {})).toBe(false);
    expect(isTypedSystemRegistryAllowed(true, { YS_SYS_001_ENABLED: "false" })).toBe(false);
    expect(isTypedSystemRegistryAllowed(true, { YS_SYS_001_ENABLED: "TRUE" })).toBe(false);
    expect(isTypedSystemRegistryAllowed(false, { YS_SYS_001_ENABLED: "true" })).toBe(false);
    expect(isTypedSystemRegistryAllowed(true, { YS_SYS_001_ENABLED: "true" })).toBe(true);
  });
});
