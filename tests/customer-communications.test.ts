import { expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import {
  createMailKeyring,
  createFakeMailAdapter,
  createResendMailAdapter,
  renderCustomerMail,
  retryDelay,
  mailAddress,
  classifyResendFailure,
} from "@/lib/customer-mail";
import {
  communicationsDisposableEnabled,
  customerCommunicationsCapabilities,
} from "@/lib/customer-communications-policy";
import {
  verifyCustomerMailWebhook,
  nextMailDelivery,
  createCustomerMailWebhookController,
} from "@/lib/customer-mail-webhook";
import { createCustomerCommunicationsController } from "@/lib/customer-communications";
import { POST } from "@/app/api/customer-communications/webhook/route";
import { createCustomerAccountRecovery } from "@/lib/customer-account-recovery";
const token = randomBytes(32).toString("base64url");
const message = {
  type: "invitation" as const,
  from: "sender@example.test",
  to: "person@example.test",
  origin: "https://portal.example.test",
  secret: token,
};
import { disposableMailEnv, signedMailEvent } from "./fixtures/customer-mail";
test("production gates ignore switches and malformed disposable routing", () => {
  expect(
    Object.values(customerCommunicationsCapabilities).every((v) => v === false),
  ).toBe(true);
  expect(communicationsDisposableEnabled(disposableMailEnv)).toBe(true);
  for (const env of [
    { ...disposableMailEnv, NODE_ENV: "production" as const },
    { ...disposableMailEnv, DATABASE_URL: "postgresql://localhost/real" },
    {
      ...disposableMailEnv,
      DATABASE_URL: "postgresql://localhost/test?host=remote",
      TEST_DATABASE_URL: "postgresql://localhost/test?host=remote",
    },
  ])
    expect(communicationsDisposableEnabled(env)).toBe(false);
});
test("fixed templates validate addresses/origin/tokens and use private escaped fragments", () => {
  const m = renderCustomerMail(message);
  expect(m.html).toContain('lang="en"');
  expect(m.text).toContain(`#token=${token}`);
  expect(m.html).not.toContain("<script");
  for (const to of [
    "a@example.test\r\nBcc:attacker@example.test",
    "<script>@example.test",
    "A@example.test",
  ])
    expect(() => renderCustomerMail({ ...message, to })).toThrow();
  for (const origin of [
    "javascript:alert(1)",
    "https://a.example.test/path",
    "https://a.example.test?x=1",
    "https://user:pass@example.test",
  ])
    expect(() => renderCustomerMail({ ...message, origin })).toThrow();
  expect(() => renderCustomerMail({ ...message, secret: "bad" })).toThrow();
  expect(() =>
    renderCustomerMail({ ...message, type: "email_proof" }),
  ).toThrow();
  expect(mailAddress.safeParse("fictional@example.test").success).toBe(true);
});
test("AES-GCM custody is bound to delivery ID and key version and rejects tampering/retired keys", () => {
  const keys = new Map([["v1", randomBytes(32)]]),
    ring = createMailKeyring("v1", keys),
    sealed = ring.seal("job-a", token);
  expect(JSON.stringify(sealed)).not.toContain(token);
  expect(ring.open("job-a", sealed)).toBe(token);
  expect(() => ring.open("job-b", sealed)).toThrow();
  expect(() =>
    ring.open("job-a", { ...sealed, tag: randomBytes(16).toString("base64") }),
  ).toThrow();
  expect(() =>
    createMailKeyring("v2", new Map([["v2", randomBytes(32)]])).open(
      "job-a",
      sealed,
    ),
  ).toThrow();
});
test("fake deduplicates acceptance and provider adapters never transmit", async () => {
  const fake = createFakeMailAdapter(),
    rendered = renderCustomerMail(message),
    signal = new AbortController().signal;
  expect((await fake.send(rendered, "same", signal)).status).toBe("accepted");
  await fake.send(rendered, "same", signal);
  expect(fake.messages).toHaveLength(1);
  let calls = 0;
  const adapter = createResendMailAdapter(
    { apiKey: "fictional" },
    (async () => {
      calls++;
      throw new Error();
    }) as unknown as typeof fetch,
  );
  expect(await adapter.send(rendered, "same", signal)).toEqual({
    status: "disabled",
    code: "disabled",
  });
  expect(calls).toBe(0);
  expect(classifyResendFailure(429)).toEqual({
    status: "transient",
    code: "rate_limit",
  });
  expect(classifyResendFailure(503).status).toBe("transient");
  expect(classifyResendFailure(401).status).toBe("permanent");
  expect(retryDelay(1, () => 0)).toBe(2000);
  expect(retryDelay(100, () => 1)).toBe(61000);
});
test("documented Resend SDK signatures verify raw body, rotation and timestamp bounds", () => {
  const s = signedMailEvent("email.delivered");
  expect(
    verifyCustomerMailWebhook(s.payload, s.headers, [s.secret])?.event,
  ).toBe("delivered");
  expect(
    verifyCustomerMailWebhook(s.payload, s.headers, [
      `whsec_${randomBytes(32).toString("base64")}`,
      s.secret,
    ])?.event,
  ).toBe("delivered");
  expect(() =>
    verifyCustomerMailWebhook(s.payload + " ", s.headers, [s.secret]),
  ).toThrow();
  const stale = signedMailEvent("email.delivered", "provider", -360000);
  expect(() =>
    verifyCustomerMailWebhook(stale.payload, stale.headers, [stale.secret]),
  ).toThrow();
  const future = signedMailEvent("email.delivered", "provider", 360000);
  expect(() =>
    verifyCustomerMailWebhook(future.payload, future.headers, [future.secret]),
  ).toThrow();
  const unknown = signedMailEvent("email.unknown");
  expect(
    verifyCustomerMailWebhook(unknown.payload, unknown.headers, [
      unknown.secret,
    ]),
  ).toBeNull();
});
test("delivery precedence preserves terminal bounces and complaints independently of acceptance", () => {
  expect(nextMailDelivery("delivered", "accepted")).toBe("delivered");
  expect(nextMailDelivery("bounced", "delivered")).toBe("bounced");
  expect(nextMailDelivery("complained", "bounced")).toBe("complained");
});
test("production webhook and recovery fail before dependency access", async () => {
  expect((await POST()).status).toBe(404);
  const controller = createCustomerMailWebhookController({
    secrets: [],
    process: async () => {
      throw new Error("must not reach");
    },
    environment: { ...disposableMailEnv, NODE_ENV: "production" as const },
  });
  expect(
    (await controller(new Request("https://example.test", { method: "POST" })))
      .status,
  ).toBe(404);
  const recovery = createCustomerAccountRecovery(
    {
      connect: async () => {
        throw new Error("must not reach");
      },
    },
    {
      enqueue: async () => {
        throw new Error();
      },
    },
    async () => "",
    { ...disposableMailEnv, NODE_ENV: "production" as const },
  );
  await expect(
    recovery.begin(
      { email: "fictional@example.test", tenantId: "fictional" },
      "fictional-source",
    ),
  ).rejects.toThrow("unavailable");
});
test("owner communications controller denies unauthenticated, cross-site and every mutation", async () => {
  let calls = 0;
  const service = {
    inspect: async () => {
      calls++;
      throw new Error("not reached");
    },
  };
  const denied = createCustomerCommunicationsController({
    verifyOwner: async () => null,
    service,
  });
  expect((await denied(new Request("https://example.test"))).status).toBe(401);
  const allowed = createCustomerCommunicationsController({
    verifyOwner: async () => ({ user: { id: "fictional-owner" } }),
    service,
  });
  for (const method of ["POST", "PUT", "PATCH", "DELETE"])
    expect(
      (await allowed(new Request("https://example.test", { method }))).status,
    ).toBe(405);
  expect(
    (
      await allowed(
        new Request("https://example.test", {
          headers: { "sec-fetch-site": "cross-site" },
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (await allowed(new Request("https://example.test?page=1&page=2"))).status,
  ).toBe(400);
  expect(calls).toBe(0);
});
