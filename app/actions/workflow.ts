"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { brand } from "@/lib/brand";
import { contactDatabase } from "@/lib/contact-inquiries";
import { recordConversionEvent } from "@/lib/conversion-analytics";
import { sendLeadNotification } from "@/lib/lead-notification";
import { hashedRequestAddress } from "@/lib/request-privacy";
import { logOperationalError, requestCorrelationId, withOperationTimeout } from "@/lib/operational-observability";
import { processWorkflowLead, workflowLeadPayload, type WorkflowLeadErrors } from "@/lib/workflow-lead";

export type WorkflowLeadState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: WorkflowLeadErrors;
};

function buildLandingPage(headersList: Headers) {
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "yorkstead.com";
  return `${proto}://${host}/workflow`;
}

export async function submitWorkflowLead(_: WorkflowLeadState, formData: FormData): Promise<WorkflowLeadState> {
  const payload = workflowLeadPayload(formData);
  const requestHeaders = await headers();
  const requestId = requestCorrelationId(requestHeaders);
  const ipHash = hashedRequestAddress(requestHeaders, "workflow-lead");
  const visitorHash = hashedRequestAddress(requestHeaders, "conversion-analytics", true);

  let sql: Awaited<ReturnType<typeof contactDatabase>>;
  try {
    sql = await contactDatabase();
  } catch (error) {
    logOperationalError("workflow_lead_database.failed", requestId, error, { dependency: "database", operation: "initialize_workflow_lead" });
    return { status: "error", message: `The lead form is temporarily unavailable. Email ${brand.email} instead.` };
  }

  const result = await processWorkflowLead(payload, {
    countRecent: async () => {
      const rows = await withOperationTimeout(sql`SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'`);
      return Number(rows[0]?.count ?? 0);
    },
    insert: async (values, submissionKey) => {
      const problemAreas = values.problemAreas.length ? values.problemAreas : [];
      const landingPage = buildLandingPage(requestHeaders);
      const referrer = requestHeaders.get("referer") ?? "";
      const rows = await withOperationTimeout(sql`INSERT INTO contact_inquiries (
        name, email, company, phone, message, project_type, problem_areas, ip_hash, source, medium, campaign, content, term, landing_page, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, submission_key
      ) VALUES (
        ${values.name}, ${values.email}, ${values.company}, ${values.phone}, ${values.description}, 'Workflow lead', ${problemAreas}, ${ipHash}, ${values.utm_source || 'direct'}, ${values.utm_medium || 'organic'}, ${values.utm_campaign || null}, ${values.utm_content || null}, ${values.utm_term || null}, ${landingPage}, ${referrer || null}, ${values.utm_source || null}, ${values.utm_medium || null}, ${values.utm_campaign || null}, ${values.utm_content || null}, ${values.utm_term || null}, ${submissionKey}
      ) ON CONFLICT DO NOTHING RETURNING id`);
      return rows[0]?.id ? Number(rows[0].id) : null;
    },
  });

  if (result.status === "spam") return { status: "success", message: "Thanks—your request is in the queue." };
  if (result.status === "invalid") return { status: "error", message: "Check the highlighted fields and try again.", errors: result.errors };
  if (result.status === "rate_limited") return { status: "error", message: `Several inquiries have come from this connection recently. Try again later or email ${brand.email}.` };
  if (result.status === "duplicate") return { status: "success", message: "This request is already in the queue and does not need to be sent again." };
  if (result.status === "server_error") return { status: "error", message: `The lead form is temporarily unavailable. Email ${brand.email} instead.` };

  after(async () => {
    const notificationTask = (async () => {
      try {
        const message = [
          `Business problem: ${result.values.description}`,
          `Problem areas: ${result.values.problemAreas.join(", ") || "Not specified"}`,
          result.values.utm_source || result.values.utm_medium || result.values.utm_campaign ? `Attribution: ${[result.values.utm_source, result.values.utm_medium, result.values.utm_campaign].filter(Boolean).join(" | ")}` : "Attribution: direct / unknown",
        ].join("\n\n");
        const notification = await sendLeadNotification({
          id: result.id,
          name: result.values.name,
          email: result.values.email,
          company: result.values.company,
          projectType: "Workflow lead",
          budget: "Not provided",
          message,
        });
        await withOperationTimeout(sql`UPDATE contact_inquiries SET notification_id = ${notification.sent ? notification.id : null}, notification_status = ${notification.sent ? "sent" : "not_configured"}, updated_at = NOW() WHERE id = ${result.id}`);
      } catch (error) {
        await withOperationTimeout(sql`UPDATE contact_inquiries SET notification_status = 'failed', updated_at = NOW() WHERE id = ${result.id}`).catch(() => undefined);
        logOperationalError("workflow_lead_notification.failed", requestId, error, { dependency: "resend", operation: "workflow_lead_notification" });
      }
    })();

    await Promise.allSettled([
      notificationTask,
      recordConversionEvent({ event: "lead", path: "/workflow", visitorHash, metadata: { source: result.values.utm_source || "direct", campaign: result.values.utm_campaign || "organic", problemAreas: result.values.problemAreas } }),
    ]);
  });

  return { status: "success", message: "Thanks. We’ll review the workflow problem and follow up directly with the next steps." };
}
