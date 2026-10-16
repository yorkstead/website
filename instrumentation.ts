import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { reportAnalyticsRequestError } = await import("@/lib/analytics-error-reporter");
    await reportAnalyticsRequestError(error, request, context);
  } catch {
    // Error reporting must never replace the original application error.
  }
};
