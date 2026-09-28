import { Resend } from "resend";
import { brand } from "@/lib/brand";
import { withOperationTimeout, outboundRequestTimeoutMs } from "@/lib/operational-observability";

export async function sendPasswordResetEmail(email: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Password recovery email is not configured");
  const { error } = await withOperationTimeout(new Resend(apiKey).emails.send({
    from: process.env.CONTACT_FROM_EMAIL ?? `${brand.emailFromName} <onboarding@resend.dev>`,
    to: email,
    subject: "Reset your Yorkstead password",
    text: `Use this link to choose a new password for your Yorkstead account:\n\n${url}\n\nThis link expires in 15 minutes and can be used once. If you did not request it, you can ignore this email.`,
  }), outboundRequestTimeoutMs);
  if (error) throw new Error("Password recovery email could not be sent");
}
