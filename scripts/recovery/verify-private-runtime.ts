import { Pool } from "pg";
import { getCustomerProjectAccess } from "@/lib/customer-portal-authorization";
import { privateRecoveryMode, validatePrivateRecoveryEnvironment } from "./private-rehearsal-policy";

const config = validatePrivateRecoveryEnvironment(process.env);
const runtimeUrl = process.env.YS_APP_RECOVERY_RUNTIME_DATABASE_URL ?? "";
if (!runtimeUrl) throw new Error("private runtime database URL is required");
const url = new URL(runtimeUrl);
if (decodeURIComponent(url.username) !== config.runtimeRole || decodeURIComponent(url.pathname.slice(1)) !== config.database || url.search || url.hash || url.hostname !== new URL(process.env.YS_APP_RECOVERY_SETUP_DATABASE_URL!).hostname) {
  throw new Error("runtime connection does not match the private target role and address");
}
const pool = new Pool({ connectionString: runtimeUrl, max: 2, connectionTimeoutMillis: 5_000, application_name: "ys-sys-001-private-recovery-runtime-verification" });

async function denied(label: string, sql: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SAVEPOINT privilege_probe");
    let rejected = false;
    try { await client.query(sql); }
    catch (error) {
      rejected = (error as { code?: string }).code === "42501";
      await client.query("ROLLBACK TO SAVEPOINT privilege_probe");
    }
    await client.query("ROLLBACK");
    if (!rejected) throw new Error(`${label} privilege denial failed`);
  } finally { client.release(); }
}

async function deniedRoutine() {
  const client = await pool.connect();
  try {
    let error: { code?: string; message?: string } | undefined;
    try { await client.query("SELECT public.document_require_actor()"); }
    catch (caught) { error = caught as { code?: string; message?: string }; }
    if (error?.code !== "42501" || error.message !== 'permission denied for function document_require_actor') {
      throw new Error("unapproved routine execution denial failed");
    }
  } finally { client.release(); }
}

try {
  if (process.env.YS_APP_RECOVERY_MODE !== privateRecoveryMode) throw new Error("private recovery mode required");
  const identity = await pool.query<{ db: string; role: string; comment: string | null; superuser: boolean }>(`
    SELECT current_database() AS db,current_user AS role,shobj_description(d.oid,'pg_database') AS comment,r.rolsuper AS superuser
    FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()`);
  const row = identity.rows[0];
  if (!row || row.db !== config.database || row.role !== config.runtimeRole || row.comment !== `ys-sys-001-disposable:${config.targetId}` || row.superuser) throw new Error("runtime database identity check failed");

  const synthetic = ["a", "b"].map((side) => ({
    subject: `ys-sys-001-${config.targetId}-subject-${side}`,
    project: `ys-sys-001-${config.targetId}-project-${side}`,
  }));
  const ownA = await getCustomerProjectAccess(pool, { provider: "yorkstead-customer-auth", subject: synthetic[0]!.subject }, synthetic[0]!.project);
  const crossA = await getCustomerProjectAccess(pool, { provider: "yorkstead-customer-auth", subject: synthetic[0]!.subject }, synthetic[1]!.project);
  const ownB = await getCustomerProjectAccess(pool, { provider: "yorkstead-customer-auth", subject: synthetic[1]!.subject }, synthetic[1]!.project);
  const crossB = await getCustomerProjectAccess(pool, { provider: "yorkstead-customer-auth", subject: synthetic[1]!.subject }, synthetic[0]!.project);
  if (!ownA || !ownB || crossA || crossB) throw new Error("synthetic tenant isolation checks failed");

  const ledger = await pool.query<{ latest: string; future: number }>("SELECT max(version) AS latest,count(*) FILTER (WHERE version IN ('0023','0024'))::int AS future FROM public.application_migrations");
  const reads = await pool.query<{ ok: boolean }>(`SELECT
    (SELECT count(*)=22 FROM public.application_migrations) AND
    (SELECT count(*)>=0 FROM public.workspaces) AND
    (SELECT count(*)>=0 FROM public.workspace_snapshots) AND
    (SELECT count(*)>=0 FROM public.system_directory_entries) AND
    (SELECT count(*)>=0 FROM public.contact_inquiries) AND
    (SELECT count(*)>=0 FROM public.inquiry_retirements) AND
    (SELECT count(*)>=0 FROM public.crm_proposals) AND
    (SELECT count(*)>=0 FROM public.conversion_events) AND
    (SELECT count(*)>=0 FROM public.research_opportunities) AS ok`);
  if (ledger.rows[0]?.latest !== "0022" || ledger.rows[0]?.future !== 0 || reads.rows[0]?.ok !== true) throw new Error("approved read paths or migration ceiling failed");

  await denied("database temporary-object", "CREATE TEMP TABLE ys_sys_001_privilege_probe(id integer)");
  await denied("migration-ledger insert", "INSERT INTO public.application_migrations(version,name,checksum) VALUES('9999','probe',repeat('0',64))");
  await denied("business-data insert", "INSERT INTO public.workspaces(id,data) VALUES('ys-sys-001-probe','{}'::jsonb)");
  await denied("business-data update", "UPDATE public.workspaces SET data=data WHERE false");
  await denied("business-data delete", "DELETE FROM public.workspaces WHERE false");
  await denied("business-data truncate", "TRUNCATE public.workspaces");
  await deniedRoutine();
  const routine = await pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault(CASE WHEN p.prokind='p' THEN 'p' ELSE 'f' END,p.proowner))) a
    WHERE n.nspname IN ('public','customer_auth') AND a.grantee IN (0,(SELECT oid FROM pg_roles WHERE rolname=current_user)) AND a.privilege_type='EXECUTE'`);
  if (routine.rows[0]?.count !== 0) throw new Error("unapproved routine execution remains available");
  const sequences = await pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','customer_auth') AND c.relkind='S' AND
      (has_sequence_privilege(current_user,c.oid,'USAGE') OR has_sequence_privilege(current_user,c.oid,'SELECT') OR has_sequence_privilege(current_user,c.oid,'UPDATE'))`);
  if (sequences.rows[0]?.count !== 0) throw new Error("unexpected sequence access remains available");
  process.stdout.write("Private runtime verification passed: authenticated read role, migration ceiling, synthetic tenant isolation, and denied business writes.\n");
} catch {
  process.stderr.write("Private runtime verification failed; private diagnostics suppressed.\n");
  process.exitCode = 1;
} finally {
  await pool.end();
}
