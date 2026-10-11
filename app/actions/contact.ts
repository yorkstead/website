"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { brand } from "@/lib/brand";
import { contactDatabase } from "@/lib/contact-inquiries";
import { recordConversionEvent } from "@/lib/conversion-analytics";
import { sendLeadNotification } from "@/lib/lead-notification";
import { hashedRequestAddress } from "@/lib/request-privacy";
import { logOperationalError, requestCorrelationId, withOperationTimeout } from "@/lib/operational-observability";
import {
  contactSubmissionKey,
  processContactSubmission,
  validateContactPayload,
  type ContactPayload,
  type ContactValidationErrors,
} from "@/lib/contact-submission";

export type ContactState = {
  status: "idle" | "success" | "duplicate" | "error";
  message: string;
  errors?: ContactValidationErrors;
};

function text(formData: FormData, key: string, maximum: number) {
  return String(formData.get(key) ?? "").trim().slice(0, maximum);
}

export async function submitContact(_: ContactState, formData: FormData): Promise<ContactState> {
  const payload: ContactPayload = {
    website: text(formData, "website", 200),
    name: text(formData, "name", 100),
    email: String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 181),
    company: text(formData, "company", 120),
    projectType: text(formData, "projectType", 80),
    productId: text(formData, "productId", 80),
    budget: text(formData, "budget", 80),
    message: text(formData, "message", 4000),
  };

  const requestHeaders = await headers();
  const requestId = requestCorrelationId(requestHeaders);
  const ipHash = hashedRequestAddress(requestHeaders, "contact");
  const visitorHash = hashedRequestAddress(requestHeaders, "conversion-analytics", true);

  async function emailFallback(): Promise<ContactState> {
    if (payload.website) return { status: "success", message: "Thanks—your message is in the queue." };
    const errors = validateContactPayload(payload);
    if (Object.keys(errors).length) return { status: "error", message: "Check the highlighted fields.", errors };
    const projectType = payload.projectType?.trim() || "Project";
    try {
      const notification = await sendLeadNotification({
        id: 0,
        idempotencyKey: `contact-fallback-${contactSubmissionKey(payload.email, payload.productId || projectType)}`,
        name: payload.name.trim(),
        email: payload.email.trim(),
        company: payload.company?.trim() || "",
        projectType,
        budget: payload.budget?.trim() || "",
        message: payload.message.trim(),
        intake: payload.productId ? { productId: payload.productId } : undefined,
      });
      if (notification.sent) return { status: "success", message: "Message received. I’ll review it and get back to you directly." };
    } catch (error) {
      logOperationalError("contact_fallback.failed", requestId, error, { dependency: "resend", operation: "contact_notification" });
    }
    return { status: "error", message: `The contact channel is temporarily unavailable. Email ${brand.email} instead.` };
  }

  let sql: Awaited<ReturnType<typeof contactDatabase>>;
  try {
    sql = await contactDatabase();
  } catch (error) {
    logOperationalError("contact_database.failed", requestId, error, {
      dependency: "database",
      operation: "initialize_contact_database",
    });
    return emailFallback();
  }

  const result = await processContactSubmission(payload, {
    countRecent: async () => {
      const rows = await withOperationTimeout(
        sql`SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'`
      );
      return Number(rows[0]?.count ?? 0);
    },
    insert: async (values, submissionKey) => {
      const rows = await withOperationTimeout(
        sql`INSERT INTO contact_inquiries (
          name, email, company, project_type, budget, message, ip_hash, intake, submission_key
        ) VALUES (
          ${values.name}, ${values.email}, ${values.company}, ${values.projectType},
          ${values.budget}, ${values.message}, ${ipHash},
          ${values.intake ? JSON.stringify(values.intake) : null}::jsonb,
          ${submissionKey}
        ) ON CONFLICT (submission_key) DO NOTHING RETURNING id`
      );
      return rows[0]?.id ? Number(rows[0].id) : null;
    },
  });

  if (result.status === "spam") {
    return { status: "success", message: result.message };
  }
  if (result.status === "invalid") {
    return { status: "error", message: result.message, errors: result.errors };
  }
  if (result.status === "rate_limited") {
    return { status: "error", message: result.message };
  }
  if (result.status === "duplicate") {
    return { status: "duplicate", message: result.message };
  }
  if (result.status === "server_error") {
    logOperationalError("contact_inquiry.failed", requestId, result.error ?? new Error("Storage operation failed"), {
      dependency: "database",
      operation: "create_contact_inquiry",
    });
    return emailFallback();
  }

  after(async () => {
    const notificationTask = (async () => {
      try {
        const notification = await sendLeadNotification({
          id: result.id,
          name: payload.name.trim(),
          email: payload.email.trim(),
          company: payload.company?.trim() || "",
          projectType: result.projectType,
          budget: result.budget,
          message: payload.message.trim(),
          intake: result.intake,
        });
        await withOperationTimeout(
          sql`UPDATE contact_inquiries SET notification_id = ${notification.sent ? notification.id : null}, notification_status = ${notification.sent ? "sent" : "not_configured"}, updated_at = NOW() WHERE id = ${result.id}`
        );
      } catch (error) {
        await withOperationTimeout(
          sql`UPDATE contact_inquiries SET notification_status = 'failed', updated_at = NOW() WHERE id = ${result.id}`
        ).catch(() => undefined);
        logOperationalError("lead_notification.failed", requestId, error, {
          dependency: "resend",
          operation: "contact_notification",
        });
      }
    })();
    await Promise.allSettled([
      notificationTask,
      recordConversionEvent({
        event: "contact_form_submission",
        path: "/",
        visitorHash,
        metadata: result.projectType ? { projectType: result.projectType } : {},
      }),
    ]);
  });

  return { status: "success", message: result.message };
}
