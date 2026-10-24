import { afterAll, describe, expect, test } from "bun:test";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { createCustomerAuthOptions } from "@/lib/customer-auth";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { createClientOnboardingService } from "@/lib/client-onboarding";
import { getCustomerProjectAccess } from "@/lib/customer-portal-authorization";
import { resolveCustomerProjectAccessForRequest } from "@/lib/customer-session-authorization";
import { parseMigration } from "@/scripts/migration-plan";
import { readdir, readFile } from "node:fs/promises";

const databaseTest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const authPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: "-c search_path=customer_auth" });
const configuration = {
  baseURL: "http://localhost:3100",
  databaseURL: process.env.TEST_DATABASE_URL ?? "postgresql://localhost/disposable",
  secret: "fictional-disposable-auth-secret-9a84f7957309a86e",
};
const auth = betterAuth(createCustomerAuthOptions(configuration, authPool));
const verifier = async (headers: Headers) => auth.api.getSession({ headers, query: { disableCookieCache: true } });
const owner = async () => ({ user: { id: "fictional-onboarding-owner" } });
const service = createClientOnboardingService(pool, owner, verifier);
const headers = new Headers();
const password = "fictional-disposable-password-957abfe";
afterAll(async () => { await Promise.all([pool.end(), authPool.end()]); });

async function fixture(verified = true) {
  const suffix = crypto.randomUUID();
  const tenant = `invite-tenant-${suffix}`, project = `invite-project-${suffix}`, other = `invite-other-${suffix}`;
  const subject = `invite-subject-${suffix}`, email = `${suffix}@example.test`, identity = `invite-identity-${suffix}`;
  await pool.query("INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional disposable invitation tenant','active')", [tenant]);
  await pool.query("INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active'),($1,$3,'active')", [tenant, project, other]);
  // Test-only credential and verified-email fixtures. No production bootstrap bypass.
  await pool.query('INSERT INTO customer_auth."user"(id,name,email,"emailVerified") VALUES ($1,\'Fictional disposable recipient\',$2,$3)', [subject, email, verified]);
  const hash = await (await auth.$context).password.hash(password);
  await pool.query('INSERT INTO customer_auth."account"(id,"userId","accountId","providerId",password) VALUES ($1,$1,$1,\'credential\',$2)', [subject, hash]);
  await pool.query("INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,$2,$3,$4,'active')", [identity, customerAuthBoundary.identityProvider, subject, email]);
  return { tenant, project, other, subject, email, identity };
}
async function signIn(f: Awaited<ReturnType<typeof fixture>>) {
  const response = await auth.api.signInEmail({ body: { email: f.email, password }, asResponse: true });
  expect(response.status).toBe(200);
  const cookies = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  expect(cookies).toContain("yorkstead-customer.session_token=");
  const headers = new Headers({ cookie: cookies });
  const session = await verifier(headers);
  expect(session?.user.id).toBe(f.subject);
  return { headers, session: session! };
}
async function issue(f: Awaited<ReturnType<typeof fixture>>, recipientEmail = f.email, projectIds = [f.project]) {
  return service.issue(headers, { tenantId: f.tenant, recipientEmail, projectIds });
}
async function raw(sql: string, values: unknown[] = [], actor = true) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (actor) await client.query("SELECT set_config('yorkstead.provisioning_actor','fictional-onboarding-owner',true),set_config('yorkstead.provisioning_role','owner_internal',true)");
    return await client.query(sql, values);
  } finally { await client.query("ROLLBACK"); client.release(); }
}

