import { afterAll, describe, expect, test } from "bun:test";
import { Pool } from "pg";
import { createDocumentService } from "@/lib/document-approval";
import { getCustomerProjectAccess } from "@/lib/customer-portal-authorization";

const databaseTest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const headers = new Headers();
const owner = createDocumentService(pool, async () => ({ user: { id: "fictional-owner" } }));
afterAll(() => pool.end());

async function fixture() {
  const suffix = crypto.randomUUID();
  const tenant = `doc-tenant-${suffix}`, project = `doc-project-${suffix}`, otherProject = `doc-other-${suffix}`;
  const identity = `doc-identity-${suffix}`;
  await pool.query("INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional document test','active')", [tenant]);
  await pool.query("INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active'),($1,$3,'active')", [tenant, project, otherProject]);
  await pool.query("INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,'fixture',$1,$2,'active')", [identity, `${suffix}@example.test`]);
  await pool.query("INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'active')", [tenant, identity]);
  await pool.query("INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ($1,$2,$3,'active')", [tenant, project, identity]);
  const created = await owner.createDocument(headers, project, { documentType: "design", displayName: "Fictional brief", metadata: { reference: "TEST" } });
  return { tenant, project, otherProject, identity, ...created };
}
async function pending(f: Awaited<ReturnType<typeof fixture>>) {
  await owner.setLifecycle(headers, f.project, f.document.id, "internal_review");
  const request = await owner.createApproval(headers, f.project, f.document.id, f.version.id);
  await owner.transitionApproval(headers, f.project, f.document.id, request.id, "pending");
  return request;
}
async function raw(query: string, values: unknown[], actor = true) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (actor) await client.query("SELECT set_config('yorkstead.document_actor','fictional-owner',true),set_config('yorkstead.document_role','owner_internal',true)");
    return await client.query(query, values);
  } finally { await client.query("ROLLBACK"); client.release(); }
}

