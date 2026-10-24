import { NextResponse } from "next/server";
import { customerEnrollmentEnabled } from "@/lib/customer-enrollment-gate";

// Return a true 404 before React can stream any disabled customer page.
// Route handlers and server components independently enforce the same gate.
export function proxy() {
  if (!customerEnrollmentEnabled())
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = {
  matcher: ["/customer/:path*", "/api/customer-enrollment/:path*"],
};
