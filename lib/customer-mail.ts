import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
import { customerCommunicationsCapabilities } from "@/lib/customer-communications-policy";

export const mailAddress = z
  .string()
  .max(254)
  .regex(/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/)
  .pipe(z.email());
export const mailType = z.enum([
  "invitation",
  "email_proof",
  "account_recovery",
  "security_notification",
]);
export type MailType = z.infer<typeof mailType>;
export const mailSecret = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const mailDigest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export type RenderedMail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};
const copy: Record<MailType, [string, string, string]> = {
  invitation: [
    "Your customer invitation",
    "Review your customer invitation",
    "/customer/accept",
  ],
  email_proof: [
    "Verify your email ownership",
    "Verify your email independently of your invitation",
    "/customer/verify",
  ],
  account_recovery: [
    "Recover your customer account",
    "Recover your existing customer credential",
    "/customer/recovery",
  ],
  security_notification: [
    "Customer account security notice",
    "Your customer credential was recovered. Contact support if this was unexpected.",
    "",
  ],
};
const escapeHTML = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function renderCustomerMail(input: {
  type: MailType;
  from: string;
  to: string;
  origin: string;
  secret?: string;
  challengeId?: string;
}): RenderedMail {
  const type = mailType.parse(input.type),
    from = mailAddress.parse(input.from),
    to = mailAddress.parse(input.to);
  const origin = new URL(input.origin);
  if (
    origin.origin !== input.origin ||
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password
  )
    throw new Error("Invalid mail origin");
  const [subject, message, path] = copy[type];
  let link = "";
  if (type !== "security_notification") {
    const secret = mailSecret.parse(input.secret);
    const params = new URLSearchParams(
      type === "invitation"
        ? { token: secret }
        : { proof: secret, challengeId: z.uuid().parse(input.challengeId) },
    );
    // Fragments avoid HTTP access logs and referrers. Future routes must explicitly consume them.
    link = `${input.origin}${path}#${params}`;
  }
  const text = `${message}.${link ? `\n\n${link}\n\nThis one-time action expires shortly. Do not forward this email.` : ""}`;
  return {
    from,
    to,
    subject,
    text,
    html: `<!doctype html><html lang="en"><head><title>${escapeHTML(subject)}</title></head><body><h1>${escapeHTML(subject)}</h1><p>${escapeHTML(message)}.</p>${link ? `<p><a href="${escapeHTML(link)}">Continue securely</a></p><p>This one-time action expires shortly. Do not forward this email.</p>` : ""}</body></html>`,
  };
}
export type SealedMailSecret = {
  keyId: string;
  nonce: string;
  ciphertext: string;
  tag: string;
};
export function createMailKeyring(
  active: string,
  keys: ReadonlyMap<string, Buffer>,
) {
  if (!/^[a-z0-9-]{1,40}$/.test(active) || keys.get(active)?.length !== 32)
    throw new Error("Invalid mail keyring");
  return {
    seal(jobId: string, secret: string): SealedMailSecret {
      const nonce = randomBytes(12),
        cipher = createCipheriv("aes-256-gcm", keys.get(active)!, nonce);
      cipher.setAAD(Buffer.from(`${jobId}:${active}`));
      const ciphertext = Buffer.concat([
        cipher.update(mailSecret.parse(secret), "utf8"),
        cipher.final(),
      ]);
      return {
        keyId: active,
        nonce: nonce.toString("base64"),
        ciphertext: ciphertext.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
      };
    },
    open(jobId: string, sealed: SealedMailSecret) {
      const key = keys.get(sealed.keyId);
      if (key?.length !== 32) throw new Error("Mail custody unavailable");
      const cipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(sealed.nonce, "base64"),
      );
      cipher.setAAD(Buffer.from(`${jobId}:${sealed.keyId}`));
      cipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
      return mailSecret.parse(
        Buffer.concat([
          cipher.update(Buffer.from(sealed.ciphertext, "base64")),
          cipher.final(),
        ]).toString("utf8"),
      );
    },
  };
}
export type MailKeyring = ReturnType<typeof createMailKeyring>;
export type MailResult =
  | { status: "accepted"; providerId: string }
  | {
      status: "transient" | "permanent" | "disabled";
      code:
        | "timeout"
        | "network"
        | "rate_limit"
        | "rejected"
        | "configuration"
        | "disabled";
    };
export interface CustomerMailAdapter {
  readonly kind: "fake" | "resend";
  send(
    message: RenderedMail,
    idempotencyKey: string,
    signal: AbortSignal,
  ): Promise<MailResult>;
}
export function createFakeMailAdapter(results: MailResult[] = []) {
  const accepted = new Map<string, MailResult>();
  const messages: { message: RenderedMail; key: string }[] = [];
  return {
    kind: "fake" as const,
    messages,
    async send(
      message: RenderedMail,
      key: string,
      signal: AbortSignal,
    ): Promise<MailResult> {
      if (signal.aborted) return { status: "transient", code: "timeout" };
      if (accepted.has(key)) return accepted.get(key)!;
      const result = results.shift() ?? {
        status: "accepted" as const,
        providerId: mailDigest(key).slice(0, 32),
      };
      if (result.status === "accepted") {
        accepted.set(key, result);
        messages.push({ message, key });
      }
      return result;
    },
  } satisfies CustomerMailAdapter & { messages: typeof messages };
}
// CC-012 never authorizes a live call. The injected transport makes classification testable.
export function classifyResendFailure(status: number): MailResult {
  if (status === 429) return { status: "transient", code: "rate_limit" };
  if (status >= 500 || status === 408)
    return { status: "transient", code: "network" };
  return {
    status: "permanent",
    code: status === 401 || status === 403 ? "configuration" : "rejected",
  };
}
export function createResendMailAdapter(
  configuration?: { apiKey: string },
  transport: typeof fetch = fetch,
): CustomerMailAdapter {
  return {
    kind: "resend",
    async send(message, key, signal) {
      if (!customerCommunicationsCapabilities.productionDelivery)
        return { status: "disabled", code: "disabled" };
      // Retained implementation for future separately reviewed activation, never reached in CC-012.
      if (!configuration?.apiKey)
        return { status: "permanent", code: "configuration" };
      try {
        mailAddress.parse(message.from);
        mailAddress.parse(message.to);
        const response = await transport("https://api.resend.com/emails", {
          method: "POST",
          signal,
          redirect: "error",
          headers: {
            authorization: `Bearer ${configuration.apiKey}`,
            "content-type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify(message),
        });
        if (!response.ok) return classifyResendFailure(response.status);
        const body = z.object({ id: z.uuid() }).parse(await response.json());
        return { status: "accepted", providerId: body.id };
      } catch {
        return {
          status: "transient",
          code: signal.aborted ? "timeout" : "network",
        };
      }
    },
  };
}
export function retryDelay(
  attempt: number,
  random: () => number = Math.random,
) {
  return (
    Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6)) +
    Math.floor(Math.max(0, Math.min(1, random())) * 1000)
  );
}