describe("document PostgreSQL security and concurrency", () => {
  databaseTest("scope selectors cannot cross projects or tenants", async () => {
    const a = await fixture(), b = await fixture();
    for (const project of [a.otherProject, b.project]) {
      await expect(owner.history(headers, project, a.document.id)).rejects.toThrow("access denied");
      await expect(owner.appendVersion(headers, project, a.document.id, { displayName: "Forged" })).rejects.toThrow("access denied");
      await expect(owner.createApproval(headers, project, a.document.id, a.version.id)).rejects.toThrow("access denied");
    }
    await expect(raw(`INSERT INTO document_versions(tenant_id,project_id,document_id,version_number,display_name) VALUES ($1,$2,$3,2,'forged')`, [b.tenant,b.project,a.document.id])).rejects.toMatchObject({ code: "23503" });
    await expect(raw(`INSERT INTO document_approval_requests(tenant_id,project_id,document_id,version_id) VALUES ($1,$2,$3,$4)`, [b.tenant,b.project,a.document.id,a.version.id])).rejects.toMatchObject({ code: "23503" });
  });
  databaseTest("missing/revoked grants and disabled or suspended authorization fail closed", async () => {
    const f = await fixture();
    const access = () => getCustomerProjectAccess(pool, { provider: "fixture", subject: f.identity }, f.project);
    expect(await access()).toMatchObject({ tenantId: f.tenant });
    expect(await getCustomerProjectAccess(pool, { provider: "fixture", subject: f.identity }, f.otherProject)).toBeNull();
    for (const [table, column, value, state] of [
      ["customer_project_grants", "identity_id", f.identity, "revoked"],
      ["customer_identities", "id", f.identity, "disabled"],
      ["customer_tenant_memberships", "identity_id", f.identity, "suspended"],
      ["customer_tenants", "id", f.tenant, "suspended"],
      ["customer_tenant_projects", "project_id", f.project, "archived"],
    ]) {
      // Identifiers are fixed test constants, never request input.
      await pool.query(`UPDATE ${table} SET status=$1 WHERE ${column}=$2`, [state, value]);
      expect(await access()).toBeNull();
      if (table === "customer_tenants" || table === "customer_tenant_projects") await expect(owner.history(headers,f.project,f.document.id)).rejects.toThrow("access denied");
      await pool.query(`UPDATE ${table} SET status='active' WHERE ${column}=$1`, [value]);
    }
    await pool.query("DELETE FROM customer_project_grants WHERE identity_id=$1", [f.identity]);
    expect(await access()).toBeNull();
    await expect(owner.customerHistory(headers,f.project,f.document.id)).rejects.toThrow("access denied");
    await expect(owner.customerDecision()).rejects.toThrow("access denied");
  });
  databaseTest("versions and scope are immutable, sequential, server-timestamped and nondeletable", async () => {
    const f = await fixture();
    for (const sql of ["UPDATE document_versions SET display_name='forged' WHERE id=$1", "DELETE FROM document_versions WHERE id=$1"]) {
      await expect(raw(sql,[f.version.id])).rejects.toMatchObject({ code: "23514" });
    }
    await expect(raw("UPDATE document_registry SET project_id=$2 WHERE id=$1",[f.document.id,f.otherProject])).rejects.toMatchObject({ code: "23514" });
    await expect(raw("DELETE FROM document_registry WHERE id=$1",[f.document.id])).rejects.toMatchObject({ code: "23514" });
    await expect(raw("INSERT INTO document_versions(tenant_id,project_id,document_id,version_number,display_name) VALUES ($1,$2,$3,9,'skip')",[f.tenant,f.project,f.document.id])).rejects.toMatchObject({ code: "23514" });
    const concurrent = await Promise.all([1,2,3].map(n => owner.appendVersion(headers,f.project,f.document.id,{displayName:`Revision ${n}`})));
    expect(concurrent.map(v=>v.version_number).sort()).toEqual([2,3,4]);
    expect(new Set(concurrent.map(v=>v.id)).size).toBe(3);
    const h = await owner.history(headers,f.project,f.document.id);
    expect(h.versions[0].display_name).toBe("Fictional brief");
    expect(h.versions.every(v=>v.created_at instanceof Date)).toBe(true);
  });
  databaseTest("unauthorized actor and invalid state transitions have no side effects", async () => {
    const f = await fixture();
    const denied = createDocumentService(pool,async()=>null);
    const r = await owner.createApproval(headers,f.project,f.document.id,f.version.id);
    await expect(denied.transitionApproval(headers,f.project,f.document.id,r.id,"approved")).rejects.toThrow("access denied");
    await expect(owner.transitionApproval(headers,f.project,f.document.id,r.id,"approved")).rejects.toThrow("conflict");
    await expect(owner.transitionApproval(headers,f.project,f.document.id,r.id,"pending")).rejects.toThrow("conflict");
    await expect(raw("UPDATE document_approval_requests SET status='approved' WHERE id=$1",[r.id])).rejects.toMatchObject({code:"23514"});
    await expect(raw("UPDATE document_registry SET display_name='forged' WHERE id=$1",[f.document.id],false)).rejects.toMatchObject({code:"42501"});
    expect((await owner.history(headers,f.project,f.document.id)).approvals[0].status).toBe("draft");
  });
  databaseTest("draft requests can enter internal review and changes requested preserves the version", async () => {
    const f = await fixture();
    const r = await owner.createApproval(headers,f.project,f.document.id,f.version.id);
    await owner.setLifecycle(headers,f.project,f.document.id,"internal_review");
    await owner.transitionApproval(headers,f.project,f.document.id,r.id,"pending");
    await owner.transitionApproval(headers,f.project,f.document.id,r.id,"changes_requested","Internal revision needed");
    const h = await owner.history(headers,f.project,f.document.id);
    expect(h.document.status).toBe("draft");
    expect(h.versions).toHaveLength(1);
    expect(h.approvals[0].status).toBe("changes_requested");
    expect(h.approvals[0].decision_comment).toBe("Internal revision needed");
    expect(JSON.stringify(h.audit)).not.toContain("Internal revision needed");
    await expect(owner.transitionApproval(headers,f.project,f.document.id,r.id,"pending")).rejects.toThrow("conflict");
  });
  databaseTest("simultaneous conflicting decisions yield exactly one final decision and audit event", async () => {
    const f = await fixture(), r = await pending(f);
    const results = await Promise.allSettled(["approved","changes_requested"].map(s=>owner.transitionApproval(headers,f.project,f.document.id,r.id,s,"Internal fictional review")));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    const h = await owner.history(headers,f.project,f.document.id);
    expect(h.approvals[0].decision_actor_id).toBe("fictional-owner");
    expect(h.approvals[0].decision_role).toBe("owner_internal");
    expect(h.approvals[0].decided_at).toBeInstanceOf(Date);
    expect(h.audit.filter(e=>e.to_state==='approved' || e.to_state==='changes_requested').filter(e=>e.entity_type==='approval')).toHaveLength(1);
    expect(JSON.stringify(h.audit)).not.toContain("Internal fictional review");
    await expect(owner.transitionApproval(headers,f.project,f.document.id,r.id,"approved")).rejects.toThrow("conflict");
  });
  databaseTest("later versions supersede open requests and cannot inherit earlier consent", async () => {
    const f = await fixture(), r = await pending(f);
    await owner.transitionApproval(headers,f.project,f.document.id,r.id,"approved");
    const v2 = await owner.appendVersion(headers,f.project,f.document.id,{displayName:"Second"});
    let h = await owner.history(headers,f.project,f.document.id);
    expect(h.document.status).toBe("draft");
    expect(h.approvals[0].version_id).toBe(f.version.id);
    await expect(owner.createApproval(headers,f.project,f.document.id,f.version.id)).rejects.toThrow("conflict");
    await expect(raw("INSERT INTO document_approval_requests(tenant_id,project_id,document_id,version_id) VALUES ($1,$2,$3,$4)",[f.tenant,f.project,f.document.id,f.version.id])).rejects.toMatchObject({code:"23514"});
    await owner.setLifecycle(headers,f.project,f.document.id,"internal_review");
    const r2 = await owner.createApproval(headers,f.project,f.document.id,v2.id);
    await owner.transitionApproval(headers,f.project,f.document.id,r2.id,"pending");
    await owner.appendVersion(headers,f.project,f.document.id,{displayName:"Third"});
    await expect(owner.transitionApproval(headers,f.project,f.document.id,r2.id,"approved")).rejects.toThrow("conflict");
    h = await owner.history(headers,f.project,f.document.id);
    expect(h.approvals.find(a=>a.id===r2.id)?.status).toBe("superseded");
    expect(h.document.status).toBe("draft");
  });
  databaseTest("new-version and decision race never approves the later version", async () => {
    const f = await fixture(), r = await pending(f);
    const results = await Promise.allSettled([
      owner.transitionApproval(headers,f.project,f.document.id,r.id,"approved"),
      owner.appendVersion(headers,f.project,f.document.id,{displayName:"Concurrent revision"}),
    ]);
    expect(results[1].status).toBe("fulfilled");
    const h = await owner.history(headers,f.project,f.document.id);
    expect(h.document.status).toBe("draft");
    expect(h.versions).toHaveLength(2);
    expect(h.approvals.every(a=>a.version_id===f.version.id)).toBe(true);
    expect(["approved","superseded"]).toContain(h.approvals[0].status);
  });
  databaseTest("duplicate requests, archived writes, cancelled decisions and audit alteration are rejected", async () => {
    const f = await fixture(), r = await pending(f);
    await expect(owner.createApproval(headers,f.project,f.document.id,f.version.id)).rejects.toMatchObject({code:"23505"});
    await owner.setLifecycle(headers,f.project,f.document.id,"archived");
    await expect(owner.appendVersion(headers,f.project,f.document.id,{displayName:"No"})).rejects.toThrow("conflict");
    await expect(owner.transitionApproval(headers,f.project,f.document.id,r.id,"approved")).rejects.toThrow("conflict");
    const before = await owner.history(headers,f.project,f.document.id);
    for (const sql of ["UPDATE document_audit_events SET actor_id='forged' WHERE document_id=$1", "DELETE FROM document_audit_events WHERE document_id=$1"]) await expect(raw(sql,[f.document.id])).rejects.toMatchObject({code:"23514"});
    for (const table of ["document_registry","document_versions","document_approval_requests","document_audit_events"]) await expect(raw(`TRUNCATE ${table} CASCADE`,[])).rejects.toMatchObject({code:"23514"});
    await expect(raw(`INSERT INTO document_audit_events(tenant_id,project_id,document_id,entity_id,entity_type,event_type,actor_id,actor_role) VALUES ($1,$2,$3,$3,'document','document.created','forged','owner_internal')`,[f.tenant,f.project,f.document.id])).rejects.toMatchObject({code:"42501"});
    const after = await owner.history(headers,f.project,f.document.id);
    expect(after.audit).toEqual(before.audit);
    expect(after.audit.every(e=>e.actor_id==='fictional-owner' && e.actor_role==='owner_internal')).toBe(true);
    expect(after.approvals[0].status).toBe("cancelled");
  });
});

