import { describe, expect, test } from "bun:test";
import { explicitVerifyFullSSL } from "@/lib/database-url";

describe("explicitVerifyFullSSL", () => {
  test("spells out verify-full for the modes pg aliases to it", () => {
    for (const mode of ["prefer", "require", "verify-ca"]) {
      expect(explicitVerifyFullSSL(`postgresql://user:pw@host.neon.tech/db?sslmode=${mode}`)).toBe("postgresql://user:pw@host.neon.tech/db?sslmode=verify-full");
    }
  });

  test("keeps other query parameters", () => {
    expect(explicitVerifyFullSSL("postgresql://user:pw@host/db?sslmode=require&channel_binding=require")).toBe("postgresql://user:pw@host/db?sslmode=verify-full&channel_binding=require");
  });

  test("follows the last sslmode when the parameter is repeated, as pg does", () => {
    expect(explicitVerifyFullSSL("postgresql://u:p@h/db?sslmode=require&sslmode=disable")).toBe("postgresql://u:p@h/db?sslmode=require&sslmode=disable");
    expect(explicitVerifyFullSSL("postgresql://u:p@h/db?sslmode=disable&sslmode=require")).toBe("postgresql://u:p@h/db?sslmode=verify-full");
  });

  test("leaves verify-full, libpq-compat, missing and unparseable values alone", () => {
    for (const value of ["postgresql://u:p@h/db?sslmode=verify-full", "postgresql://u:p@h/db?uselibpqcompat=true&sslmode=require", "postgresql://u:p@h/db", "not a url"]) {
      expect(explicitVerifyFullSSL(value)).toBe(value);
    }
  });
});