describe("invitation PostgreSQL lifecycle", () => {
  databaseTest("scope, normalized email, supersession, expiration metadata and owner-only audit inspection", async () => {
    const a = await fixture(), b = await fixture();
    const first = await issue(a, `  ${a.email.toUpperCase()}  `);
    const second = await issue(a);
    const history = await service.inspect(headers, a.tenant);
    expect(history.invitations.map(r => r.status)).toEqual(["superseded", "pending"]);
    expect(history.invitations[0].recipient_email).toBe(a.email);
    expect(history.invitations.every(r => r.created_at instanceof Date && r.expires_at instanceof Date && r.expired === false)).toBe(true);
    expect(history.projectScope).toHaveLength(2);
    expect(history.audit.map(r => r.event_type)).toEqual(["issued", "superseded", "issued"]);
    expect(history.audit.every(r => r.actor_id === "fictional-onboarding-owner" && r.actor_role === "owner_internal")).toBe(true);
    expect(JSON.stringify(history)).not.toContain(first.token);
    expect(JSON.stringify(history)).not.toContain("token_verifier");
    const stored = (await pool.query("SELECT token_verifier FROM customer_invitations WHERE id=$1", [second.invitation.id])).rows[0];
    expect(stored.token_verifier).toHaveLength(64);
    expect(stored.token_verifier).not.toBe(second.token);
    await expect(issue(a, a.email, [b.project])).rejects.toThrow("access denied");
    await expect(createClientOnboardingService(pool, async () => null).inspect(headers, a.tenant)).rejects.toThrow("access denied");
    await service.revoke(headers, second.invitation.id);
    await service.revoke(headers, second.invitation.id); // no duplicate revoke audit
    const revoked = await service.inspect(headers, a.tenant);
    expect(revoked.audit.filter(r => r.event_type === "revoked")).toHaveLength(1);
    expect(revoked.invitations[1].revoked_by).toBe("fictional-onboarding-owner");
  });
  databaseTest("real Better Auth session, concurrent redemption, transactional identity creation and safe replay", async () => {
    const f = await fixture(), signed = await signIn(f), invitation = await issue(f);
    // Existing authenticated subject can be linked after proof; no email-only lookup.
    await pool.query("DELETE FROM customer_identities WHERE id=$1", [f.identity]);
    const results = await Promise.all(Array.from({ length: 4 }, () => service.redeem(signed.headers, invitation.token)));
    expect(new Set(results.map(r => r.identityId)).size).toBe(1);
    const identity = results[0].identityId;
    expect((await pool.query("SELECT * FROM customer_tenant_memberships WHERE identity_id=$1", [identity])).rows).toHaveLength(1);
    expect((await pool.query("SELECT * FROM customer_project_grants WHERE identity_id=$1", [identity])).rows).toHaveLength(1);
    const history = await service.inspect(headers, f.tenant);
    expect(history.audit.map(r => r.event_type)).toEqual(["issued", "redeemed"]);
    expect(history.audit[1]).toMatchObject({ actor_id: identity, actor_role: "customer" });
    expect(history.invitations[0].redeemed_at).toBeInstanceOf(Date);
    expect(await getCustomerProjectAccess(pool, { provider: customerAuthBoundary.identityProvider, subject: f.subject }, f.other)).toBeNull();
    const b = await fixture(), otherSession = await signIn(b);
    await expect(service.redeem(otherSession.headers, invitation.token)).rejects.toThrow("access denied");
  }, 20000);
  databaseTest("superseded, revoked, unknown, expired, wrong-recipient and unverified invitations deny", async () => {
    const f = await fixture(), signed = await signIn(f);
    const first = await issue(f), second = await issue(f);
    await expect(service.redeem(signed.headers, first.token)).rejects.toThrow("access denied");
    await service.revoke(headers, second.invitation.id);
    await expect(service.redeem(signed.headers, second.token)).rejects.toThrow("access denied");
    await expect(service.redeem(signed.headers, "A".repeat(43))).rejects.toThrow("access denied");
    const wrong = await issue(f, "other-fictional@example.test");
    await expect(service.redeem(signed.headers, wrong.token)).rejects.toThrow("access denied");
    const invitation = await issue(f);
    await pool.query('UPDATE customer_auth."user" SET "emailVerified"=false WHERE id=$1', [f.subject]);
    await expect(service.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
    await pool.query('UPDATE customer_auth."user" SET "emailVerified"=true WHERE id=$1', [f.subject]);
    // Disposable DB fixture only: age an otherwise valid invitation without waiting.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("ALTER TABLE customer_invitations DISABLE TRIGGER customer_invitation_write");
      await client.query("ALTER TABLE customer_invitations DISABLE TRIGGER customer_invitation_audit_event");
      await client.query("UPDATE customer_invitations SET created_at=clock_timestamp()-interval '2 days',expires_at=clock_timestamp()-interval '1 day' WHERE id=$1", [invitation.invitation.id]);
      await client.query("ALTER TABLE customer_invitations ENABLE TRIGGER customer_invitation_write");
      await client.query("ALTER TABLE customer_invitations ENABLE TRIGGER customer_invitation_audit_event");
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
    await expect(service.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
    expect((await service.inspect(headers, f.tenant)).invitations.find(i => i.id === invitation.invitation.id)?.expired).toBe(true);
  }, 20000);
  databaseTest("inactive membership/grants cannot be resurrected and failed redemption rolls back identity/membership", async () => {
    const f = await fixture(), signed = await signIn(f), invitation = await issue(f, f.email, [f.project, f.other]);
    await pool.query("INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'suspended')", [f.tenant, f.identity]);
    await expect(service.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
    await pool.query("UPDATE customer_tenant_memberships SET status='active' WHERE identity_id=$1", [f.identity]);
    await pool.query("INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ($1,$2,$3,'revoked')", [f.tenant, f.project, f.identity]);
    await expect(service.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
    expect((await pool.query("SELECT * FROM customer_project_grants WHERE identity_id=$1", [f.identity])).rows).toHaveLength(1);
    expect((await service.inspect(headers, f.tenant)).invitations[0].status).toBe("pending");
  });
  databaseTest("one authenticated identity supports independent organizations with only explicit grants", async () => {
    const a = await fixture(), b = await fixture(), signed = await signIn(a);
    const first = await issue(a), second = await issue(b, a.email);
    const redeemedA = await service.redeem(signed.headers, first.token);
    const redeemedB = await service.redeem(signed.headers, second.token);
    expect(redeemedA.identityId).toBe(redeemedB.identityId);
    expect(redeemedA.tenantId).not.toBe(redeemedB.tenantId);
    for (const f of [a, b]) {
      expect(await getCustomerProjectAccess(pool, { provider: customerAuthBoundary.identityProvider, subject: a.subject }, f.project)).toMatchObject({ tenantId: f.tenant });
      expect(await getCustomerProjectAccess(pool, { provider: customerAuthBoundary.identityProvider, subject: a.subject }, f.other)).toBeNull();
    }
  });
  databaseTest("redemption and owner revocation race has exactly one terminal outcome", async () => {
    const f = await fixture(), signed = await signIn(f), invitation = await issue(f);
    const results = await Promise.allSettled([service.redeem(signed.headers, invitation.token), service.revoke(headers, invitation.invitation.id)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const history = await service.inspect(headers, f.tenant);
    expect(history.audit).toHaveLength(2);
    expect(["redeemed", "revoked"]).toContain(history.invitations[0].status);
    expect((await pool.query("SELECT * FROM customer_project_grants WHERE identity_id=$1", [f.identity])).rows).toHaveLength(history.invitations[0].status === "redeemed" ? 1 : 0);
  });
  databaseTest("a mid-provisioning failure rolls back new identity, membership, grants and redemption audit", async () => {
    const f = await fixture(), signed = await signIn(f), invitation = await issue(f, f.email, [f.project, f.other]);
    await pool.query("DELETE FROM customer_identities WHERE id=$1", [f.identity]);
    const failingPool = {
      connect: async () => {
        const client = await pool.connect();
        let grants = 0;
        return new Proxy(client, { get(target, key) {
          if (key === "query") return async (sql: string, values?: unknown[]) => {
            if (sql.startsWith("INSERT INTO customer_project_grants") && ++grants === 2) throw new Error("Fictional storage failure");
            return target.query(sql, values);
          };
          const value = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        } });
      },
    };
    await expect(createClientOnboardingService(failingPool, owner, verifier).redeem(signed.headers, invitation.token)).rejects.toThrow("Fictional storage failure");
    expect((await pool.query("SELECT * FROM customer_identities WHERE auth_subject=$1", [f.subject])).rows).toHaveLength(0);
    expect((await pool.query("SELECT * FROM customer_tenant_memberships WHERE tenant_id=$1", [f.tenant])).rows).toHaveLength(0);
    expect((await pool.query("SELECT * FROM customer_project_grants WHERE tenant_id=$1", [f.tenant])).rows).toHaveLength(0);
    expect((await service.inspect(headers, f.tenant)).audit.map(r => r.event_type)).toEqual(["issued"]);
    expect((await service.redeem(signed.headers, invitation.token)).projectIds).toHaveLength(2);
  });
  databaseTest("tenant and project lifecycle is checked again at redemption; simultaneous reissue has one pending row", async () => {
    const f = await fixture(), signed = await signIn(f), invitation = await issue(f);
    for (const [table, column, key, state] of [
      ["customer_tenants", "id", f.tenant, "suspended"],
      ["customer_tenant_projects", "project_id", f.project, "archived"],
    ]) {
      await pool.query(`UPDATE ${table} SET status=$1 WHERE ${column}=$2`, [state, key]);
      await expect(service.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
      await expect(issue(f)).rejects.toThrow("access denied");
      await pool.query(`UPDATE ${table} SET status='active' WHERE ${column}=$1`, [key]);
    }
    await Promise.all([issue(f), issue(f)]);
    expect((await service.inspect(headers, f.tenant)).invitations.filter(r => r.status === "pending")).toHaveLength(1);
  });
  databaseTest("immutable scope, composite tenant integrity, terminal state and audit tampering fail closed", async () => {
    const f = await fixture(), b = await fixture(), invitation = await issue(f);
    await expect(raw("UPDATE customer_invitations SET recipient_email='forged@example.test' WHERE id=$1", [invitation.invitation.id])).rejects.toMatchObject({ code: "23514" });
    await expect(raw("UPDATE customer_invitations SET status='revoked',revoked_by='forged',revoked_at=now() WHERE id=$1", [invitation.invitation.id])).rejects.toMatchObject({ code: "42501" });
    await expect(raw("INSERT INTO customer_invitation_projects(invitation_id,tenant_id,project_id) VALUES ($1,$2,$3)", [invitation.invitation.id, f.tenant, f.other])).rejects.toMatchObject({ code: "42501" });
    await expect(raw("UPDATE customer_invitation_projects SET tenant_id=$2,project_id=$3 WHERE invitation_id=$1", [invitation.invitation.id, b.tenant, b.project])).rejects.toMatchObject({ code: "23514" });
    await expect(raw("DELETE FROM customer_invitations WHERE id=$1", [invitation.invitation.id])).rejects.toMatchObject({ code: "23514" });
    await expect(raw("UPDATE customer_invitations SET status='revoked',revoked_by='fictional-onboarding-owner',revoked_at=now() WHERE id=$1", [invitation.invitation.id], false)).rejects.toMatchObject({ code: "42501" });
    for (const table of ["customer_invitations", "customer_invitation_projects", "customer_provisioning_audit"]) await expect(raw(`TRUNCATE ${table} CASCADE`)).rejects.toMatchObject({ code: "23514" });
    await expect(raw("UPDATE customer_provisioning_audit SET actor_id='forged' WHERE invitation_id=$1", [invitation.invitation.id])).rejects.toMatchObject({ code: "23514" });
    await expect(raw("DELETE FROM customer_provisioning_audit WHERE invitation_id=$1", [invitation.invitation.id])).rejects.toMatchObject({ code: "23514" });
    await expect(raw("INSERT INTO customer_provisioning_audit(invitation_id,tenant_id,event_type,actor_id,actor_role) VALUES ($1,$2,'issued','forged','owner_internal')", [invitation.invitation.id, f.tenant])).rejects.toMatchObject({ code: "42501" });
    await service.revoke(headers, invitation.invitation.id);
    await expect(raw("UPDATE customer_invitations SET status='pending' WHERE id=$1", [invitation.invitation.id])).rejects.toMatchObject({ code: "23514" });
  });
});

describe("actual Better Auth lifecycle and authorization revocation", () => {
  databaseTest("password, verified email, public creation block and isolated owner/customer cookies", async () => {
    const f = await fixture(), signed = await signIn(f);
    const bad = await auth.api.signInEmail({ body: { email: f.email, password: "fictional-wrong-password" }, asResponse: true });
    expect(bad.status).toBe(401);
    const unverified = await fixture(false);
    const unverifiedLogin = await auth.api.signInEmail({ body: { email: unverified.email, password }, asResponse: true });
    expect(unverifiedLogin.status).toBe(403);
    const signup = await auth.api.signUpEmail({ body: { name: "Fictional blocked", email: `blocked-${crypto.randomUUID()}@example.test`, password }, asResponse: true });
    expect(signup.ok).toBe(false);
    const missing = await fixture();
    await pool.query("DELETE FROM customer_identities WHERE id=$1", [missing.identity]);
    expect((await auth.api.signInEmail({ body: { email: missing.email, password }, asResponse: true })).ok).toBe(false);
    // Same database and actual Better Auth implementation; distinct cookie prefix/base path/secret.
    // This isolated owner-shaped instance has no production owner configuration or user bootstrap.
    const isolatedOwner = betterAuth({ ...createCustomerAuthOptions({ ...configuration, secret: "fictional-owner-secret-different-087afd9087af" }, authPool), basePath: "/api/auth", advanced: { cookiePrefix: "better-auth" } });
    expect(await isolatedOwner.api.getSession({ headers: signed.headers })).toBeNull();
    const ownerResponse = await isolatedOwner.api.signInEmail({ body: { email: f.email, password }, asResponse: true });
    expect(ownerResponse.status).toBe(200);
    const ownerHeaders = new Headers({ cookie: ownerResponse.headers.getSetCookie().map(c => c.split(";")[0]).join("; ") });
    expect(await verifier(ownerHeaders)).toBeNull();
  }, 20000);
  databaseTest("expired and revoked actual sessions cannot redeem even when a cached verifier claims success", async () => {
    const f = await fixture(), signed = await signIn(f), invitation = await issue(f);
    await pool.query('UPDATE customer_auth."session" SET "expiresAt"=now()-interval \'1 second\' WHERE id=$1', [signed.session.session.id]);
    expect(await verifier(signed.headers)).toBeNull();
    const stale = createClientOnboardingService(pool, owner, async () => signed.session);
    await expect(stale.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
    const fresh = await signIn(f);
    await auth.api.signOut({ headers: fresh.headers });
    expect(await verifier(fresh.headers)).toBeNull();
    await expect(createClientOnboardingService(pool, owner, async () => fresh.session).redeem(fresh.headers, invitation.token)).rejects.toThrow("access denied");
  });
  databaseTest("already-established sessions lose access after every lifecycle revocation and removed grants", async () => {
    const f = await fixture(), signed = await signIn(f), invitation = await issue(f);
    await service.redeem(signed.headers, invitation.token);
    const access = () => resolveCustomerProjectAccessForRequest(pool, signed.headers, f.project, { enabled: true, verifySession: verifier });
    expect(await access()).toMatchObject({ tenantId: f.tenant });
    for (const [table, column, key, state] of [
      ["customer_identities", "id", f.identity, "disabled"],
      ["customer_tenants", "id", f.tenant, "suspended"],
      ["customer_tenant_memberships", "identity_id", f.identity, "suspended"],
      ["customer_tenant_projects", "project_id", f.project, "archived"],
      ["customer_project_grants", "identity_id", f.identity, "revoked"],
    ]) {
      await pool.query(`UPDATE ${table} SET status=$1 WHERE ${column}=$2`, [state, key]);
      expect(await verifier(signed.headers)).not.toBeNull();
      expect(await access()).toBeNull();
      await expect(service.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
      await pool.query(`UPDATE ${table} SET status='active' WHERE ${column}=$1`, [key]);
    }
    await pool.query("DELETE FROM customer_project_grants WHERE identity_id=$1", [f.identity]);
    expect(await access()).toBeNull();
    await expect(service.redeem(signed.headers, invitation.token)).rejects.toThrow("access denied");
    expect((await pool.query("SELECT * FROM customer_project_grants WHERE identity_id=$1", [f.identity])).rows).toHaveLength(0);
  }, 20000);
});

describe("0012 additive upgrade", () => {
  databaseTest("prepared-protocol upgrade preserves all prior workspace, authorization and document data", async () => {
    const client = await pool.connect();
    const schema = `onboarding_upgrade_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      for (const file of (await readdir("migrations")).filter(f => f.endsWith(".sql") && f < "0012").sort()) {
        for (const text of parseMigration(file, await readFile(`migrations/${file}`, "utf8")).statements) await client.query({ text, name: `onboarding-${crypto.randomUUID()}` });
      }
      await client.query("INSERT INTO workspaces(id,data) VALUES ('fictional-upgrade',$1)", [{ projects: [{ id: "fictional-project", delivery: { links: [], decisions: [] } }] }]);
      await client.query("INSERT INTO customer_tenants(id,name,status) VALUES ('fictional-tenant','Fictional upgrade','active')");
      await client.query("INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ('fictional-tenant','fictional-project','active')");
      await client.query("SELECT set_config('yorkstead.document_actor','fictional-owner',true),set_config('yorkstead.document_role','owner_internal',true)");
      const doc = (await client.query("INSERT INTO document_registry(tenant_id,project_id,document_type,display_name) VALUES ('fictional-tenant','fictional-project','document','Fictional preserved') RETURNING id")).rows[0];
      await client.query("INSERT INTO document_versions(tenant_id,project_id,document_id,version_number,display_name) VALUES ('fictional-tenant','fictional-project',$1,1,'Fictional preserved')", [doc.id]);
      await client.query("INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ('fictional-identity','fixture','fictional-subject','upgrade@example.test','active')");
      await client.query("INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ('fictional-tenant','fictional-identity','active')");
      await client.query("INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ('fictional-tenant','fictional-project','fictional-identity','active')");
      const version = (await client.query("SELECT id FROM document_versions WHERE document_id=$1", [doc.id])).rows[0];
      await client.query("INSERT INTO document_approval_requests(tenant_id,project_id,document_id,version_id) VALUES ('fictional-tenant','fictional-project',$1,$2)", [doc.id, version.id]);
      const tables = ["workspaces", "customer_tenants", "customer_tenant_projects", "customer_identities", "customer_tenant_memberships", "customer_project_grants", "document_registry", "document_versions", "document_approval_requests", "document_audit_events"];
      const before = [];
      for (const table of tables) before.push((await client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows);
      for (const text of parseMigration("0012_client-onboarding.sql", await readFile("migrations/0012_client-onboarding.sql", "utf8")).statements) await client.query({ text, name: `onboarding-${crypto.randomUUID()}` });
      const after = [];
      for (const table of tables) after.push((await client.query(`SELECT * FROM ${table} ORDER BY 1`)).rows);
      expect(after).toEqual(before);
      expect((await client.query("SELECT * FROM customer_invitations")).rows).toHaveLength(0);
    } finally { await client.query("ROLLBACK"); client.release(); }
  }, 20000);
});
