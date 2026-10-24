import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { createCustomerAuthOptions } from "@/lib/customer-auth";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { createClientProjectPublicationService, createClientProjectReader, type PublicationRecord } from "@/lib/client-project-data";
import { toCustomerPortalView } from "@/lib/client-project-projection";
import type { Workspace } from "@/lib/workspace";

const dbTest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const authPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: "-c search_path=customer_auth" });
const auth = betterAuth(createCustomerAuthOptions({ baseURL: "http://localhost:3100", databaseURL: process.env.TEST_DATABASE_URL ?? "postgresql://localhost/disposable", secret: "fictional-cc008-provider-secret-123456789012345" }, authPool));
const owner = async () => ({ user: { id: "fictional-cc008-owner" } });
const service = createClientProjectPublicationService(pool, owner);
const read = createClientProjectReader(pool, headers => auth.api.getSession({ headers, query: { disableCookieCache: true } }));
const headers = new Headers();
afterAll(async () => { await pool.end(); await authPool.end(); });
// Preserve the shared application's source fixture for existing CRM integration tests.
let previousWorkspace: { data: unknown; updated_at: Date } | undefined;
beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) previousWorkspace = (await pool.query("SELECT data,updated_at FROM workspaces WHERE id='primary'")).rows[0];
});
afterEach(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  if (previousWorkspace) await pool.query("INSERT INTO workspaces(id,data,updated_at) VALUES ('primary',$1,$2) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",[previousWorkspace.data,previousWorkspace.updated_at]);
  else await pool.query("DELETE FROM workspaces WHERE id='primary'");
});


