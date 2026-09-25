"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { brand } from "@/lib/brand";
import { contactDatabase } from "@/lib/contact-inquiries";
import { recordConversionEvent } from "@/lib/conversion-analytics";
import { sendLeadNotification } from "@/lib/lead-notification";
import { hashedRequestAddress } from "@/lib/request-privacy";
import { logOperationalError, requestCorrelationId, withOperationTimeout } from "@/lib/operational-observability";
import {
  restaurantTrialIntake,
  restaurantTrialPayload,
  validateRestaurantTrial,
  type RestaurantTrialErrors,
} from "@/lib/restaurant-trial-intake";

export type RestaurantTrialState = {
  status: "idle" | "success" | "duplicate" | "error";
  message: string;
  errors?: RestaurantTrialErrors;
};

export async function submitRestaurantTrial(
  _: RestaurantTrialState,
  formData: FormData
): Promise<RestaurantTrialState> {
  const payload = restaurantTrialPayload(formData);
  const requestHeaders = await headers();
  const requestId = requestCorrelationId(requestHeaders);
  const ipHash = hashedRequestAddress(requestHeaders, "restaurant-trial");
  const visitorHash = hashedRequestAddress(requestHeaders, "conversion-analytics", true);

  if (payload.website) {
    return { status: "success", message: "Thanks—your trial request is in the queue." };
  }

  const errors = validateRestaurantTrial(payload);
  if (Object.keys(errors).length > 0) {
    after(() =>
      recordConversionEvent({
        event: "lead",
        path: "/work/table-os",
        visitorHash,
        metadata: { status: "validation_error", fields: Object.keys(errors) },
      }).catch(() => undefined)
    );
    return {
      status: "error",
      message: "Check the highlighted fields to submit your evaluation request.",
      errors,
    };
  }

  let sql: Awaited<ReturnType<typeof contactDatabase>>;
  try {
    sql = await contactDatabase();
  } catch (error) {
    logOperationalError("restaurant_trial_database.failed", requestId, error, {
      dependency: "database",
      operation: "initialize_restaurant_trial",
    });
    return {
      status: "error",
      message: `The secure intake channel is temporarily unavailable. Email ${brand.email} instead.`,
    };
  }

  try {
    const recent = await withOperationTimeout(
      sql`SELECT COUNT(*)::int AS count FROM contact_inquiries WHERE ip_hash = ${ipHash} AND created_at > NOW() - INTERVAL '1 hour'`
    );
    if (Number(recent[0]?.count ?? 0) >= 5) {
      return {
        status: "error",
        message: `Several inquiries have come from this connection recently. Try again later or email ${brand.email}.`,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const submissionKey = createHash("sha256")
      .update(`restaurant-trial:${payload.email}:${payload.restaurantName}:${today}`)
      .digest("hex");

    const structuredIntake = restaurantTrialIntake(payload);
    const formattedMessage = [
      `Restaurant: ${payload.restaurantName} (${payload.cityState})`,
      `Capacity & Terminals: ${payload.approximateSeats || "Unspecified"} · ${payload.posTerminals || "Unspecified"}`,
      `Current POS: ${payload.currentPos || "Not specified"}`,
      `Kitchen Setup: ${payload.kitchenSetup || "Not specified"}`,
      `Private Dining / Events: ${payload.hasPrivateDining || "No"}`,
      `Preferred Timing: ${payload.preferredTiming || "Flexible"}`,
      payload.biggestPainPoint ? `Operational Issue / Focus: ${payload.biggestPainPoint}` : null,
      payload.notes ? `Additional Notes: ${payload.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const rows = await withOperationTimeout(
      sql`INSERT INTO contact_inquiries (
        name, email, company, phone, project_type, budget, message, ip_hash, intake, submission_key
      ) VALUES (
        ${payload.contactName}, ${payload.email}, ${payload.restaurantName}, ${payload.phone || null},
        'Restaurant 14-Day Trial', '14-Day Hardware Evaluation', ${formattedMessage},
        ${ipHash}, ${JSON.stringify(structuredIntake)}::jsonb, ${submissionKey}
      ) ON CONFLICT DO NOTHING RETURNING id`
    );

    const inquiryId = rows[0]?.id ? Number(rows[0].id) : null;
    if (!inquiryId) {
      return {
        status: "duplicate",
        message: "Your evaluation request is already in our queue. We will review your operating specs and reach out directly.",
      };
    }

    after(async () => {
      const notificationTask = (async () => {
        try {
          const notification = await sendLeadNotification({
            id: inquiryId,
            name: payload.contactName,
            email: payload.email,
            company: payload.restaurantName,
            projectType: "Restaurant 14-Day Trial",
            budget: "14-Day Evaluation Kit",
            message: formattedMessage,
          });
          await withOperationTimeout(
            sql`UPDATE contact_inquiries SET notification_id = ${notification.sent ? notification.id : null}, notification_status = ${notification.sent ? "sent" : "not_configured"}, updated_at = NOW() WHERE id = ${inquiryId}`
          );
        } catch (error) {
          await withOperationTimeout(
            sql`UPDATE contact_inquiries SET notification_status = 'failed', updated_at = NOW() WHERE id = ${inquiryId}`
          ).catch(() => undefined);
          logOperationalError("restaurant_trial_notification.failed", requestId, error, {
            dependency: "resend",
            operation: "restaurant_trial_notification",
          });
        }
      })();

      await Promise.allSettled([
        notificationTask,
        recordConversionEvent({
          event: "qualified_lead",
          path: "/work/table-os",
          visitorHash,
          metadata: {
            type: "restaurant_trial",
            restaurantName: payload.restaurantName,
            approximateSeats: payload.approximateSeats,
            posTerminals: payload.posTerminals,
          },
        }),
      ]);
    });

    return {
      status: "success",
      message:
        "Your 14-day evaluation request is in. Brandon will review your dining room and kitchen workflow specifications and follow up within one business day to coordinate the demonstration environment and hardware configuration.",
    };
  } catch (error) {
    logOperationalError("restaurant_trial.failed", requestId, error, {
      dependency: "database",
      operation: "create_restaurant_trial_inquiry",
    });
    return {
      status: "error",
      message: `The secure intake channel is temporarily unavailable. Email ${brand.email} directly.`,
    };
  }
}
