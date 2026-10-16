import type { Instrumentation } from "next";
import { recordConversionEvent } from "@/lib/conversion-analytics";
import { hashedRequestAddress } from "@/lib/request-privacy";

export const reportAnalyticsRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value) headers.set(key, value);
  }
  const digest = error && typeof error === "object" && "digest" in error ? String(error.digest).slice(0, 160) : "";
  await recordConversionEvent({
    event: "server_error",
    path: request.path.split("?", 1)[0]?.slice(0, 200) || "/",
    visitorHash: hashedRequestAddress(headers, "server-error", true),
    metadata: { digest, routeType: context.routeType, renderSource: context.renderSource },
  });
};
