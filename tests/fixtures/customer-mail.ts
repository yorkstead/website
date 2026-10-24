import { createHmac } from "node:crypto";
export const disposableMailEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  CUSTOMER_COMMUNICATIONS_DISPOSABLE: "enabled",
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/project_command_center_test",
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/project_command_center_test",
};
export function signedMailEvent(
  event: string,
  providerId = "fictional-provider",
  offset = 0,
  secret = Buffer.from("fictional-customer-signing-key-32"),
) {
  const id = `msg_${crypto.randomUUID()}`,
    timestamp = String(Math.floor((Date.now() + offset) / 1000));
  const payload = JSON.stringify({
    type: event,
    created_at: new Date().toISOString(),
    data: {
      email_id: providerId,
      bounce: { type: "Permanent" },
      to: ["fictional@example.test"],
      subject: "must not persist",
    },
  });
  const signature = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return {
    payload,
    headers: new Headers({
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    }),
    secret: `whsec_${secret.toString("base64")}`,
  };
}
