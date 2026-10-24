import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { PortalReadiness } from "@/components/dashboard/portal-readiness";
export const metadata = {
  title: "Portal Readiness | Yorkstead",
  robots: { index: false, follow: false },
};
export default async function PortalReadinessPage() {
  if (!(await getOwnerSession(await headers())))
    redirect("/login?next=/dashboard/portal-readiness");
  return <PortalReadiness />;
}
