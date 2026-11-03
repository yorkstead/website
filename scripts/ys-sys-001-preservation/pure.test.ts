import { expect, test } from "bun:test";
import { canonicalFingerprint, canonicalize } from "./canonical";
import { SAFE_SYSTEM_PATH, validateExecutionBoundary } from "./guards";

const validBoundary = {
  platform: "linux",
  wslDistro: "Ubuntu-24.04",
  isInteractive: true,
  argvCount: 0,
  environment: { PATH: SAFE_SYSTEM_PATH, HOME: "/tmp", WSL_DISTRO_NAME: "Ubuntu-24.04" },
};

test("canonical JSON recursively sorts objects and preserves array order", () => {
  expect(canonicalize({ z: 1, a: { y: true, x: null }, list: ["b", "a"] })).toBe('{"a":{"x":null,"y":true},"list":["b","a"],"z":1}');
  expect(canonicalFingerprint({ first: 1, second: 2 })).toBe(canonicalFingerprint({ second: 2, first: 1 }));
  expect(canonicalFingerprint(["a", "b"])).not.toBe(canonicalFingerprint(["b", "a"]));
});

test("owner runner accepts only clean interactive Ubuntu WSL and fixed environment", () => {
  expect(() => validateExecutionBoundary(validBoundary)).not.toThrow();
  for (const variable of ["DATABASE_URL", "POSTGRES_URL", "DIRECT_URL", "PGHOST", "PGSERVICEFILE", "AWS_PROFILE", "AWS_ACCESS_KEY_ID", "NEON_API_KEY", "VERCEL_ENV", "YS_SYS_001_STORAGE_PATH", "RECOVERY_OUTPUT_DIR", "GITHUB_ACTIONS"]) {
    expect(() => validateExecutionBoundary({ ...validBoundary, environment: { ...validBoundary.environment, [variable]: "forbidden" } })).toThrow();
  }
  expect(() => validateExecutionBoundary({ ...validBoundary, platform: "darwin" })).toThrow("approved_ubuntu_wsl_required");
  expect(() => validateExecutionBoundary({ ...validBoundary, wslDistro: undefined })).toThrow("approved_ubuntu_wsl_required");
  expect(() => validateExecutionBoundary({ ...validBoundary, isInteractive: false })).toThrow("interactive_owner_session_required");
  expect(() => validateExecutionBoundary({ ...validBoundary, argvCount: 1 })).toThrow("no_cli_options_are_supported");
  expect(() => validateExecutionBoundary({ ...validBoundary, environment: { ...validBoundary.environment, PATH: "/tmp/bin:/usr/bin" } })).toThrow("system_path_must_be_fixed");
  expect(() => validateExecutionBoundary({ ...validBoundary, ci: true })).toThrow("ci_execution_rejected");
});
