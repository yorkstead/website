import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { customerEnrollmentEnabled } from "@/lib/customer-enrollment";
import { getCustomerAuth } from "@/lib/customer-auth";
import { getEnrollmentPool } from "@/lib/customer-enrollment-runtime";
import { getCustomerProjectSelection } from "@/lib/customer-portal-authorization";
import { customerAuthBoundary } from "@/lib/customer-auth-config";
import { CustomerEnrollmentForm } from "@/components/customer-enrollment-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Customer access",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ screen?: string[] }>;
  searchParams: Promise<{ project?: string }>;
}) {
  if (!customerEnrollmentEnabled()) notFound();
  const screen = (await params).screen?.join("/") ?? "accept";
  if (
    ![
      "accept",
      "enroll",
      "verify",
      "sign-in",
      "sign-out",
      "recovery",
      "unavailable",
      "portal",
    ].includes(screen)
  )
    notFound();
  let projects: { projectId: string; tenantId: string }[] = [],
    authorized = false;
  if (screen === "portal") {
    const session = await getCustomerAuth().api.getSession({
      headers: await headers(),
      query: { disableCookieCache: true },
    });
    if (session) {
      const pool = getEnrollmentPool();
      const credentials = {
        provider: customerAuthBoundary.identityProvider,
        subject: session.user.id,
      };
      const selection = await getCustomerProjectSelection(
        pool,
        credentials,
        (await searchParams).project,
      );
      projects = selection.projects;
      authorized = selection.selected !== null;
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-16 sm:py-24">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          Yorkstead · Customer access
        </p>
        <h1 className="mt-4 text-3xl font-semibold">
          {screen === "portal"
            ? "Your project space"
            : "Secure customer access"}
        </h1>
        {screen === "portal" ? (
          authorized ? (
            <section className="mt-6 space-y-5">
              <p role="status">
                Synthetic preview only. Live customer project information is not
                connected.
              </p>
              <nav
                aria-label="Authorized projects"
                className="flex flex-wrap gap-3"
              >
                {projects.map((p) => (
                  <Link
                    prefetch={false}
                    className="break-all underline"
                    key={p.projectId}
                    href={`/customer/portal?project=${encodeURIComponent(p.projectId)}`}
                  >
                    {p.tenantId} · {p.projectId}
                  </Link>
                ))}
              </nav>
              <h2 className="text-xl font-semibold">Project overview</h2>
              <p>
                Your explicitly granted view is available. No documents,
                payments or internal history are displayed.
              </p>
              <Link
                prefetch={false}
                className="underline"
                href="/customer/sign-out"
              >
                Sign out
              </Link>
            </section>
          ) : (
            <div className="mt-6 space-y-4">
              <p role="status">
                Your session has expired or access is unavailable. Sign in
                again, or contact Yorkstead if access was revoked.
              </p>
              <Link
                prefetch={false}
                className="underline"
                href="/customer/sign-in"
              >
                Customer sign-in
              </Link>
            </div>
          )
        ) : (
          <CustomerEnrollmentForm screen={screen} />
        )}
      </div>
    </main>
  );
}
