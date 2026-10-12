export const defaultWorkflowAuditBookingURL = "https://cal.com/yorkstead";

export function workflowAuditBookingURL(value = process.env.WORKFLOW_AUDIT_BOOKING_URL) {
  if (!value) return defaultWorkflowAuditBookingURL;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : defaultWorkflowAuditBookingURL;
  } catch {
    return defaultWorkflowAuditBookingURL;
  }
}
