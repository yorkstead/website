import { z } from "zod";
import { enrollmentPassword } from "@/lib/customer-enrollment";
import type { createCustomerEnrollmentService } from "@/lib/customer-enrollment";
import type { createClientOnboardingService } from "@/lib/client-onboarding";

type Auth = {
  signInEmail: (input: {
    body: { email: string; password: string };
    asResponse: true;
  }) => Promise<Response>;
  signOut: (input: { headers: Headers; asResponse: true }) => Promise<Response>;
};
export function createEnrollmentController(dependencies: {
  enabled: () => boolean;
  origin: string;
  enrollment: ReturnType<typeof createCustomerEnrollmentService>;
  onboarding: ReturnType<typeof createClientOnboardingService>;
  auth: Auth;
}) {
  const safeHeaders = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: safeHeaders });
  return async (request: Request, operation: string) => {
    if (!dependencies.enabled()) return json({ error: "Not Found" }, 404);
    if (
      request.method !== "POST" ||
      request.headers.get("origin") !== dependencies.origin ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("content-type")?.split(";")[0] !== "application/json"
    )
      return json({ error: "Request unavailable" }, 403);
    if (
      ![
        "begin",
        "complete",
        "sign-in",
        "sign-out",
        "redeem",
        "recovery",
      ].includes(operation)
    )
      return json({ error: "Not Found" }, 404);
    try {
      await dependencies.enrollment.limit(`global:${operation}`, 100);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "Request unavailable" }, 400);
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return json({ error: "Request unavailable" }, 400);
        }
        chunks.push(chunk.value);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
      if (["begin", "complete", "redeem"].includes(operation)) {
        token.parse(body.token);
        await dependencies.enrollment.limit(`${operation}:${body.token}`);
      }
      if (operation === "begin")
        return json(
          await dependencies.enrollment.begin(
            z.object({ token }).strict().parse(body).token,
          ),
        );
      if (operation === "recovery")
        return json({
          message:
            "Account recovery delivery is unavailable. Contact Yorkstead through your established support channel.",
        });
      if (operation === "redeem") {
        await dependencies.onboarding.redeem(
          request.headers,
          z.object({ token }).strict().parse(body).token,
        );
        return json({ redirect: "/customer/portal" });
      }
      if (operation === "sign-out") {
        const response = await dependencies.auth.signOut({
          headers: request.headers,
          asResponse: true,
        });
        for (const [key, value] of Object.entries(safeHeaders))
          response.headers.set(key, value);
        return response;
      }
      let email: string, password: string;
      if (operation === "complete") {
        const result = await dependencies.enrollment.complete(body);
        email = result.email;
        password = body.password;
      } else {
        const input = z
          .object({ email: z.email().max(320), password: enrollmentPassword })
          .strict()
          .parse(body);
        email = input.email.trim().toLowerCase();
        password = input.password;
      }
      await dependencies.enrollment.limit(`sign-in:${email}`);
      const response = await dependencies.auth.signInEmail({
        body: { email, password },
        asResponse: true,
      });
      if (!response.ok)
        return json(
          {
            error:
              "Unable to continue. Check your details or contact Yorkstead.",
          },
          400,
        );
      const headers = new Headers(safeHeaders);
      for (const cookie of response.headers.getSetCookie())
        headers.append("Set-Cookie", cookie);
      // CC-006 uses the actual provider cookie and rechecks the database session in its transaction.
      if (operation === "complete") {
        const sessionHeaders = new Headers({
          cookie: response.headers
            .getSetCookie()
            .map((c) => c.split(";")[0])
            .join("; "),
        });
        try {
          await dependencies.onboarding.redeem(sessionHeaders, body.token);
        } catch {
          return Response.json(
            { error: "Sign in again and retry your invitation to continue." },
            { status: 409, headers },
          );
        }
      }
      return Response.json({ redirect: "/customer/portal" }, { headers });
    } catch {
      // Never log provider errors, addresses, tokens, passwords or proof values.
      return json(
        {
          error:
            "Unable to continue. The invitation may be invalid, expired, revoked or already used. Try again later or contact Yorkstead.",
        },
        400,
      );
    }
  };
}
