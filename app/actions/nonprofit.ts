"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { contactDatabase } from "@/lib/contact-inquiries";
import { processContactSubmission } from "@/lib/contact-submission";
import { sendLeadNotification } from "@/lib/lead-notification";
import { hashedRequestAddress } from "@/lib/request-privacy";
import { withOperationTimeout } from "@/lib/operational-observability";
import { parseNonprofit } from "@/lib/nonprofit";

export async function submitNonprofit(data: FormData) {
  if (data.get("website")) return { status: "success", message: "Your answers have been received." };
  let parsed: ReturnType<typeof parseNonprofit>;
  try { parsed = parseNonprofit(data); }
  catch { return { status: "error", message: "Please use the listed food options and keep each answer under 600 characters." }; }
  const { values, message } = parsed;
  if (values.name.length > 100 || values.email.length > 180) return { status: "error", message: "Please shorten your name or email." };
  try {
    const sql = await contactDatabase();
    const ipHash = hashedRequestAddress(await headers(), "contact");
    const payload = { name: values.name, email: values.email, company: "Our-Town Pantry", projectType: "Nonprofit planning", budget: values.budget, message };
    const result = await processContactSubmission(payload, {
      countRecent: async () => {
        const rows = await withOperationTimeout(sql`SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'`);
        return Number(rows[0]?.count ?? 0);
      },
      insert: async (validated) => {
        const key = createHash("sha256").update(`nonprofit|${validated.email}|${message}`).digest("hex");
        const rows = await withOperationTimeout(sql`INSERT INTO contact_inquiries (name, email, company, project_type, budget, message, ip_hash, submission_key) VALUES (${validated.name}, ${validated.email}, ${validated.company}, ${validated.projectType}, ${validated.budget}, ${message}, ${ipHash}, ${key}) ON CONFLICT (submission_key) DO NOTHING RETURNING id`);
        return rows[0]?.id ? Number(rows[0].id) : null;
      },
    });
    if (result.status === "success") {
      after(async () => {
        try {
          const notification = await sendLeadNotification({ id: result.id, ...payload });
          await withOperationTimeout(sql`UPDATE contact_inquiries SET notification_id = ${notification.sent ? notification.id : null}, notification_status = ${notification.sent ? "sent" : "not_configured"}, updated_at = NOW() WHERE id = ${result.id}`);
        } catch {
          await withOperationTimeout(sql`UPDATE contact_inquiries SET notification_status = 'failed', updated_at = NOW() WHERE id = ${result.id}`).catch(() => undefined);
        }
      });
      return { status: "success", message: "Your answers have been saved for Brandon." };
    }
    if (result.status === "duplicate") return { status: "success", message: "These answers have already been saved for Brandon." };
    if (result.status === "invalid") return { status: "error", message: "Please enter your name (at least 2 characters) and a valid email address." };
    return { status: "error", message: result.message };
  } catch { return { status: "error", message: "We couldn’t save your answers. Please try again shortly. Your entries are still on this page." }; }
}
