import { afterAll, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { createCustomerAuthOptions } from "@/lib/customer-auth";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { createClientOnboardingService } from "@/lib/client-onboarding";
import {
  createCustomerEnrollmentService,
  unavailableEnrollmentDelivery,
} from "@/lib/customer-enrollment";
import { createCustomerAccountRecovery } from "@/lib/customer-account-recovery";
import {
  createCustomerMailQueue,
  mailTransaction,
} from "@/lib/customer-mail-queue";
import {
  createFakeMailAdapter,
  createMailKeyring,
  mailDigest,
  type MailResult,
  type CustomerMailAdapter,
} from "@/lib/customer-mail";
import { createCustomerCommunicationsService } from "@/lib/customer-communications";
import {
  createCustomerMailEventProcessor,
  verifyCustomerMailWebhook,
} from "@/lib/customer-mail-webhook";
import { disposableMailEnv, signedMailEvent } from "./fixtures/customer-mail";
const dbtest = process.env.TEST_DATABASE_URL ? test : test.skip;
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL }),
  authPool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    options: "-c search_path=customer_auth",
  });
const auth = betterAuth(
  createCustomerAuthOptions(
    {
      baseURL: "http://localhost:3100",
      databaseURL:
        process.env.TEST_DATABASE_URL ?? "postgresql://localhost/disposable",
      secret: "fictional-mail-recovery-secret-89432759874",
    },
    authPool,
  ),
);
const hash = async (p: string) => (await auth.$context).password.hash(p),
  owner = async () => ({ user: { id: "fictional-mail-owner" } }),
  headers = new Headers();
