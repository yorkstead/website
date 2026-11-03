import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, parse, sep } from "node:path";
import { Pool } from "pg";
import { parseMigration } from "../migration-plan";
import { readdir } from "node:fs/promises";
import { captureSystemDirectoryBaseline, CaptureError, type SourceAttestation } from "./capture";
import { encryptUploadRetrieveVerify } from "./pipeline";
import { CloudflareR2ObjectStore, PRIVATE_BUCKET } from "./r2-store";
import { validateExecutionBoundary } from "./guards";

const ROLE_NAME = "ys_sys_001_baseline_reader";
const EXPECTED_BUCKET = PRIVATE_BUCKET;
const EXPECTED_RETENTION_DAYS = 30;
const EXPECTED_SCOPE = "capture-seven-directory-records-and-associated-audit-only";
function stop(code: string): never {
  throw new CaptureError(code);
}

function assertLocalExecutionBoundary() {
  try {
    validateExecutionBoundary({
      platform: process.platform,
      wslDistro: process.env.WSL_DISTRO_NAME,
      isInteractive: Boolean(stdin.isTTY && stdout.isTTY),
      ci: Boolean(process.env.CI),
      argvCount: process.argv.length - 2,
      environment: process.env,
    });
  } catch (error) {
    stop(error instanceof Error ? error.message : "execution_boundary_rejected");
  }
}

async function ensurePrivateDirectory(path: string) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || (metadata.mode & 0o077) !== 0) stop("private_directory_permissions_invalid");
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) stop("private_directory_owner_invalid");
  await chmod(path, 0o700);
}

async function assertNoSymlinkComponents(path: string) {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  let current = root;
  for (const part of absolute.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    const metadata = await lstat(current).catch(() => null);
    if (!metadata || metadata.isSymbolicLink()) stop("private_workspace_path_invalid");
  }
}

async function readPrivateJson<T extends Record<string, unknown>>(path: string): Promise<T> {
  let metadata;
  try { metadata = await lstat(path); } catch { return stop("required_private_attestation_missing"); }
  if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o077) !== 0) stop("private_attestation_permissions_invalid");
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) stop("private_attestation_owner_invalid");
  try { return JSON.parse(await readFile(path, "utf8")) as T; } catch { return stop("private_attestation_invalid"); }
}

function timestampIsRecent(value: unknown, maxAgeMs: number) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  const age = Date.now() - parsed;
  return Number.isFinite(parsed) && age >= 0 && age <= maxAgeMs && value.endsWith("Z");
}

function validateAttestations(source: SourceAttestation, storage: Record<string, unknown>, approval: Record<string, unknown>, host: string) {
  if (source.provider !== "neon" || source.project !== "website" || source.branch !== "production" || source.database !== "neondb"
      || source.hostname !== host || !/^[a-z0-9-]+\.neon\.tech$/i.test(host) || host.includes("pooler")
      || !/^[a-f0-9]{40}$/i.test(source.deploymentSha) || !/^ep-[a-z0-9-]+$/i.test(source.endpointId)
      || !timestampIsRecent(source.verifiedAtUtc, 24 * 60 * 60 * 1000)) stop("source_attestation_mismatch_or_stale");
  if (storage.provider !== "cloudflare-r2" || storage.bucket !== EXPECTED_BUCKET || storage.jurisdiction !== "us"
      || storage.storageClass !== "Standard" || storage.publicAccess !== false
      || storage.credentialScope !== "bucket-scoped-object-read-write"
      || storage.retentionDays !== EXPECTED_RETENTION_DAYS || storage.lifecycleDays !== EXPECTED_RETENTION_DAYS
      || storage.syntheticTransportTest !== "PASS" || storage.recoveryKeyCopyTest !== "PASS"
      || storage.costThresholdUsd !== 5 || typeof storage.monthlyEstimateUsd !== "number" || !Number.isFinite(storage.monthlyEstimateUsd) || storage.monthlyEstimateUsd < 0 || storage.monthlyEstimateUsd > 5
      || !timestampIsRecent(storage.verifiedAtUtc, 7 * 24 * 60 * 60 * 1000)) stop("storage_attestation_mismatch_or_stale");
  if (approval.scope !== EXPECTED_SCOPE || approval.oneTime !== true || approval.authorized !== true
      || approval.approver !== "Yorkstead owner" || typeof approval.approvalReference !== "string" || !approval.approvalReference.trim()
      || !timestampIsRecent(approval.authorizedAtUtc, 24 * 60 * 60 * 1000)) stop("separate_capture_approval_missing_or_stale");
}

async function assertAgeIdentity(identityPath: string, expectedRecipient: string, privateHome: string) {
  const stat = await lstat(identityPath).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) stop("age_identity_permissions_invalid");
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("age-keygen", ["-y", identityPath], {
    encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10_000,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: privateHome, LANG: "C.UTF-8", NODE_ENV: "production" },
  });
  if (result.error || result.status !== 0 || result.stdout.trim() !== expectedRecipient) stop("age_identity_mismatch");
}

