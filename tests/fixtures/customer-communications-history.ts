// Disposable read-history fixtures only. Never imported by application code.
import { Pool } from "pg";
import { communicationsDisposableEnabled } from "../../lib/customer-communications-policy";
import { mailDigest } from "../../lib/customer-mail";
import { disposableMailEnv } from "./customer-mail";

function requireDisposable() {
  if (
    !process.env.TEST_DATABASE_URL ||
    !communicationsDisposableEnabled(disposableMailEnv) ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Disposable communications database required");
}

export async function createCommunicationsHistoryFixture(
  jobCount: number,
  auditCount: number,
) {
  requireDisposable();
  const schema = `communications_history_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    options: `-c search_path=${schema}`,
  });
  async function dispose() {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
  try {
    // Copy the migrated column/check/index definitions into a disposable schema.
    // No application connection is redirected and no public history is deleted.
    for (const table of [
      "customer_mail_jobs",
      "customer_mail_audit",
      "customer_mail_suppressions",
    ])
      await pool.query(
        `CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`,
      );
    const jobIds: string[] = [];
    for (let n = 0; n < jobCount; n++) {
      const id = crypto.randomUUID();
      jobIds.push(id);
      await pool.query(
        `INSERT INTO customer_mail_jobs(id,deduplication_key,type,tenant_id,identity_id,recipient,sender,origin,expires_at) VALUES ($1,$2,'security_notification','fictional-history-tenant','fictional-history-identity','recipient@example.test','sender@example.test','https://portal.example.test',clock_timestamp()+interval '590 seconds')`,
        [id, mailDigest(id)],
      );
    }
    await pool.query(
      `INSERT INTO customer_mail_audit(id,job_id,event) SELECT n,$2::uuid,'recovery_requested' FROM generate_series(1,$1::int) n`,
      [auditCount, jobIds[0] ?? null],
    );
    return {
      pool,
      jobIds,
      auditIds: Array.from({ length: auditCount }, (_, n) => String(n + 1)),
      dispose,
    };
  } catch (error) {
    await dispose();
    throw error;
  }
}

export async function extendCommunicationsAuditHistory() {
  requireDisposable();
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const jobs = (
      await pool.query("SELECT count(*)::int n FROM customer_mail_jobs")
    ).rows[0].n;
    const before = (
      await pool.query("SELECT count(*)::int n FROM customer_mail_audit")
    ).rows[0].n;
    // Ensure the last page contains audit events after jobs have run out, even
    // when earlier workflow suites retained many fictional jobs/events.
    const added = Math.max(51, (Math.ceil(jobs / 25) + 1) * 50 + 1 - before);
    await pool.query(
      "INSERT INTO customer_mail_audit(event) SELECT 'recovery_requested' FROM generate_series(1,$1::int)",
      [added],
    );
    return { jobs, audit: before + added };
  } finally {
    await pool.end();
  }
}