afterAll(async () => {
  await Promise.all([pool.end(), authPool.end()]);
});
function infrastructure(
  results: MailResult[] = [],
  adapter?: CustomerMailAdapter,
  timeoutMs = 5000,
) {
  const fake = createFakeMailAdapter(results),
    keyring = createMailKeyring(
      "test-v1",
      new Map([["test-v1", randomBytes(32)]]),
    );
  const queue = createCustomerMailQueue(pool, {
    keyring,
    adapter: adapter ?? fake,
    sender: "sender@example.test",
    origin: "https://portal.example.test",
    environment: disposableMailEnv,
    timeoutMs,
  });
  const onboarding = createClientOnboardingService(
    pool,
    owner,
    async () => null,
    queue.issued,
  );
  const enrollment = createCustomerEnrollmentService(
    pool,
    unavailableEnrollmentDelivery,
    hash,
    queue.proof,
  );
  return {
    queue,
    fake,
    keyring,
    onboarding,
    enrollment,
    recovery: createCustomerAccountRecovery(
      pool,
      queue,
      hash,
      disposableMailEnv,
    ),
  };
}
async function fixture(password = true) {
  // Isolate global worker claims across sequential cases, preserving history.
  await pool.query(
    "UPDATE customer_mail_jobs SET state='canceled',failure='ineligible',lease_token=NULL,lease_until=NULL WHERE state IN ('queued','leased')",
  );
  const suffix = crypto.randomUUID(),
    tenant = `mail-tenant-${suffix}`,
    project = `mail-project-${suffix}`,
    identity = `mail-identity-${suffix}`,
    subject = `mail-subject-${suffix}`,
    email = `${suffix}@example.test`;
  await pool.query(
    "INSERT INTO customer_tenants(id,name,status) VALUES ($1,'Fictional mail tenant','active')",
    [tenant],
  );
  await pool.query(
    "INSERT INTO customer_tenant_projects(tenant_id,project_id,status) VALUES ($1,$2,'active')",
    [tenant, project],
  );
  await pool.query(
    'INSERT INTO customer_auth."user"(id,name,email,"emailVerified") VALUES ($1,\'Fictional mail user\',$2,true)',
    [subject, email],
  );
  if (password)
    await pool.query(
      `INSERT INTO customer_auth."account"(id,"userId","accountId","providerId",password) VALUES ($1,$1,$1,'credential',$2)`,
      [subject, await hash("fictional-original-password-384758")],
    );
  await pool.query(
    "INSERT INTO customer_identities(id,auth_provider,auth_subject,email,status) VALUES ($1,$2,$3,$4,'active')",
    [identity, customerAuthBoundary.identityProvider, subject, email],
  );
  await pool.query(
    "INSERT INTO customer_tenant_memberships(tenant_id,identity_id,role,status) VALUES ($1,$2,'member','active')",
    [tenant, identity],
  );
  return { tenant, project, identity, subject, email };
}
async function issue(
  i: ReturnType<typeof infrastructure>,
  f: Awaited<ReturnType<typeof fixture>>,
) {
  return i.onboarding.issue(headers, {
    tenantId: f.tenant,
    recipientEmail: f.email,
    projectIds: [f.project],
  });
}
async function jobFor(invitationId: string) {
  return (
    await pool.query(
      "SELECT * FROM customer_mail_jobs WHERE invitation_id=$1 AND type='invitation'",
      [invitationId],
    )
  ).rows[0];
}
async function due(id: string) {
  await pool.query(
    "UPDATE customer_mail_jobs SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE id=$1",
    [id],
  );
}
dbtest(
  "atomic issuance/enqueue, immutable intent, safe ciphertext and metadata-only owner projection",
  async () => {
    const f = await fixture(),
      i = infrastructure(),
      issued = await issue(i, f),
      job = await jobFor(issued.invitation.id);
    const custody = (
      await pool.query("SELECT * FROM customer_mail_custody WHERE job_id=$1", [
        job.id,
      ])
    ).rows[0];
    expect(JSON.stringify([job, custody])).not.toContain(issued.token);
    expect(custody.ciphertext).toHaveLength(60);
    await expect(
      pool.query(
        "UPDATE customer_mail_jobs SET recipient='attacker@example.test' WHERE id=$1",
        [job.id],
      ),
    ).rejects.toThrow("immutable");
    const id = await mailTransaction(pool, (c) =>
      i.queue.enqueue(c, {
        type: "invitation",
        tenantId: f.tenant,
        invitationId: issued.invitation.id,
        recipient: f.email,
        secret: issued.token,
        expiresAt: issued.invitation.expires_at,
      }),
    );
    expect(id).toBe(job.id);
    expect(
      (
        await pool.query(
          "SELECT id FROM customer_mail_jobs WHERE invitation_id=$1",
          [issued.invitation.id],
        )
      ).rows,
    ).toHaveLength(1);
    const service = createCustomerCommunicationsService(pool, owner),
      view = await service.inspect(headers);
    expect(view.productionDelivery).toBe(false);
    expect(JSON.stringify(view)).not.toContain(issued.token);
    expect(JSON.stringify(view)).not.toContain(f.email);
    expect(JSON.stringify(view)).not.toContain("ciphertext");
    await expect(
      createCustomerCommunicationsService(pool, async () => null).inspect(
        headers,
      ),
    ).rejects.toThrow("unavailable");
  },
);
dbtest(
  "enqueue failure rolls back authoritative issuance and independent proof, not leaving actionable intent",
  async () => {
    const f = await fixture(),
      i = infrastructure();
    const broken = createClientOnboardingService(
      pool,
      owner,
      async () => null,
      async () => {
        throw new Error("fictional custody failure");
      },
    );
    await expect(
      broken.issue(headers, {
        tenantId: f.tenant,
        recipientEmail: f.email,
        projectIds: [f.project],
      }),
    ).rejects.toThrow("custody");
    expect(
      (
        await pool.query(
          "SELECT id FROM customer_invitations WHERE tenant_id=$1",
          [f.tenant],
        )
      ).rows,
    ).toHaveLength(0);
    const issued = await issue(i, f);
    const badProof = createCustomerEnrollmentService(
      pool,
      unavailableEnrollmentDelivery,
      hash,
      async () => {
        throw new Error("fictional custody failure");
      },
    );
    await expect(badProof.begin(issued.token)).rejects.toThrow("custody");
    expect(
      (
        await pool.query(
          "SELECT id FROM customer_enrollment_challenges WHERE invitation_id=$1",
          [issued.invitation.id],
        )
      ).rows,
    ).toHaveLength(0);
  },
);
dbtest(
  "concurrent claims and stale fencing cannot transmit the same job twice",
  async () => {
    const f = await fixture(),
      i = infrastructure(),
      issued = await issue(i, f);
    const claims = await Promise.all([i.queue.claim(), i.queue.claim()]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first = claims.find(Boolean)!;
    await pool.query(
      "UPDATE customer_mail_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",
      [first.id],
    );
    const second = await i.queue.claim();
    expect(second?.id).toBe(first.id);
    expect(second?.lease_token).not.toBe(first.lease_token);
    await i.queue.dispatch(first.id, first.lease_token);
    expect(i.fake.messages).toHaveLength(0);
    await Promise.all([
      i.queue.dispatch(second!.id, second!.lease_token),
      i.queue.dispatch(second!.id, second!.lease_token),
    ]);
    expect(i.fake.messages).toHaveLength(1);
    const j = await jobFor(issued.invitation.id);
    expect(j.state).toBe("accepted");
    expect(j.delivery).toBe("accepted");
    expect(
      (
        await pool.query(
          "SELECT * FROM customer_mail_custody WHERE job_id=$1",
          [j.id],
        )
      ).rows,
    ).toHaveLength(0);
  },
);
dbtest(
  "revocation, supersession and identity suspension suppress pending dispatch",
  async () => {
    for (const reason of ["revoked", "superseded", "suspended"]) {
      const f = await fixture(),
        i = infrastructure(),
        issued = await issue(i, f),
        job = await jobFor(issued.invitation.id);
      if (reason === "revoked")
        await i.onboarding.revoke(headers, issued.invitation.id);
      if (reason === "superseded") await issue(i, f);
      if (reason === "suspended")
        await pool.query(
          "UPDATE customer_identities SET status='disabled' WHERE id=$1",
          [f.identity],
        );
      await i.queue.runOne();
      expect(i.fake.messages).toHaveLength(0);
      expect(
        (
          await pool.query("SELECT state FROM customer_mail_jobs WHERE id=$1", [
            job.id,
          ])
        ).rows[0].state,
      ).toBe("canceled");
    }
  },
);
dbtest(
  "bounded retries exhaust, permanent errors stop immediately and timeout aborts",
  async () => {
    const f = await fixture(),
      i = infrastructure(
        Array.from({ length: 5 }, () => ({
          status: "transient",
          code: "network",
        })),
      ),
      issued = await issue(i, f),
      job = await jobFor(issued.invitation.id);
    for (let n = 0; n < 5; n++) {
      await due(job.id);
      await i.queue.runOne();
    }
    const exhausted = await jobFor(issued.invitation.id);
    expect(exhausted.state).toBe("failed");
    expect(exhausted.failure).toBe("exhausted");
    expect(exhausted.attempts).toBe(5);
    const g = await fixture(),
      permanent = infrastructure([
        { status: "permanent", code: "configuration" },
      ]),
      p = await issue(permanent, g);
    await permanent.queue.runOne();
    expect((await jobFor(p.invitation.id)).state).toBe("failed");
    const h = await fixture();
    let aborted = false;
    const slow = infrastructure(
      [],
      {
        kind: "fake",
        send: async (_m, _k, signal) =>
          new Promise((resolve) => {
            signal.addEventListener("abort", () => {
              aborted = true;
              resolve({ status: "transient", code: "timeout" });
            });
          }),
      },
      10,
    );
    const s = await issue(slow, h);
    await slow.queue.runOne();
    expect(aborted).toBe(true);
    expect((await jobFor(s.invitation.id)).failure).toBe("timeout");
  },
);
dbtest(
  "missing, tampered or retired custody fails closed without delivery",
  async () => {
    for (const reason of ["missing", "tampered", "retired"]) {
      const f = await fixture(),
        i = infrastructure(),
        issued = await issue(i, f),
        job = await jobFor(issued.invitation.id);
      if (reason === "missing")
        await pool.query("DELETE FROM customer_mail_custody WHERE job_id=$1", [
          job.id,
        ]);
      if (reason === "tampered")
        await pool.query(
          "UPDATE customer_mail_custody SET tag=$2 WHERE job_id=$1",
          [job.id, randomBytes(16).toString("base64")],
        );
      const worker = reason === "retired" ? infrastructure() : i;
      await worker.queue.runOne();
      expect(worker.fake.messages).toHaveLength(0);
      expect((await jobFor(issued.invitation.id)).failure).toBe("custody");
    }
  },
);
dbtest(
  "independent email proof dispatches separately and cannot bypass completion verifier",
  async () => {
    const f = await fixture(),
      i = infrastructure(),
      issued = await issue(i, f),
      challenge = await i.enrollment.begin(issued.token);
    await i.queue.runOne();
    await i.queue.runOne();
    expect(i.fake.messages).toHaveLength(2);
    const proofMessage = i.fake.messages.find((m) =>
      m.message.subject.includes("ownership"),
    )!;
    expect(proofMessage.message.text).not.toContain(issued.token);
    const proof = new URLSearchParams(
      proofMessage.message.text.split("#")[1].split("\n")[0],
    ).get("proof")!;
    await expect(
      i.enrollment.complete({
        token: issued.token,
        challengeId: challenge.challengeId,
        proof: randomBytes(32).toString("base64url"),
        password: "fictional-new-password-394857",
      }),
    ).rejects.toThrow("denied");
    await i.enrollment.complete({
      token: issued.token,
      challengeId: challenge.challengeId,
      proof,
      password: "fictional-new-password-394857",
    });
    await expect(
      i.enrollment.complete({
        token: issued.token,
        challengeId: challenge.challengeId,
        proof,
        password: "fictional-new-password-394857",
      }),
    ).rejects.toThrow("denied");
  },
);
async function recoveryFixture() {
  const f = await fixture(),
    i = infrastructure();
  const response = await i.recovery.begin(
    { tenantId: f.tenant, email: f.email },
    `fictional-source-${crypto.randomUUID()}`,
  );
  await i.queue.runOne();
  const m = i.fake.messages[0].message,
    params = new URLSearchParams(m.text.split("#")[1].split("\n")[0]);
  return {
    f,
    i,
    response,
    input: {
      tenantId: f.tenant,
      challengeId: params.get("challengeId")!,
      proof: params.get("proof")!,
      password: "fictional-recovered-password-923847",
    },
  };
}
dbtest(
  "recovery uses existing Better Auth credentials, revokes sessions, cannot replay or create grants",
  async () => {
    const { f, i, input } = await recoveryFixture();
    const signed = await auth.api.signInEmail({
      body: { email: f.email, password: "fictional-original-password-384758" },
      asResponse: true,
    });
    expect(signed.status).toBe(200);
    expect(
      (
        await pool.query(
          'SELECT id FROM customer_auth."session" WHERE "userId"=$1',
          [f.subject],
        )
      ).rows.length,
    ).toBeGreaterThan(0);
    const before = (
      await pool.query(
        "SELECT * FROM customer_project_grants WHERE identity_id=$1",
        [f.identity],
      )
    ).rows;
    const done = await Promise.allSettled([
      i.recovery.complete(input, `fictional-source-${input.challengeId}`),
      i.recovery.complete(input, `fictional-source-${input.challengeId}`),
    ]);
    expect(done.filter((d) => d.status === "fulfilled")).toHaveLength(1);
    await expect(
      i.recovery.complete(input, `fictional-source-${input.challengeId}`),
    ).rejects.toThrow("unavailable");
    expect(
      (
        await pool.query(
          'SELECT id FROM customer_auth."session" WHERE "userId"=$1',
          [f.subject],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await pool.query(
          "SELECT * FROM customer_project_grants WHERE identity_id=$1",
          [f.identity],
        )
      ).rows,
    ).toEqual(before);
    const login = await auth.api.signInEmail({
      body: { email: f.email, password: input.password },
      asResponse: true,
    });
    expect(login.status).toBe(200);
    expect(
      (
        await pool.query(
          "SELECT status FROM customer_tenant_memberships WHERE identity_id=$1",
          [f.identity],
        )
      ).rows[0].status,
    ).toBe("active");
  },
);
dbtest(
  "recovery denies wrong tenant, revoked/expired challenge and suspended account",
  async () => {
    for (const reason of ["tenant", "revoked", "expired", "suspended"]) {
      const { f, i, input } = await recoveryFixture();
      if (reason === "tenant") input.tenantId = "fictional-unknown-tenant";
      if (reason === "revoked") await i.recovery.revoke(input.challengeId);
      if (reason === "expired")
        await pool.query(
          "UPDATE customer_recovery_challenges SET created_at=clock_timestamp()-interval '20 minutes',expires_at=clock_timestamp()-interval '15 minutes' WHERE id=$1",
          [input.challengeId],
        );
      if (reason === "suspended")
        await pool.query(
          "UPDATE customer_identities SET status='disabled' WHERE id=$1",
          [f.identity],
        );
      await expect(
        i.recovery.complete(input, `fictional-source-${input.challengeId}`),
      ).rejects.toThrow("unavailable");
    }
  },
);
dbtest(
  "unknown and passwordless identities get generic responses; normalized account and source budgets persist",
  async () => {
    const f = await fixture(false),
      i = infrastructure(),
      a = await i.recovery.begin(
        { tenantId: f.tenant, email: f.email },
        "fictional-budget",
      );
    const b = await i.recovery.begin(
      { tenantId: f.tenant, email: "unknown@example.test" },
      "fictional-budget",
    );
    expect(a).toEqual(b);
    expect(i.fake.messages).toHaveLength(0);
    const g = await fixture(),
      account = { tenantId: g.tenant, email: g.email.toUpperCase() };
    const throttleSource = `fictional-throttle-${crypto.randomUUID()}`;
    for (let n = 0; n < 7; n++)
      expect(await i.recovery.begin(account, throttleSource)).toEqual(a);
    expect(
      (
        await pool.query(
          "SELECT id FROM customer_recovery_challenges WHERE identity_id=$1",
          [g.identity],
        )
      ).rows,
    ).toHaveLength(5);
    expect(
      (
        await pool.query(
          "SELECT attempts FROM customer_enrollment_limits WHERE bucket=$1",
          [mailDigest(`recovery-account:${g.email}`)],
        )
      ).rows[0].attempts,
    ).toBe(7);
  },
);
dbtest(
  "signed webhook events deduplicate, tolerate out-of-order and suppress further dispatch",
  async () => {
    const f = await fixture(),
      i = infrastructure(),
      issued = await issue(i, f);
    await i.queue.runOne();
    const j = await jobFor(issued.invitation.id);
    const processor = createCustomerMailEventProcessor(
      pool,
      disposableMailEnv,
      "fake",
    );
    for (const type of [
      "email.delivered",
      "email.sent",
      "email.bounced",
      "email.complained",
      "email.delivered",
    ]) {
      const signed = signedMailEvent(type, j.provider_id),
        e = verifyCustomerMailWebhook(signed.payload, signed.headers, [
          signed.secret,
        ])!;
      await processor(e);
      expect(await processor(e)).toEqual({ duplicate: true });
    }
    expect((await jobFor(issued.invitation.id)).delivery).toBe("complained");
    expect(
      (
        await pool.query(
          "SELECT reason FROM customer_mail_suppressions WHERE recipient_digest=$1",
          [mailDigest(f.email)],
        )
      ).rows[0].reason,
    ).toBe("complained");
    await expect(issue(i, f)).rejects.toThrow("unavailable");
    const stored = JSON.stringify(
      (
        await pool.query("SELECT * FROM customer_mail_events WHERE job_id=$1", [
          j.id,
        ])
      ).rows,
    );
    expect(stored).not.toContain(f.email);
    expect(stored).not.toContain("must not persist");
    expect(stored).not.toContain(issued.token);
    await expect(
      processor({
        id: "unknown",
        providerId: "unknown",
        event: "delivered",
        at: new Date().toISOString(),
      }),
    ).rejects.toThrow("unavailable");
  },
);
dbtest(
  "uncertain acceptance retries reuse the provider key without duplicating accepted mail",
  async () => {
    const f = await fixture(),
      remote = createFakeMailAdapter();
    let first = true;
    const i = infrastructure([], {
      kind: "fake",
      async send(m, k, s) {
        const result = await remote.send(m, k, s);
        if (first) {
          first = false;
          throw new Error("response lost after acceptance");
        }
        return result;
      },
    });
    const issued = await issue(i, f),
      job = await jobFor(issued.invitation.id);
    await i.queue.runOne();
    expect((await jobFor(issued.invitation.id)).state).toBe("queued");
    await due(job.id);
    await i.queue.runOne();
    expect((await jobFor(issued.invitation.id)).state).toBe("accepted");
    expect(remote.messages).toHaveLength(1);
  },
);
dbtest(
  "expired invitation and expired encrypted custody cancel without transmission",
  async () => {
    const f = await fixture(),
      i = infrastructure(),
      token = randomBytes(32).toString("base64url");
    const id = await mailTransaction(pool, async (c) => {
      await c.query(
        "SELECT set_config('yorkstead.provisioning_actor','fictional-mail-owner',true),set_config('yorkstead.provisioning_role','owner_internal',true)",
      );
      const invite = (
        await c.query(
          `INSERT INTO customer_invitations(tenant_id,recipient_email,token_verifier,issued_by,expires_at) VALUES ($1,$2,$3,'fictional-mail-owner',clock_timestamp()+interval '0.2 second') RETURNING id,expires_at`,
          [f.tenant, f.email, mailDigest(token)],
        )
      ).rows[0];
      await c.query(
        "INSERT INTO customer_invitation_projects(invitation_id,tenant_id,project_id) VALUES ($1,$2,$3)",
        [invite.id, f.tenant, f.project],
      );
      return i.queue.enqueue(c, {
        type: "invitation",
        tenantId: f.tenant,
        invitationId: invite.id,
        recipient: f.email,
        secret: token,
        expiresAt: invite.expires_at,
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    await i.queue.runOne();
    expect(
      (
        await pool.query("SELECT state FROM customer_mail_jobs WHERE id=$1", [
          id,
        ])
      ).rows[0].state,
    ).toBe("canceled");
    expect(i.fake.messages).toHaveLength(0);
    const g = await fixture(),
      issued = await issue(i, g),
      job = await jobFor(issued.invitation.id);
    await pool.query(
      "UPDATE customer_mail_custody SET created_at=clock_timestamp()-interval '20 minutes',expires_at=clock_timestamp()-interval '15 minutes' WHERE job_id=$1",
      [job.id],
    );
    await i.queue.runOne();
    expect((await jobFor(issued.invitation.id)).failure).toBe("custody");
    expect(i.fake.messages).toHaveLength(0);
  },
);
dbtest(
  "cross-tenant enqueues and revoked independent proof are rejected",
  async () => {
    const f = await fixture(),
      g = await fixture(),
      i = infrastructure(),
      issued = await issue(i, f);
    for (const [tenantId, recipient, secret] of [
      [g.tenant, f.email, issued.token],
      [f.tenant, g.email, issued.token],
    ]) {
      await expect(
        mailTransaction(pool, (c) =>
          i.queue.enqueue(c, {
            type: "invitation",
            tenantId,
            invitationId: issued.invitation.id,
            recipient,
            secret,
            expiresAt: issued.invitation.expires_at,
          }),
        ),
      ).rejects.toThrow("unavailable");
    }
    // A different proof action with a mismatched verifier cannot become a dispatchable intent.
    const challenge = await i.enrollment.begin(issued.token);
    await i.onboarding.revoke(headers, issued.invitation.id);
    await i.queue.runOne();
    await i.queue.runOne();
    expect(i.fake.messages).toHaveLength(0);
    expect(
      (
        await pool.query(
          "SELECT state FROM customer_mail_jobs WHERE proof_id=$1",
          [challenge.challengeId],
        )
      ).rows[0].state,
    ).toBe("canceled");
  },
);

dbtest(
  "network recovery budget is shared across accounts and counts account-limited attempts",
  async () => {
    const f = await fixture(),
      i = infrastructure(),
      source = `fictional-network-${crypto.randomUUID()}`;
    const unknown = {
      tenantId: f.tenant,
      email: `missing-${crypto.randomUUID()}@example.test`,
    };
    const response = await i.recovery.begin(unknown, source);
    for (let n = 1; n < 20; n++)
      expect(await i.recovery.begin(unknown, source)).toEqual(response);
    expect(
      await i.recovery.begin({ tenantId: f.tenant, email: f.email }, source),
    ).toEqual(response);
    expect(
      (
        await pool.query(
          "SELECT id FROM customer_recovery_challenges WHERE identity_id=$1",
          [f.identity],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await pool.query(
          "SELECT attempts FROM customer_enrollment_limits WHERE bucket=$1",
          [mailDigest(`recovery-network:${source}`)],
        )
      ).rows[0].attempts,
    ).toBe(21);
  },
);

dbtest(
  "credential removal and challenge revocation suppress pending recovery delivery",
  async () => {
    for (const reason of ["credential", "revoked"]) {
      const f = await fixture(),
        i = infrastructure();
      await i.recovery.begin(
        { tenantId: f.tenant, email: f.email },
        `fictional-source-${crypto.randomUUID()}`,
      );
      const challenge = (
        await pool.query(
          "SELECT id FROM customer_recovery_challenges WHERE identity_id=$1",
          [f.identity],
        )
      ).rows[0];
      if (reason === "credential")
        await pool.query(
          'DELETE FROM customer_auth."account" WHERE "userId"=$1',
          [f.subject],
        );
      else await i.recovery.revoke(challenge.id);
      await i.queue.runOne();
      expect(i.fake.messages).toHaveLength(0);
      expect(
        (
          await pool.query(
            "SELECT state FROM customer_mail_jobs WHERE recovery_id=$1",
            [challenge.id],
          )
        ).rows[0].state,
      ).toBe("canceled");
    }
  },
);
