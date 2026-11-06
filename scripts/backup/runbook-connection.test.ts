import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../..");
const helper = path.join(root, "scripts/backup/verify-psql-client-tls.sh");
const runbook = readFileSync(
  path.join(root, "specs/037-ys-sys-001-systems-registry/one-time-production-backup.md"),
  "utf8",
);

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

test("client TLS verification fails closed without a client SSL report and hides captured details", () => {
  const privateMarker = "synthetic-private-hostname.invalid";
  const result = checkConninfo(`pg_stat_ssl=true\nConnected to ${privateMarker} without SSL\n`);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("did not confirm a TLS");
  expect(`${result.stdout}${result.stderr}`).not.toContain(privateMarker);
});

test("runbook uses the established private service profile and strict connection protections", () => {
  const commandBlock = runbook.match(/```bash\n([\s\S]*?)\n```/)?.[1];

  expect(commandBlock).toBeDefined();
  expect(runbook).toContain('export PGSERVICEFILE="$HOME/.config/ys-sys-001/pg_service.conf"');
  expect(runbook).toContain("service=ys-sys-001-admin");
  expect(runbook).toContain("sslmode=verify-full sslrootcert=system channel_binding=require");
  expect(runbook).toContain("PGCHANNELBINDING=require");
  expect(runbook).toContain("scripts/backup/verify-psql-client-tls.sh");
  expect(commandBlock).toContain("-c '\\conninfo'");
  expect(commandBlock).not.toContain("pg_stat_ssl");
  expect(runbook).not.toContain("ys-sys-001-approved");
  expect(runbook).not.toContain("$HOME/.pg_service.conf");
  expect(runbook).not.toContain('PGPASSFILE="$PGPASSFILE"');
});
