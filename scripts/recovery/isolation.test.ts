import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const entrypoint = resolve(import.meta.dir, "entrypoint.sh");
const helper = resolve(import.meta.dir, "disposable.sh");
const cleanEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp" };

function runEntrypoint(extra: Record<string, string> = {}) {
  return spawnSync("bash", [entrypoint], { encoding: "utf8", timeout: 10_000, env: { ...cleanEnv, ...extra } });
}

test("rejects external PostgreSQL URLs and inherited PG overrides", () => {
  for (const [name, value] of [["DATABASE_URL", "postgresql://outside.invalid/db"], ["POSTGRES_URL", "postgresql://outside.invalid/db"], ["DIRECT_URL", "postgresql://outside.invalid/db"], ["PGHOST", "outside.invalid"], ["PGSERVICEFILE", "/tmp/service.conf"]]) {
    const result = runEntrypoint({ [name]: value });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`rejected inherited environment: ${name}`);
  }
});

test("rejects caller-selected output and storage locations", () => {
  for (const name of ["RECOVERY_OUTPUT_DIR", "RECOVERY_STORAGE_DIR"]) {
    const result = runEntrypoint({ [name]: "/mnt/external" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`rejected inherited environment: ${name}`);
  }
});

test("rejects production and cloud credential environment", () => {
  for (const name of ["VERCEL_ENV", "NEON_API_KEY", "AWS_ACCESS_KEY_ID", "GOOGLE_APPLICATION_CREDENTIALS"]) {
    const result = runEntrypoint({ [name]: "must-not-be-inherited" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`rejected inherited environment: ${name}`);
  }
});

test("fails closed outside the approved container and refuses direct helper invocation", () => {
  const entry = runEntrypoint();
  expect(entry.status).not.toBe(0);
  expect(entry.stderr).toContain("isolated tmpfs workspace required");
  const direct = spawnSync("bash", [helper, "backup"], { encoding: "utf8", timeout: 10_000, env: cleanEnv });
  expect(direct.status).not.toBe(0);
  expect(direct.stderr).toContain("approved isolated entry point is required");
});
