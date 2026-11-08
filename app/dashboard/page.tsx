import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { getGoogleOperations } from "@/lib/dashboard-google-operations";
import { getOwnerSession } from "@/lib/owner-session";
import { getCommandCenterCrmSnapshot } from "@/lib/contact-inquiries";
import { getAnalyticsOverviewSnapshot } from "@/lib/analytics-dashboard";
import { opportunityStore } from "@/lib/opportunity-discovery-store";

export default async function DashboardPage() {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard");
  const [googleOperations, crmResult, analyticsResult, researchResult] = await Promise.all([
    getGoogleOperations(),
    getCommandCenterCrmSnapshot().then((snapshot) => ({ snapshot, unavailable: false })).catch(() => ({ snapshot: null, unavailable: true })),
    getAnalyticsOverviewSnapshot().then((snapshot) => ({ snapshot, unavailable: false })).catch(() => ({ snapshot: null, unavailable: true })),
    opportunityStore.attentionActions().then((reports) => ({ ...reports, unavailable: false })).catch(() => ({ items: [], unavailable: true, truncated: false })),
  ]);
  return <Dashboard googleOperations={googleOperations} crmSnapshot={crmResult.snapshot} crmUnavailable={crmResult.unavailable} analyticsSnapshot={analyticsResult.snapshot} analyticsUnavailable={analyticsResult.unavailable} researchActions={researchResult.items} researchUnavailable={researchResult.unavailable} researchTruncated={researchResult.truncated} />;
}

