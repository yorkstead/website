import { isIPv4 } from "node:net";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseMigration } from "@/scripts/migration-plan";

export const privateRecoveryMode = "production-derived-private-v1";
export const privateDatabaseTables = Object.freeze([
  "public.application_migrations",
  "public.workspaces",
  "public.workspace_snapshots",
  "public.system_directory_entries",
  "public.contact_inquiries",
  "public.inquiry_retirements",
  "public.crm_proposals",
  "public.conversion_events",
  "public.research_opportunities",
  'public."user"',
  'public."account"',
  'public."session"',
  "public.customer_identities",
  "public.customer_tenants",
  "public.customer_tenant_memberships",
  "public.customer_tenant_projects",
  "public.customer_project_grants",
] as const);

export const privateSessionWriteTables = Object.freeze([
  'public."session"',
] as const);

export const migrationRoutineNamesThrough0022 = Object.freeze([
  "document_history_immutable",
  "document_require_actor",
  "document_guard",
  "document_version_guard",
  "document_approval_guard",
  "document_record_audit",
  "document_audit_insert_guard",
  "document_version_effects",
  "document_approval_effects",
  "customer_invitation_guard",
  "customer_invitation_scope_guard",
  "customer_invitation_audit",
  "customer_provisioning_audit_guard",
  "customer_invitation_complete_scope",
  "client_publication_guard",
  "client_publication_audit_write",
  "client_publication_history_guard",
  "client_publication_source_changed",
  "client_publication_audit_insert_guard",
  "client_access_revision",
  "client_access_admin_audit_write",
  "client_access_history_guard",
  "portal_release_review_guard",
  "portal_release_audit_write",
  "portal_release_history_guard",
  "customer_mail_intent_guard",
  "customer_mail_history_guard",
  "inquiry_retirement_digest",
  "inquiry_retirement_immutable",
  "inquiry_retirement_prepare",
  "inquiry_retirement_record",
  "inquiry_retirement_audit_guard",
  "inquiry_retirement_protect",
  "retire_inquiry",
  "system_directory_revision",
  "system_directory_write_audit",
  "system_directory_audit_immutable",
] as const);

export async function inspectMigrationRoutineManifest(directory = resolve(import.meta.dir, "../../migrations")) {
  const names = (await readdir(directory)).filter((name) => /^\d{4}_[a-z0-9-]+\.sql$/.test(name) && name.slice(0, 4) <= "0022").sort();
  const bodies = new Map<string, string>();
  const triggers = new Set<string>();
  for (const filename of names) {
    const migration = parseMigration(filename, await readFile(resolve(directory, filename), "utf8"));
    for (const statement of migration.statements) {
      const declaration = statement.match(/^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/i);
      if (declaration) {
        const body = statement.match(/\bAS\s+(\$[a-z0-9_]*\$)([\s\S]*?)\1\s*;?\s*$/i)?.[2];
        if (body === undefined || bodies.has(declaration[1]!)) throw new Error("migration routine source is not uniquely reviewable");
        if (/\bEXECUTE\b|\b(dblink|http_[a-z_]*|pg_notify|pg_(?:read|write|ls|stat)_file|lo_import|lo_export|copy|pg_terminate_backend|pg_cancel_backend)\b/i.test(body)) {
          throw new Error("migration routine behavior requires security review before rehearsal");
        }
        bodies.set(declaration[1]!, body);
      }
      const trigger = statement.match(/^CREATE\s+(?:CONSTRAINT\s+)?TRIGGER\s+"?([a-z_][a-z0-9_]*)"?[\s\S]*?\bON\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?[\s\S]*?\bEXECUTE\s+FUNCTION\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/i);
      if (trigger) triggers.add(`${trigger[1]}|${trigger[2]}|${trigger[3]}`);
    }
  }
  return { bodies, triggers };
}

export function isPrivateRecoveryIPv4(host: string) {
  if (!isIPv4(host)) return false;
  const [a, b] = host.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function validatePrivateRecoveryEnvironment(env: NodeJS.ProcessEnv) {
  const targetId = env.YS_APP_RECOVERY_TARGET_ID ?? "";
  const setupUrl = env.YS_APP_RECOVERY_SETUP_DATABASE_URL ?? "";
  const setupRole = env.YS_APP_RECOVERY_SETUP_ROLE ?? "";
  const runtimePassword = env.YS_APP_RECOVERY_RUNTIME_PASSWORD ?? "";
  if (env.YS_APP_RECOVERY_MODE !== privateRecoveryMode || !/^[a-f0-9]{24}$/.test(targetId)) {
    throw new Error("private disposable recovery mode and target identifier are required");
  }
  const forbiddenEnvironment = Object.entries(env).some(([key, value]) => Boolean(value) &&
    (/^(?:DATABASE_URL|TEST_DATABASE_URL|POSTGRES_URL|DIRECT_URL)$/.test(key) ||
      /^(?:NEON|AWS|R2|CLOUDFLARE|STRIPE|RESEND|SENDGRID|TWILIO|VAPID|SENTRY)_/.test(key)));
  if (forbiddenEnvironment) {
    throw new Error("ambient application or provider configuration is forbidden");
  }
  let url: URL;
  try { url = new URL(setupUrl); } catch { throw new Error("private setup database URL is required"); }
  if (!/^postgres(?:ql)?:$/.test(url.protocol) || url.search || url.hash || !isPrivateRecoveryIPv4(url.hostname)) {
    throw new Error("private literal-IP disposable PostgreSQL target is required");
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  const expectedDatabase = `ys_sys_001_${targetId}`;
  const expectedRole = `ys_sys_setup_${targetId.slice(0, 12)}`;
  if (database !== expectedDatabase || setupRole !== expectedRole || decodeURIComponent(url.username) !== expectedRole) {
    throw new Error("setup role and generated disposable database identity do not match");
  }
  if (!/^[a-f0-9]{64}$/.test(runtimePassword)) throw new Error("generated runtime password is required");
  return { targetId, database, setupRole, runtimeRole: `ys_sys_runtime_${targetId.slice(0, 12)}`, runtimePassword };
}
