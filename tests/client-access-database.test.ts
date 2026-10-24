import { afterAll, expect, test } from "bun:test";
import { Pool } from "pg";
import { createClientAccessAdminService } from "@/lib/client-access-admin";
import { createClientOnboardingService } from "@/lib/client-onboarding";
import { getCustomerProjectAccess } from "@/lib/customer-portal-authorization";
import { parseMigration } from "@/scripts/migration-plan";
import { readFile, readdir } from "node:fs/promises";
const dbtest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const owner = async () => ({ user: { id: "fictional-cc010-owner" } }),
  headers = new Headers();
const service = createClientAccessAdminService(pool, owner, true),
  onboarding = createClientOnboardingService(pool, owner);
afterAll(() => pool.end());
async function fixture() {
  const suffix = crypto.randomUUID(),
    tenant = `access-${suffix}`,
    project = `access-project-${suffix}`,
    identity = `access-identity-${suffix}`;
  await pool.query(
    "INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional access tenant','active')",
    [tenant],
  );
  await pool.query(
    "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active')",
    [tenant, project],
  );
  await pool.query(
    "INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,'fixture',$1,'fictional@example.test','active')",
    [identity],
  );
  await pool.query(
    "INSERT INTO customer_tenant_memberships(tenant_id,identity_id,status) VALUES ($1,$2,'active')",
    [tenant, identity],
  );
  await pool.query(
    "INSERT INTO customer_project_grants(tenant_id,project_id,identity_id,status) VALUES ($1,$2,$3,'active')",
    [tenant, project, identity],
  );
  return { tenant, project, identity };
}
dbtest(
  "bounded secret-free inspection, separate preparation, exact safe retry and authoritative invitation expiry/supersession",
  async () => {
    const a = await fixture(),
      b = await fixture();
    const first = await onboarding.issue(headers, {
      tenantId: a.tenant,
      recipientEmail: "fictional@example.test",
      projectIds: [a.project],
    });
    await onboarding.issue(headers, {
      tenantId: a.tenant,
      recipientEmail: "fictional@example.test",
      projectIds: [a.project],
    });
    const input = {
      action: "prepareInvitation",
      tenantId: a.tenant,
      preparationId: crypto.randomUUID(),
      recipientEmail: "future@example.test",
      projectIds: [a.project],
      expiresInSeconds: 86400,
    };
    await service.mutate(headers, input);
    await service.mutate(headers, input);
    const view = await service.inspect(headers, { tenantId: a.tenant });
    expect(view.selected?.launchReady).toBe(false);
    expect(view.selected?.preparations).toHaveLength(1);
    expect(view.selected?.invitations.map((i) => i.status)).toContain(
      "superseded",
    );
    expect(view.selected?.invitations).toHaveLength(2);
    expect(view.selected?.invitations.every((i) => !i.expired)).toBe(true);
    expect(view.selected?.grants.every((g) => g.projectId === a.project)).toBe(
      true,
    );
    const serialized = JSON.stringify(view);
    for (const secret of [
      first.token,
      "token_verifier",
      "auth_subject",
      "password",
      "email_proof",
    ])
      expect(serialized).not.toContain(secret);
    expect(
      view.selected?.audit.filter(
        (a) => a.type === "client_invitation_preparations",
      ),
    ).toHaveLength(1);
    expect(
      view.selected?.audit.every((a) => a.actor === "fictional-cc010-owner"),
    ).toBe(true);
    await expect(
      service.mutate(headers, {
        ...input,
        preparationId: crypto.randomUUID(),
        projectIds: [b.project],
      }),
    ).rejects.toThrow("unavailable");
    await expect(
      service.mutate(headers, {
        ...input,
        recipientEmail: "changed@example.test",
      }),
    ).rejects.toThrow("changed");
    const readonly = createClientAccessAdminService(pool, owner);
    await expect(readonly.mutate(headers, input)).rejects.toThrow(
      "unavailable",
    );
  },
);
dbtest(
  "concurrent CAS revocation denies cross-tenant mutation, retains audit and cannot restore established access",
  async () => {
    const a = await fixture(),
      b = await fixture();
    const access = () =>
      getCustomerProjectAccess(
        pool,
        { provider: "fixture", subject: a.identity },
        a.project,
      );
    expect(await access()).not.toBeNull();
    const input = {
      action: "revokeGrant",
      tenantId: a.tenant,
      identityId: a.identity,
      projectId: a.project,
      expectedRevision: 1,
      confirmed: true,
    };
    await expect(
      service.mutate(headers, { ...input, tenantId: b.tenant }),
    ).rejects.toThrow("unavailable");
    const results = await Promise.allSettled([
      service.mutate(headers, input),
      service.mutate(headers, input),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await access()).toBeNull();
    const view = await service.inspect(headers, { tenantId: a.tenant });
    expect(view.selected?.grants[0]).toMatchObject({
      status: "revoked",
      revision: 2,
      effective: false,
    });
    expect(view.selected?.audit).toHaveLength(1);
    await expect(
      service.mutate(headers, { ...input, expectedRevision: 2 }),
    ).rejects.toThrow("changed");
    await service.mutate(headers, {
      action: "suspendMembership",
      tenantId: a.tenant,
      identityId: a.identity,
      expectedRevision: 1,
      confirmed: true,
    });
    expect(
      (await service.inspect(headers, { tenantId: a.tenant })).selected
        ?.identities[0].membershipStatus,
    ).toBe("suspended");
    const event = view.selected!.audit[0];
    expect(event.at).toMatch(/^20/);
    await expect(
      pool.query(
        "UPDATE client_access_admin_audit SET actor_id='forged' WHERE id=$1",
        [event.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query("DELETE FROM client_access_admin_audit WHERE id=$1", [
        event.id,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query("TRUNCATE client_access_admin_audit"),
    ).rejects.toMatchObject({ code: "23514" });
  },
);
dbtest(
  "invitation revocation uses original lifecycle, revision conflicts and provisioning audit",
  async () => {
    const a = await fixture();
    const invitation = await onboarding.issue(headers, {
      tenantId: a.tenant,
      recipientEmail: "fictional@example.test",
      projectIds: [a.project],
    });
    const input = {
      action: "revokeInvitation",
      tenantId: a.tenant,
      invitationId: invitation.invitation.id,
      expectedRevision: 1,
      confirmed: true,
    };
    await service.mutate(headers, input);
    await expect(service.mutate(headers, input)).rejects.toThrow("changed");
    const v = (await service.inspect(headers, { tenantId: a.tenant }))
      .selected!;
    expect(v.invitations[0]).toMatchObject({ status: "revoked", revision: 2 });
    expect(
      v.invitationAudit.some(
        (a) => a.event === "revoked" && a.actor === "fictional-cc010-owner",
      ),
    ).toBe(true);
  },
);
dbtest(
  "organization duplicate, stale rename and mapping archival never restore revoked grants",
  async () => {
    const id = `disabled-${crypto.randomUUID()}`;
    await service.mutate(headers, {
      action: "createTenant",
      tenantId: id,
      name: "Fictional disabled",
    });
    await expect(
      service.mutate(headers, {
        action: "createTenant",
        tenantId: id,
        name: "Duplicate",
      }),
    ).rejects.toThrow("changed");
    await service.mutate(headers, {
      action: "renameTenant",
      tenantId: id,
      name: "Fictional renamed",
      expectedRevision: 1,
    });
    await expect(
      service.mutate(headers, {
        action: "renameTenant",
        tenantId: id,
        name: "Stale",
        expectedRevision: 1,
      }),
    ).rejects.toThrow("changed");
    expect(
      (await service.inspect(headers, { tenantId: id })).selected?.status,
    ).toBe("disabled");
    const a = await fixture();
    await service.mutate(headers, {
      action: "archiveMapping",
      tenantId: a.tenant,
      projectId: a.project,
      expectedRevision: 1,
      confirmed: true,
    });
    expect(
      (await service.inspect(headers, { tenantId: a.tenant })).selected
        ?.projects[0].status,
    ).toBe("archived");
    await expect(
      service.mutate(headers, {
        action: "archiveMapping",
        tenantId: a.tenant,
        projectId: a.project,
        expectedRevision: 2,
        confirmed: true,
      }),
    ).rejects.toThrow("changed");
  },
);
dbtest(
  "safe pagination bounds every collection and does not expose auth credentials",
  async () => {
    const a = await fixture();
    for (let n = 0; n < 28; n++)
      await pool.query(
        "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'disabled')",
        [a.tenant, `page-${n}-${a.project}`],
      );
    const first = await service.inspect(headers, { tenantId: a.tenant });
    expect(first.organizations.length).toBeLessThanOrEqual(25);
    expect(first.selected?.projects).toHaveLength(25);
    expect(first.selected?.more).toBe(true);
    const second = await service.inspect(headers, {
      tenantId: a.tenant,
      page: 1,
    });
    expect(second.selected?.projects).toHaveLength(4);
  },
);
dbtest(
  "0015 prepared-query additive upgrade preserves authoritative rows and safe defaults",
  async () => {
    const client = await pool.connect(),
      schema = `access_upgrade_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA ${schema}`);
      await client.query(`SET LOCAL search_path TO ${schema}`);
      for (const file of (await readdir("migrations"))
        .filter((f) => f.endsWith(".sql") && f < "0015")
        .sort())
        for (const text of parseMigration(
          file,
          await readFile(`migrations/${file}`, "utf8"),
        ).statements)
          await client.query({ text, name: `cc010-${crypto.randomUUID()}` });
      await client.query(
        "INSERT INTO customer_tenants(id,name,status) VALUES ('fictional-preserved','Fictional preserved','suspended')",
      );
      for (const text of parseMigration(
        "0015_client-access-admin.sql",
        await readFile("migrations/0015_client-access-admin.sql", "utf8"),
      ).statements)
        await client.query({ text, name: `cc010-${crypto.randomUUID()}` });
      expect(
        (
          await client.query(
            "SELECT name,status,admin_revision FROM customer_tenants WHERE id='fictional-preserved'",
          )
        ).rows[0],
      ).toEqual({
        name: "Fictional preserved",
        status: "suspended",
        admin_revision: 1,
      });
      expect(
        (await client.query("SELECT id FROM client_invitation_preparations"))
          .rows,
      ).toHaveLength(0);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  },
  20000,
);

dbtest('mapping create validates persisted project, global uniqueness and disabled state without grants', async () => {
  const a=await fixture(),b=await fixture(),project=`map-${crypto.randomUUID()}`;
  const previous=(await pool.query("SELECT data FROM workspaces WHERE id='primary'")).rows[0];
  try {
    await pool.query("INSERT INTO workspaces(id,data) VALUES ('primary',$1) ON CONFLICT(id) DO UPDATE SET data=excluded.data",[{projects:[{id:project,name:'Fictional mapped project',status:'Active',kind:'Software',eyebrow:'Internal',stack:[],note:'',updatedAt:'2026-10-01T00:00:00Z',updatedLabel:'Fictional',progress:0,accent:'cyan'}],tasks:[],activity:[],notes:[]}]);
    const input={action:'createMapping',tenantId:a.tenant,projectId:project};
    await service.mutate(headers,input);
    await expect(service.mutate(headers,input)).rejects.toThrow('changed');
    await expect(service.mutate(headers,{...input,tenantId:b.tenant})).rejects.toThrow('changed');
    await expect(service.mutate(headers,{...input,projectId:'missing-source-project'})).rejects.toThrow('unavailable');
    expect((await pool.query('SELECT status,admin_revision FROM customer_tenant_projects WHERE project_id=$1',[project])).rows[0]).toEqual({status:'disabled',admin_revision:1});
    expect((await pool.query('SELECT identity_id FROM customer_project_grants WHERE project_id=$1',[project])).rows).toHaveLength(0);
    expect((await pool.query('SELECT id FROM customer_invitations WHERE tenant_id=$1',[a.tenant])).rows).toHaveLength(0);
    const v=(await service.inspect(headers,{tenantId:a.tenant})).selected!;
    expect(v.projects.find(p=>p.id===project)?.blockers).toContain('Mapping inactive');
    expect(v.projects.find(p=>p.id===project)?.blockers).toContain('No active identity, membership and view grant configuration');
  } finally {
    if(previous) await pool.query("UPDATE workspaces SET data=$1 WHERE id='primary'",[previous.data]);
    else await pool.query("DELETE FROM workspaces WHERE id='primary'");
  }
});