describe("document migration upgrade", () => {
  databaseTest("0011 preserves pre-existing workspace, delivery and customer authorization rows", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { parseMigration } = await import("@/scripts/migration-plan");
    const client = await pool.connect();
    const schema = `doc_upgrade_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      for (const file of (await readdir("migrations")).filter(f=>f.endsWith('.sql') && f<'0011').sort()) {
        for (const sql of parseMigration(file, await readFile(`migrations/${file}`,"utf8")).statements) await client.query(sql);
      }
      const delivery = { projects: [{ id: "existing-project", delivery: { decisions: [{ id:"decision",status:"accepted" }], links: [] } }] };
      await client.query("INSERT INTO workspaces(id,data) VALUES ('existing-workspace',$1)",[delivery]);
      await client.query("INSERT INTO customer_tenants(id,name,status) VALUES ('existing-tenant','Fictional upgrade','active')");
      await client.query("INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ('existing-tenant','existing-project','active')");
      await client.query("INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ('existing-identity','fixture','existing-subject','upgrade@example.test','active')");
      await client.query("INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ('existing-tenant','existing-identity','active')");
      await client.query("INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ('existing-tenant','existing-project','existing-identity','active')");
      const tables = ['workspaces','customer_tenants','customer_tenant_projects','customer_identities','customer_tenant_memberships','customer_project_grants'];
      const before = [];
      for (const table of tables) before.push(await client.query(`SELECT * FROM ${table}`));
      const migration = parseMigration('0011_document-approval-foundation.sql',await readFile('migrations/0011_document-approval-foundation.sql','utf8'));
      for (const sql of migration.statements) await client.query(sql);
      const after = [];
      for (const table of tables) after.push(await client.query(`SELECT * FROM ${table}`));
      expect(after.map(r=>r.rows)).toEqual(before.map(r=>r.rows));
      expect((await client.query('SELECT count(*)::int AS n FROM document_registry')).rows[0].n).toBe(0);
      expect(await getCustomerProjectAccess(client,{provider:'fixture',subject:'existing-subject'},'existing-project')).toMatchObject({tenantId:'existing-tenant'});
    } finally { await client.query("ROLLBACK"); client.release(); }
  });
  databaseTest("migration runner repeat does not change existing document history", async () => {
    const f = await fixture();
    const before = await owner.history(headers,f.project,f.document.id);
    const environment: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(Bun.env)) if (typeof value === "string") environment[key] = value;
    for (let i=0; i<2; i++) {
      const process = Bun.spawn([Bun.which('bun') ?? Bun.argv[0], 'scripts/migrate.ts'], {
        env: { ...environment, DATABASE_URL: Bun.env.TEST_DATABASE_URL!, MIGRATION_DATABASE_DRIVER:'postgres' }, stdout:'pipe',stderr:'pipe',
      });
      const stderr = await new Response(process.stderr).text();
      const code = await process.exited;
      expect({code,stderr}).toEqual({code:0,stderr:''});
    }
    expect(await owner.history(headers,f.project,f.document.id)).toEqual(before);
  });
});
