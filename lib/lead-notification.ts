import { Resend } from "resend";
import { brand } from "@/lib/brand";
import { outboundRequestTimeoutMs, withOperationTimeout } from "@/lib/operational-observability";

type LeadNotification = {
  id: number;
  idempotencyKey?: string;
  name: string;
  email: string;
  company: string;
  projectType: string;
  budget: string;
  message: string;
  intake?: Record<string, unknown>;
};

function escapeHTML(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function sendLeadNotification(lead: LeadNotification) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_NOTIFICATION_EMAIL ?? process.env.OWNER_EMAIL;
  if (!apiKey || !recipient) return { sent: false as const, reason: "not-configured" as const };
  const resend = new Resend(apiKey);
  const from = process.env.CONTACT_FROM_EMAIL ?? `${brand.emailFromName} <onboarding@resend.dev>`;
  const auditDetails =
    lead.intake && "desiredOutcome" in lead.intake
      ? `<h2 style="font-size:18px;margin:24px 0 8px">Workflow audit intake</h2><p style="line-height:1.7"><strong>Phone:</strong> ${escapeHTML(String(lead.intake.phone || "Not provided"))}<br><strong>Industry:</strong> ${escapeHTML(String(lead.intake.industry || ""))}<br><strong>Employees:</strong> ${escapeHTML(String(lead.intake.employees || "Not provided"))}<br><strong>Current tools:</strong> ${escapeHTML(String(lead.intake.currentTools || ""))}<br><strong>Estimated hours lost:</strong> ${escapeHTML(String(lead.intake.hoursLost || "Not provided"))}<br><strong>Preferred contact:</strong> ${escapeHTML(String(lead.intake.preferredContact || ""))}</p><div style="margin:18px 0;padding:18px;background:#f4f4f5;border-radius:10px;white-space:pre-wrap;line-height:1.6"><strong>Desired outcome</strong><br>${escapeHTML(String(lead.intake.desiredOutcome || ""))}</div>`
      : lead.intake && "productId" in lead.intake
        ? `<h2 style="font-size:18px;margin:24px 0 8px">System inquiry details</h2><p style="line-height:1.7"><strong>System:</strong> ${escapeHTML(String(lead.intake.productName || lead.intake.productId))}<br><strong>Category:</strong> ${escapeHTML(String(lead.intake.productCategory || ""))}<br><strong>Price:</strong> ${escapeHTML(String(lead.intake.productPrice || ""))}</p>`
        : "";
  const { data, error } = await withOperationTimeout(resend.emails.send({
    from,
    to: recipient,
    replyTo: lead.email,
    subject: `[${brand.name}] New ${lead.projectType || "project"} inquiry · ${lead.name}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#171717"><div style="border-bottom:3px solid #0891b2;padding-bottom:16px"><p style="margin:0;font-size:15px;font-weight:700;letter-spacing:.12em">${brand.name}</p><p style="margin:6px 0 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#52606d">${brand.descriptor}</p></div><p style="margin-top:24px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#0891b2">New project inquiry</p><h1 style="font-size:26px;margin:12px 0">${escapeHTML(lead.name)}</h1><p><strong>Email:</strong> <a href="mailto:${escapeHTML(lead.email)}">${escapeHTML(lead.email)}</a><br><strong>Company:</strong> ${escapeHTML(lead.company || "Not provided")}<br><strong>Project:</strong> ${escapeHTML(lead.projectType || "Not selected")}<br><strong>Budget:</strong> ${escapeHTML(lead.budget || "Not selected")}</p><div style="margin:24px 0;padding:18px;background:#f4f4f5;border-radius:10px;white-space:pre-wrap;line-height:1.6">${escapeHTML(lead.message)}</div>${auditDetails}<p><a href="${brand.siteURL}/dashboard/leads">Open Client Leads</a></p><p style="margin-top:28px;border-top:1px solid #e4e4e7;padding-top:14px;font-size:11px;color:#71717a">${brand.emailFromName}<br>${brand.descriptor} · <a href="mailto:${brand.email}">${brand.email}</a></p></div>`,
  }, { headers: { "Idempotency-Key": lead.idempotencyKey ?? `contact-inquiry-${lead.id}` } }), outboundRequestTimeoutMs);
  if (error) {
    const failure = new Error("Email provider rejected the notification");
    failure.name = "UpstreamError";
    Object.assign(failure, {
      code: `RESEND_${String(error.name ?? "unknown").toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`,
      statusCode: "statusCode" in error ? error.statusCode : undefined,
    });
    throw failure;
  }
  return { sent: true as const, id: data?.id ?? null };
}