async function readRepositoryMigrations(): Promise<{ version: string; name: string; checksum: string }[]> {
  const directory = resolve(import.meta.dir, "../../../migrations");
  const filenames = (await readdir(directory)).filter((name) => /^\d{4}_[a-z0-9-]+\.sql$/.test(name)).sort();
  return Promise.all(filenames.map(async (filename) => {
    const parsed = parseMigration(filename, await readFile(join(directory, filename), "utf8"));
    return { version: parsed.version, name: parsed.name, checksum: parsed.checksum };
  }));
}

async function main() {
  assertLocalExecutionBoundary();
  const home = resolve(homedir());
  const homeMetadata = await lstat(home).catch(() => null);
  if (!homeMetadata?.isDirectory() || homeMetadata.isSymbolicLink() || home === "/tmp"
      || (typeof process.getuid === "function" && homeMetadata.uid !== process.getuid())) stop("owner_home_directory_invalid");
  const privateRoot = join(home, ".local", "state", "yorkstead", "ys-sys-001");
  const configDir = join(privateRoot, "config");
  const keyDir = join(privateRoot, "keys");
  const capturesDir = join(privateRoot, "captures");
  for (const directory of [privateRoot, configDir, keyDir, capturesDir]) await ensurePrivateDirectory(directory);
  await assertNoSymlinkComponents(home);
  await assertNoSymlinkComponents(privateRoot);

  const [source, storage, approval] = await Promise.all([
    readPrivateJson<SourceAttestation>(join(configDir, "target-attestation.json")),
    readPrivateJson(join(configDir, "storage-attestation.json")),
    readPrivateJson(join(configDir, "capture-authorization.json")),
  ]);
  const host = process.env.YS_SYS_001_DB_HOST ?? "";
  validateAttestations(source, storage, approval, host);
  if (process.env.YS_SYS_001_DB_USER !== ROLE_NAME || !process.env.YS_SYS_001_DB_PASSWORD
      || !process.env.YS_SYS_001_R2_ACCESS_KEY_ID || !process.env.YS_SYS_001_R2_SECRET_ACCESS_KEY) stop("required_secret_injection_missing");
  const identityPath = join(keyDir, "ys-sys-001.agekey");
  const recipient = String(storage.ageRecipient ?? "");
  await assertAgeIdentity(identityPath, recipient, privateRoot);

  const prompt = createInterface({ input: stdin, output: stdout });
  let confirmation = "";
  try { confirmation = await prompt.question("Type CAPTURE YS-SYS-001 BASELINE to proceed with this one-time read-only capture: "); }
  finally { prompt.close(); }
  if (confirmation !== "CAPTURE YS-SYS-001 BASELINE") stop("owner_confirmation_missing");

  const pool = new Pool({
    host,
    port: 5432,
    database: "neondb",
    user: ROLE_NAME,
    password: process.env.YS_SYS_001_DB_PASSWORD,
    ssl: { rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 1_000,
    statement_timeout: 15_000,
    application_name: "ys-sys-001-preservation-capture-v1",
  });
  const captureTime = new Date().toISOString();
  let pipelineResult: Awaited<ReturnType<typeof encryptUploadRetrieveVerify>> | undefined;
  try {
    const migrationFiles = await readRepositoryMigrations();
    const { evidence } = await captureSystemDirectoryBaseline({
      pool,
      migrations: migrationFiles,
      source,
      connectedHostname: host,
      capturedAtUtc: captureTime,
      operatorLabel: "Yorkstead owner",
    });
    const objectStore = new CloudflareR2ObjectStore({
      accountId: String(storage.accountId ?? ""),
      accessKeyId: process.env.YS_SYS_001_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.YS_SYS_001_R2_SECRET_ACCESS_KEY,
      privateHome: privateRoot,
    });
    const objectKey = `ys-sys-001/preservation-baseline/v1/${captureTime.replaceAll(":", "-")}-${randomUUID()}.json.age`;
    pipelineResult = await encryptUploadRetrieveVerify({
      evidence: evidence as unknown as Record<string, unknown>,
      privateDirectory: capturesDir,
      objectKey,
      recipient,
      identityPath,
      store: objectStore,
    });
    const reportPath = join(capturesDir, `redacted-report-${captureTime.replaceAll(":", "-")}.json`);
    await writeFile(reportPath, `${JSON.stringify(pipelineResult.report, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    process.stdout.write(`${JSON.stringify(pipelineResult.report)}\n`);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  const code = error instanceof CaptureError ? error.code : "runner_failed";
  process.stderr.write(`YS-SYS-001 capture stopped: ${code}. No row-level values were logged.\n`);
  process.exitCode = 1;
});
