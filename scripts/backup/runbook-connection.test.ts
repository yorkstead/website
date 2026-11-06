import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../..");
const helper = path.join(root, "scripts/backup/verify-psql-client-tls.sh");
const inputValidator = readFileSync(
  path.join(root, "scripts/backup/validate-one-time-backup-inputs.sh"),
  "utf8",
);
const runbook = readFileSync(
  path.join(root, "specs/037-ys-sys-001-systems-registry/one-time-production-backup.md"),
  "utf8",
);
const pinBootstrap = runbook.match(/### Pin and verify the execution source[\s\S]*?```bash\n([\s\S]*?)\n```/)?.[1];
const backupCommand = runbook.match(/<!-- YS-SYS-001-BACKUP-COMMAND-BEGIN -->\n```bash\n([\s\S]*?)\n```\n<!-- YS-SYS-001-BACKUP-COMMAND-END -->/)?.[1];

function gitBlob(pathname: string) {
  const result = spawnSync("git", ["hash-object", pathname], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Could not calculate a synthetic Git blob hash.");
  return result.stdout.trim();
}

function checkConninfo(contents: string) {
  const directory = mkdtempSync(path.join(tmpdir(), "ys-sys-001-tls-"));
  const privateFile = path.join(directory, "conninfo.txt");
  try {
    writeFileSync(privateFile, contents, { mode: 0o600 });
    return spawnSync("bash", [helper, privateFile], { encoding: "utf8" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("client TLS verification accepts psql conninfo even when server catalog reports false", () => {
  const result = checkConninfo(
    'pg_stat_ssl synthetic fixture: false\nYou are connected to database "neondb" as user "private-role" on host "private.example" using SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384).\n',
  );

  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
});

test("client TLS verification accepts the owner's reported SSL/TLS status format", () => {
  const result = checkConninfo("SSL Connection=true, TLSv1.3\n");

  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
});

test("client TLS verification accepts PostgreSQL 18's separate SSL table rows", () => {
  const result = checkConninfo(
    "+----------------+-----------+\n| SSL Connection | true      |\n| SSL Protocol   | TLSv1.3   |\n+----------------+-----------+\n",
  );

  expect(result.status).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
});

test("client TLS verification fails closed without a client SSL report and hides captured details", () => {
  const privateMarker = "synthetic-private-hostname.invalid";
  const result = checkConninfo(`pg_stat_ssl=true\nConnected to ${privateMarker} without SSL\n`);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("did not confirm a TLS");
  expect(`${result.stdout}${result.stderr}`).not.toContain(privateMarker);
});

test("client TLS verification rejects false SSL or a missing protocol table row", () => {
  for (const report of [
    "| SSL Connection | false |\n| SSL Protocol | TLSv1.3 |\n",
    "| SSL Connection | true |\n",
    "| SSL Protocol | TLSv1.3 |\n",
  ]) {
    expect(checkConninfo(report).status).not.toBe(0);
  }
});

test("client TLS verification rejects non-private or symlinked reports", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ys-sys-001-tls-mode-"));
  const privateFile = path.join(directory, "conninfo.txt");
  const link = path.join(directory, "conninfo-link.txt");
  try {
    writeFileSync(privateFile, "| SSL Connection | true |\n| SSL Protocol | TLSv1.3 |\n", { mode: 0o600 });
    chmodSync(privateFile, 0o644);
    const unsafeMode = spawnSync("bash", [helper, privateFile], { encoding: "utf8" });
    expect(unsafeMode.status).toBe(2);
    expect(unsafeMode.stderr).not.toContain("SSL Protocol");

    chmodSync(privateFile, 0o600);
    Bun.spawnSync(["ln", "-s", privateFile, link]);
    const symlink = spawnSync("bash", [helper, link], { encoding: "utf8" });
    expect(symlink.status).toBe(2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("runbook uses the established private service profile and strict connection protections", () => {
  expect(backupCommand).toBeDefined();
  const execution = backupCommand ?? "";
  expect(runbook).toContain('export PGSERVICEFILE="$HOME/.config/ys-sys-001/pg_service.conf"');
  expect(runbook).toContain('export PGPASSFILE="$HOME/.pgpass"');
  expect(runbook).toContain("service=ys-sys-001-admin");
  expect(runbook).toContain("sslmode=verify-full sslrootcert=system channel_binding=require");
  expect(runbook).toContain("PGCHANNELBINDING=require");
  expect(runbook).toContain("-v ON_ERROR_STOP=1");
  expect(runbook).toContain("scripts/backup/verify-psql-client-tls.sh");
  expect(runbook).toContain("scripts/backup/validate-one-time-backup-inputs.sh");
  expect(runbook).toContain("ys_sys_001_validate_backup_inputs || exit 1");
  expect(runbook.indexOf("ys_sys_001_validate_backup_inputs || exit 1")).toBeLessThan(
    runbook.indexOf('UNIQUE_OBJECT_KEY="ys-sys-001/production/full-db/'),
  );
  expect(backupCommand).toContain("-c '\\conninfo'");
  expect(backupCommand).not.toContain("pg_stat_ssl");
  expect(runbook).not.toContain("ys-sys-001-approved");
  expect(runbook).not.toContain("$HOME/.pg_service.conf");
  expect(inputValidator).toContain('mode" != 600');
  expect(inputValidator).toContain('The PostgreSQL service file must have mode 0600.');
  expect(inputValidator).toContain('The PostgreSQL password file must have mode 0600.');
  expect(inputValidator).toContain('The age recovery identity file must have mode 0600.');
  expect(inputValidator).toContain("age-keygen -y");
  expect(inputValidator).toContain("(10(\\.0{1,3})?|[0-9](\\.[0-9]{1,3})?)");
  expect(pinBootstrap).toContain("read -r -p 'Exact approved full source commit SHA: '");
  expect(pinBootstrap).toContain('^[0-9a-f]{40}$');
  expect(pinBootstrap).toContain('fetch --quiet --no-tags --depth=1 origin "$APPROVED_BACKUP_COMMIT"');
  expect(pinBootstrap).toContain('rev-parse --verify FETCH_HEAD^{commit}');
  expect(pinBootstrap).toContain('checkout --quiet --detach "$APPROVED_BACKUP_COMMIT"');
  expect(pinBootstrap).toContain('git -C "$PINNED_DIR" diff --quiet "$APPROVED_BACKUP_COMMIT"');
  expect(pinBootstrap).not.toContain("origin main");
  expect(pinBootstrap).not.toContain("origin/master");
  expect(pinBootstrap).toContain("EXPECTED_INPUT_HELPER_BLOB='acfe7b447fb7d3daba597ae8bd6aaf2100b36380'");
  expect(pinBootstrap).toContain("EXPECTED_TLS_HELPER_BLOB='35a4ef061a95bf59215127751a273d7f93880eb9'");
  expect(gitBlob(path.join(root, "scripts/backup/validate-one-time-backup-inputs.sh"))).toBe(
    "acfe7b447fb7d3daba597ae8bd6aaf2100b36380",
  );
  expect(gitBlob(helper)).toBe("35a4ef061a95bf59215127751a273d7f93880eb9");
  expect(execution.indexOf("git hash-object scripts/backup/validate-one-time-backup-inputs.sh")).toBeLessThan(
    execution.indexOf("source scripts/backup/validate-one-time-backup-inputs.sh"),
  );
  expect(execution.indexOf("bash -n scripts/backup/validate-one-time-backup-inputs.sh")).toBeLessThan(
    execution.indexOf("source scripts/backup/validate-one-time-backup-inputs.sh"),
  );
  expect(execution.indexOf("cmp -s \"${BASH_SOURCE[0]}\"")).toBeLessThan(
    execution.indexOf("source scripts/backup/validate-one-time-backup-inputs.sh"),
  );
  expect(execution.indexOf("source scripts/backup/validate-one-time-backup-inputs.sh")).toBeLessThan(
    execution.indexOf("pg_dump --dbname"),
  );
});

test("pinned bootstrap and owner runbook command are syntactically valid Bash without executing", () => {
  for (const block of [pinBootstrap, backupCommand]) {
    expect(block).toBeDefined();
    const result = spawnSync("bash", ["-n"], { input: block, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  }
});

test("failure investigation treats the confirmed short reference as valid and leaves the cause unconfirmed", () => {
  expect(runbook).toContain("the owner confirmed the exact preflight evidence reference was a short token");
  expect(runbook).toContain("short token that satisfies the former token pattern");
  expect(runbook).toContain("cannot explain that attempt");
  expect(runbook).toContain("The actual failure remains unconfirmed");
  expect(runbook).toContain("only a hypothetical failure");
});
