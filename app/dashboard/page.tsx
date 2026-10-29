import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { getGoogleOperations } from "@/lib/dashboard-google-operations";
import { getOwnerSession } from "@/lib/owner-session";
import { getCommandCenterCrmSnapshot } from "@/lib/contact-inquiries";

export default async function DashboardPage() {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard");
  const [googleOperations, crmResult] = await Promise.all([
    getGoogleOperations(),
    getCommandCenterCrmSnapshot().then((snapshot) => ({ snapshot, unavailable: false })).catch(() => ({ snapshot: null, unavailable: true })),
  ]);
  return <Dashboard googleOperations={googleOperations} crmSnapshot={crmResult.snapshot} crmUnavailable={crmResult.unavailable} />;
}

