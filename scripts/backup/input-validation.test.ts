import { expect, test } from "bun:test";
import {
  accessSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dir, "../..");
const validator = path.join(root, "scripts/backup/validate-one-time-backup-inputs.sh");
const recipient = `age1${"a".repeat(58)}`;
const utilityNames = [
  "age",
  "openssl",
  "aws",
  "stat",
  "realpath",
  "mktemp",
  "sha256sum",
  "awk",
  "sed",
  "cut",
  "cmp",
  "install",
  "id",
  "date",
  "chmod",
  "rm",
  "mkdir",
  "env",
];

function findExecutable(name: string) {
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    const candidate = path.join(directory, name);
    try {
      accessSync(candidate, 1);
      return candidate;
    } catch {
      // Try the next PATH entry.
    }
  }
  throw new Error(`Required synthetic test utility is unavailable: ${name}`);
}

function putExecutable(file: string, contents: string) {
  writeFileSync(file, contents, { mode: 0o700 });
  chmodSync(file, 0o700);
}

function runValidation(options: {
  overrides?: Record<string, string | undefined>;
  omitTool?: string;
  versions?: Partial<Record<"psql" | "pg_dump" | "pg_restore", string>>;
  workspaceMode?: number;
  workspaceSymlink?: boolean;
  fileModes?: Partial<Record<"AGE_IDENTITY_FILE" | "PGSERVICEFILE" | "PGPASSFILE", number>>;
  fileSymlink?: "AGE_IDENTITY_FILE" | "PGSERVICEFILE" | "PGPASSFILE";
} = {}): { status: number | null; stdout: string; stderr: string; secretLeak: boolean } {
  const directory = mkdtempSync(path.join(tmpdir(), "ys-sys-001-inputs-"));
  const home = path.join(directory, "home");
  const bin = path.join(directory, "bin");
  mkdirSync(home, { mode: 0o700 });
  mkdirSync(bin, { mode: 0o700 });

  const workspace = path.join(home, ".local/state/yorkstead/ys-sys-001/backups");
  mkdirSync(workspace, { recursive: true, mode: 0o700 });
  chmodSync(workspace, options.workspaceMode ?? 0o700);
  if (options.workspaceSymlink) {
    const target = path.join(directory, "workspace-target");
    mkdirSync(target, { mode: 0o700 });
    rmSync(workspace, { recursive: true });
    symlinkSync(target, workspace);
  }

  const identity = path.join(home, ".config/ys-sys-001/age-identity.txt");
  const serviceFile = path.join(home, ".config/ys-sys-001/pg_service.conf");
  const passFile = path.join(home, ".pgpass");
  mkdirSync(path.dirname(identity), { recursive: true, mode: 0o700 });
  writeFileSync(identity, "SYNTHETIC_PRIVATE_AGE_IDENTITY", { mode: 0o600 });
  writeFileSync(serviceFile, "SYNTHETIC_SERVICE_PROFILE", { mode: 0o600 });
  writeFileSync(passFile, "SYNTHETIC_LIBPQ_CREDENTIAL", { mode: 0o600 });
  chmodSync(identity, options.fileModes?.AGE_IDENTITY_FILE ?? 0o600);
  chmodSync(serviceFile, options.fileModes?.PGSERVICEFILE ?? 0o600);
  chmodSync(passFile, options.fileModes?.PGPASSFILE ?? 0o600);
  const configuredPaths = {
    AGE_IDENTITY_FILE: identity,
    PGSERVICEFILE: serviceFile,
    PGPASSFILE: passFile,
  };
  if (options.fileSymlink) {
    const original = configuredPaths[options.fileSymlink];
    const link = `${original}.link`;
    symlinkSync(original, link);
    configuredPaths[options.fileSymlink] = link;
  }

  try {
    for (const name of utilityNames) {
      try {
        symlinkSync(findExecutable(name), path.join(bin, name));
      } catch {
        if (!["age", "openssl", "aws"].includes(name)) throw new Error(`Required synthetic test utility is unavailable: ${name}`);
        putExecutable(path.join(bin, name), "#!/bin/sh\nexit 0\n");
      }
    }

    putExecutable(
      path.join(bin, "age-keygen"),
      '#!/bin/sh\n[ "\${1-}" = "-y" ] || exit 2\nprintf "%s\\n" "$SYNTHETIC_AGE_PUBLIC_RECIPIENT"\n',
    );
    for (const tool of ["psql", "pg_dump", "pg_restore"] as const) {
      const version = options.versions?.[tool] ?? "18.6";
      putExecutable(
        path.join(bin, tool),
        `#!/bin/sh\n[ "\${1-}" = "--version" ] || exit 2\nprintf "${tool} (PostgreSQL) ${version}\\n"\n`,
      );
    }

    const env: NodeJS.ProcessEnv = {
      PATH: bin,
      HOME: home,
      NODE_ENV: "test",
      VALIDATOR: validator,
      SYNTHETIC_AGE_PUBLIC_RECIPIENT: recipient,
      workspace,
      R2_ACCESS_KEY_ID: "SYNTHETIC_ACCESS_SECRET_MARKER",
      R2_SECRET_ACCESS_KEY: "SYNTHETIC_SECRET_KEY_MARKER",
      R2_BUCKET: "synthetic-private-backups",
      R2_S3_ENDPOINT: "https://synthetic-account.us.r2.cloudflarestorage.com",
      AGE_PUBLIC_RECIPIENT: recipient,
      AGE_IDENTITY_FILE: configuredPaths.AGE_IDENTITY_FILE,
      APPROVED_DUMP_ROLE: "synthetic_dump_reader",
      AGE_KEY_ID: "synthetic-key",
      PREFLIGHT_REFERENCE: "synthetic-preflight-2026-11-06",
      DIRECTORY_ENTRY_COUNT: "0",
      DIRECTORY_AUDIT_COUNT: "0",
      R2_UNUSED_GB_MONTH: "10",
      PGSERVICEFILE: configuredPaths.PGSERVICEFILE,
      PGPASSFILE: configuredPaths.PGPASSFILE,
      ...Object.fromEntries(
        Object.entries(options.overrides ?? {}).filter((entry): entry is [string, string] => entry[1] !== undefined),
      ),
    };

    if (options.omitTool) {
      rmSync(path.join(bin, options.omitTool), { force: true });
    }
    const result = spawnSync(
      "/bin/bash",
      [
        "-c",
        'source "$VALIDATOR"; ys_sys_001_prepare_workspace || exit $?; ys_sys_001_check_local_utilities || exit $?; ys_sys_001_check_postgres_clients || exit $?; ys_sys_001_validate_backup_inputs',
      ],
      { encoding: "utf8", env },
    );
    return {
      status: result.status,
      stdout: String(result.stdout),
      stderr: String(result.stderr),
      secretLeak:
        `${String(result.stdout)}${String(result.stderr)}`.includes("SYNTHETIC_ACCESS_SECRET_MARKER") ||
        `${String(result.stdout)}${String(result.stderr)}`.includes("SYNTHETIC_SECRET_KEY_MARKER"),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("synthetic owner inputs pass without printing configuration values", () => {
  const result = runValidation();
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
  expect(result.secretLeak).toBe(false);
});

test("missing secret prompt input reports the input class without echoing a value", () => {
  const result = spawnSync(
    "/bin/bash",
    ["-c", 'source "$VALIDATOR"; ys_sys_001_read_secret R2_ACCESS_KEY_ID "R2 access key: " "R2 access key"'],
    {
      encoding: "utf8",
      input: "",
      env: { PATH: process.env.PATH ?? "", VALIDATOR: validator, NODE_ENV: "test" },
    },
  );
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("[YS-SYS-001 check 02]");
  expect(result.stderr).toContain("R2 access key was not supplied.");
  expect(result.stderr).not.toContain("SYNTHETIC");
});

test("a private preflight directory path is accepted as an evidence reference", () => {
  const reference = "/tmp/ys-sys-001-preflight.synthetic-private";
  const result = runValidation({ overrides: { PREFLIGHT_REFERENCE: reference } });
  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
  expect(result.secretLeak).toBe(false);
});

test("invalid R2 endpoint format reports its numbered check without echoing the value", () => {
  const result = runValidation({ overrides: { R2_S3_ENDPOINT: "https://endpoint-secret-marker.invalid" } });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("[YS-SYS-001 check 09]");
  expect(result.stderr).toContain("R2 S3 endpoint");
  expect(result.stderr).not.toContain("endpoint-secret-marker");
  expect(result.secretLeak).toBe(false);
});

test("invalid age recipient format reports its numbered check without echoing the value", () => {
  const result = runValidation({ overrides: { AGE_PUBLIC_RECIPIENT: "age1invalid-secret-marker" } });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("[YS-SYS-001 check 06]");
  expect(result.stderr).toContain("age recipient");
  expect(result.stderr).not.toContain("invalid-secret-marker");
  expect(result.secretLeak).toBe(false);
});

test("age identity mismatch reports the identity check without exposing either value", () => {
  const result = runValidation({
    overrides: { SYNTHETIC_AGE_PUBLIC_RECIPIENT: `age1${"b".repeat(58)}` },
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("[YS-SYS-001 check 17]");
  expect(result.stderr).toContain("does not match");
  expect(result.stderr).not.toContain("age1");
  expect(result.secretLeak).toBe(false);
});

test("missing age identity, service, and password paths have distinct diagnostics", () => {
  const cases = [
    ["AGE_IDENTITY_FILE", "/missing/age-identity", 10, "age recovery identity"],
    ["PGSERVICEFILE", "/missing/pg-service", 11, "service-file"],
    ["PGPASSFILE", "/missing/pgpass", 12, "password-file"],
  ] as const;
  for (const [variable, value, check, label] of cases) {
    const result = runValidation({ overrides: { [variable]: value } });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`[YS-SYS-001 check ${String(check).padStart(2, "0")}]`);
    expect(result.stderr).toContain(label);
    expect(result.stderr).not.toContain(value);
  }
});

test("tilde shorthand in a private file path is rejected with an actionable message", () => {
  const result = runValidation({ overrides: { AGE_IDENTITY_FILE: "~/.config/ys-sys-001/age-identity.txt" } });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("[YS-SYS-001 check 10]");
  expect(result.stderr).toContain("without tilde shorthand");
});

test("symbolic links are rejected for each private-file input", () => {
  for (const [variable, check, label] of [
    ["AGE_IDENTITY_FILE", 10, "age recovery identity"],
    ["PGSERVICEFILE", 11, "service-file"],
    ["PGPASSFILE", 12, "password-file"],
  ] as const) {
    const result = runValidation({ fileSymlink: variable });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`[YS-SYS-001 check ${String(check).padStart(2, "0")}]`);
    expect(result.stderr).toContain(label);
  }
});

test("unsafe age identity, service, and password permissions are identified", () => {
  for (const [variable, label] of [
    ["AGE_IDENTITY_FILE", "age recovery identity"],
    ["PGSERVICEFILE", "service file"],
    ["PGPASSFILE", "password file"],
  ] as const) {
    const result = runValidation({ fileModes: { [variable]: 0o644 } });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("[YS-SYS-001 check 14]");
    expect(result.stderr).toContain(label);
  }
});

test("unsafe workspace mode and symbolic link fail with the workspace check", () => {
  for (const options of [{ workspaceMode: 0o755 }, { workspaceSymlink: true }]) {
    const result = runValidation(options);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("[YS-SYS-001 check 01]");
    expect(result.stderr).toContain("workspace");
  }
});

test("remaining pre-upload fields report their specific numbered checks", () => {
  const cases = [
    ["DIRECTORY_ENTRY_COUNT", "zero?", 3],
    ["R2_UNUSED_GB_MONTH", "not-a-number", 4],
    ["AGE_KEY_ID", "bad marker!", 5],
    ["PREFLIGHT_REFERENCE", "bad reference!", 5],
    ["APPROVED_DUMP_ROLE", "bad role!", 7],
    ["R2_BUCKET", "Bad_Bucket", 8],
  ] as const;
  for (const [variable, value, check] of cases) {
    const result = runValidation({ overrides: { [variable]: value } });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`[YS-SYS-001 check ${String(check).padStart(2, "0")}]`);
    expect(result.stderr).not.toContain(value);
  }
});

test("missing PostgreSQL clients and incompatible client majors fail closed", () => {
  const missing = runValidation({ omitTool: "pg_restore" });
  expect(missing.status).not.toBe(0);
  expect(missing.stderr).toContain("[YS-SYS-001 check 18]");
  expect(missing.stderr).toContain("pg_restore");
  expect(missing.stderr).toContain("unavailable");

  const wrongMajor = runValidation({ versions: { pg_dump: "17.9" } });
  expect(wrongMajor.status).not.toBe(0);
  expect(wrongMajor.stderr).toContain("[YS-SYS-001 check 18]");
  expect(wrongMajor.stderr).toContain("pg_dump");
  expect(wrongMajor.stderr).toContain("major version 18");
});