async function fixture() {
  const suffix = crypto.randomUUID();
  const tenants = ["a", "b"].map(v => `cc008-${v}-${suffix}`);
  const projects = ["a", "b"].map(v => `cc008-project-${v}-${suffix}`);
  const identities = ["a", "b"].map(v => `cc008-identity-${v}-${suffix}`);
  const subjects = ["a", "b"].map(v => `cc008-subject-${v}-${suffix}`);
  const password = "fictional-cc008-password-314159265";
  const hashed = await (await auth.$context).password.hash(password);
  const sessions: Headers[] = [];
  for (let i=0;i<2;i++) {
    const email = `${subjects[i]}@example.test`;
    await pool.query("INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional CC008 tenant','active')", [tenants[i]]);
    await pool.query("INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active')", [tenants[i], projects[i]]);
    await pool.query("INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,$2,$3,$4,'active')", [identities[i], customerAuthBoundary.identityProvider, subjects[i], email]);
    await pool.query("INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'active')", [tenants[i],identities[i]]);
    await pool.query("INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ($1,$2,$3,'active')", [tenants[i],projects[i],identities[i]]);
    await pool.query('INSERT INTO customer_auth."user"(id,name,email,"emailVerified") VALUES ($1,\'Fictional CC008 customer\',$2,true)', [subjects[i],email]);
    await pool.query('INSERT INTO customer_auth."account"(id,"userId","accountId","providerId",password) VALUES ($1,$1,$1,\'credential\',$2)', [subjects[i],hashed]);
    const response = await auth.api.signInEmail({ body: { email,password }, asResponse: true });
    expect(response.status).toBe(200);
    sessions.push(new Headers({ cookie: response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ") }));
  }
  const workspace: Workspace = { projects: projects.map((id,i) => ({ id, name: `Fictional project ${i}`, description: "Reviewed summary", eyebrow: "Internal phase", status: "Active", kind: "Software", progress: 30, stack: ["PRIVATE STACK"], note: "PRIVATE NOTE", repo: "https://private.example.test", updatedAt: "2026-10-01T12:00:00Z", updatedLabel: "Private", accent: "cyan", delivery: {
    milestones: [{ id: "milestone",title: "Reviewed milestone",targetDate: "2026-11-01",status: "planned",acceptanceCriteria: "PRIVATE ACCEPTANCE" }],
    deliverables: [{ id: "deliverable", title: "Reviewed deliverable",description: "Optional description",status: "in_progress" }],
    activity: [{ id: "activity", message: "PRIVATE ACTIVITY",createdAt: "2026-10-01T12:00:00Z" }], decisions: [{ id: "decision",title: "PRIVATE DECISION",notes: "PRIVATE DECISION NOTES",status: "accepted" }], links: [{ id: "link",title: "PRIVATE FILE",kind: "document",url: "https://private.example.test" }],payment: { status: "paid",reference: "PRIVATE PAYMENT",updatedAt: "2026-10-01T12:00:00Z" },
  } })), tasks: [],activity: [],notes: [{ id: "update",projectId: projects[0],type: "Update",content: "Reviewed customer update",createdAt: "2026-10-01T12:00:00Z" },{ id: "private-note",projectId: projects[0],type: "Decision",content: "PRIVATE DECISION",createdAt: "2026-10-01T12:00:00Z" }] };
  await pool.query("INSERT INTO workspaces(id,data) VALUES ('primary',$1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=now()", [workspace]);
  return { tenants,projects,identities,subjects,sessions,workspace };
}
async function prepare(f: Awaited<ReturnType<typeof fixture>>, kind: PublicationRecord["kind"], sourceId = kind === "project" ? f.projects[0] : kind, expectedRevision = 0) {
  return service.prepare(headers,f.projects[0],{ kind,sourceId,expectedRevision,includeDescription: true });
}
async function approve(f: Awaited<ReturnType<typeof fixture>>, row: PublicationRecord) {
  return service.approve(headers,f.projects[0],row.id,row.revision);
}
async function published(f: Awaited<ReturnType<typeof fixture>>) { return approve(f,await prepare(f,"project")); }

// Serial within this file: fixtures use the one authoritative disposable primary workspace.
dbTest("actual Better Auth session receives only opt-in approved project/children/dates and audit retains owner", async () => {
  const f = await fixture();
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  const overview = await prepare(f,"project");
  const milestone = await approve(f,await prepare(f,"milestone"));
  const deliverable = await prepare(f,"deliverable");
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  await approve(f,overview);
  let projection = (await read(f.sessions[0],f.projects[0]))!;
  expect(projection.milestones).toHaveLength(1);
  expect(projection.milestones[0].targetDate).toBeUndefined();
  expect(projection.deliverables).toHaveLength(0);
  expect(projection.updates).toHaveLength(0);
  await approve(f,deliverable);
  await approve(f,await prepare(f,"date","milestone"));
  await approve(f,await prepare(f,"update"));
  projection = (await read(f.sessions[0],f.projects[0]))!;
  expect(projection.version).toBe(1);
  expect(projection.milestones[0].targetDate).toBe("2026-11-01");
  expect(projection.deliverables).toHaveLength(1);
  expect(projection.updates[0].content.detail).toBe("Reviewed customer update");
  expect(JSON.stringify(toCustomerPortalView(projection))).not.toContain("PRIVATE");
  expect(JSON.stringify(projection)).not.toMatch(/tenant_id|decided_by|source_digest|fictional-cc008-owner/);
  const otherDraft = await service.prepare(headers,f.projects[1],{ kind: "project",sourceId: f.projects[1],expectedRevision: 0,includeDescription: true });
  await service.approve(headers,f.projects[1],otherDraft.id,otherDraft.revision);
  expect((await read(f.sessions[1],f.projects[1]))!.overview.title).toBe("Fictional project 1");
  expect(await read(f.sessions[1],f.projects[0])).toBeNull();
  expect(await read(f.sessions[0],f.projects[1])).toBeNull();
  // Membership alone never grants a second, already-published project.
  await pool.query("INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'active')",[f.tenants[1],f.identities[0]]);
  expect(await read(f.sessions[0],f.projects[1])).toBeNull();
  expect(await read(new Headers({ "x-user-id": f.subjects[0] }),f.projects[0])).toBeNull();
  await expect(prepare(f,"update","private-note")).rejects.toThrow("access denied");
  await expect(service.approve(headers,f.projects[1],milestone.id,milestone.revision)).rejects.toThrow("access denied");
  const history = await service.inspect(headers,f.projects[0]);
  expect(history.audit.every(r => r.actor_id === "fictional-cc008-owner" && r.actor_role === "owner_internal" && r.created_at instanceof Date)).toBe(true);
  expect(history.records.filter(r => r.state==='approved').every(r => r.decided_by==='fictional-cc008-owner' && r.decided_at instanceof Date)).toBe(true);
});

dbTest("withdrawals, suspended lifecycle, grant/session revocation and owner impersonation fail closed", async () => {
  const f = await fixture();
  const overview = await published(f);
  const child = await approve(f,await prepare(f,"milestone"));
  await service.withdraw(headers,f.projects[0],child.id,child.revision);
  expect((await read(f.sessions[0],f.projects[0]))!.milestones).toHaveLength(0);
  for (const [table,column,value] of [["customer_identities","id",f.identities[0]],["customer_tenants","id",f.tenants[0]],["customer_tenant_memberships","identity_id",f.identities[0]],["customer_tenant_projects","project_id",f.projects[0]],["customer_project_grants","project_id",f.projects[0]]]) {
    await pool.query(`UPDATE ${table} SET status='disabled' WHERE ${column}=$1`,[value]);
    expect(await read(f.sessions[0],f.projects[0])).toBeNull();
    await expect(prepare(f,"milestone")).rejects.toThrow();
    await pool.query(`UPDATE ${table} SET status='active' WHERE ${column}=$1`,[value]);
  }
  await pool.query("UPDATE customer_project_grants SET status='revoked' WHERE project_id=$1",[f.projects[0]]);
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  await pool.query("UPDATE customer_project_grants SET status='active' WHERE project_id=$1",[f.projects[0]]);
  await service.withdraw(headers,f.projects[0],overview.id,overview.revision);
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  const denied = createClientProjectPublicationService(pool,async () => null);
  await expect(denied.inspect(new Headers({ "x-role": "owner" }),f.projects[0])).rejects.toThrow("access denied");
  await expect(denied.prepare(headers,f.projects[0],{ kind: "project",sourceId: f.projects[0],expectedRevision: 0 })).rejects.toThrow("access denied");
  await expect(denied.approve(headers,f.projects[0],overview.id,overview.revision)).rejects.toThrow("access denied");
  await expect(denied.withdraw(headers,f.projects[0],overview.id,overview.revision)).rejects.toThrow("access denied");
  await pool.query('DELETE FROM customer_auth."session" WHERE "userId"=$1',[f.subjects[0]]);
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
});

dbTest("saved edits, deletion and restoration invalidate snapshots and require preparation and new review", async () => {
  const f = await fixture();
  const overview = await published(f);
  await approve(f,await prepare(f,"milestone"));
  f.workspace.projects[0].description = "Edited summary";
  await pool.query("UPDATE workspaces SET data=$1 WHERE id='primary'",[f.workspace]);
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  const invalidated = await service.inspect(headers,f.projects[0]);
  expect(invalidated.records.every(r => r.state==='draft' && r.source_digest===null)).toBe(true);
  expect(invalidated.audit.filter(r => r.event==='source_invalidated').every(r => r.actor_role==='system')).toBe(true);
  await expect(approve(f,overview)).rejects.toThrow("conflict");
  const current = invalidated.records.find(r => r.kind==='project')!;
  await expect(approve(f,current)).rejects.toThrow("conflict");
  await approve(f,await prepare(f,"project",f.projects[0],current.revision));
  expect((await read(f.sessions[0],f.projects[0]))!.overview.summary).toBe("Edited summary");
  f.workspace.projects = f.workspace.projects.slice(1);
  await pool.query("UPDATE workspaces SET data=$1 WHERE id='primary'",[f.workspace]);
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  await expect(prepare(f,"project",f.projects[0],5)).rejects.toThrow("access denied");
  await pool.query("DELETE FROM workspaces WHERE id='primary'");
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  await pool.query("INSERT INTO workspaces(id,data) VALUES ('primary',$1)",[f.workspace]);
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
});

dbTest("competing owner decisions serialize, audit is immutable and failed operations preserve state", async () => {
  const f = await fixture();
  const draft = await prepare(f,"project");
  const results = await Promise.allSettled([approve(f,draft), service.withdraw(headers,f.projects[0],draft.id,draft.revision)]);
  expect(results.filter(r => r.status==='fulfilled')).toHaveLength(1);
  expect(results.filter(r => r.status==='rejected')).toHaveLength(1);
  let history = await service.inspect(headers,f.projects[0]);
  expect(history.audit).toHaveLength(2);
  const current = history.records[0];
  const staged = await prepare(f,"project",f.projects[0],current.revision);
  const invalidOwner = createClientProjectPublicationService(pool,async () => ({ user: { id: " " } }));
  await expect(invalidOwner.approve(headers,f.projects[0],staged.id,staged.revision)).rejects.toThrow("access denied");
  await expect(pool.query("UPDATE client_project_publication_audit SET actor_id='forged' WHERE project_id=$1",[f.projects[0]])).rejects.toThrow("append-only");
  await expect(pool.query("DELETE FROM client_project_publications WHERE project_id=$1",[f.projects[0]])).rejects.toThrow("retained");
  await expect(pool.query("UPDATE client_project_publications SET state='approved' WHERE id=$1",[staged.id])).rejects.toThrow("owner required");
  history = await service.inspect(headers,f.projects[0]);
  expect(history.records[0].state).toBe('draft');
  expect(history.audit).toHaveLength(3);
});

dbTest("source edit and approval serialize and never leave changed source visible", async () => {
  const f = await fixture();
  const draft = await prepare(f,"project");
  f.workspace.projects[0].name = "Changed during approval";
  const results = await Promise.allSettled([
    approve(f,draft),
    pool.query("UPDATE workspaces SET data=$1 WHERE id='primary'",[f.workspace]),
  ]);
  expect(results[1].status).toBe('fulfilled');
  expect(await read(f.sessions[0],f.projects[0])).toBeNull();
  const history = await service.inspect(headers,f.projects[0]);
  expect(history.records[0].state).toBe('draft');
  expect(history.records[0].source_digest).toBeNull();
  expect(history.audit.at(-1).event).toBe('source_invalidated');
});

dbTest("archived mappings and suspended tenant/membership deny publication and projection", async () => {
  const f = await fixture();
  await published(f);
  for (const [table,column,value,status] of [["customer_tenants","id",f.tenants[0],"suspended"],["customer_tenant_memberships","identity_id",f.identities[0],"suspended"],["customer_tenant_projects","project_id",f.projects[0],"archived"]]) {
    await pool.query(`UPDATE ${table} SET status=$2 WHERE ${column}=$1`,[value,status]);
    expect(await read(f.sessions[0],f.projects[0])).toBeNull();
    // Owner preparation is scoped to active tenant/project, independent of any one customer membership.
    if (table !== "customer_tenant_memberships") await expect(prepare(f,"deliverable")).rejects.toThrow("access denied");
    await pool.query(`UPDATE ${table} SET status='active' WHERE ${column}=$1`,[value]);
  }
});
