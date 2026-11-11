import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { getAutomationHubData } from "@/lib/automation-hub-data";
import { getGoogleOperations } from "@/lib/dashboard-google-operations";
import { getOwnerSession } from "@/lib/owner-session";
import { getCommandCenterCrmSnapshot } from "@/lib/contact-inquiries";
import { getAnalyticsOverviewSnapshot } from "@/lib/analytics-dashboard";
import { opportunityStore } from "@/lib/opportunity-discovery-store";

export default async function DashboardPage() {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard");
  const [automationHub, crmResult, analyticsResult, researchResult] = await Promise.all([
    getAutomationHubData(),
    getCommandCenterCrmSnapshot().then((snapshot) => ({ snapshot, unavailable: false, readAt: new Date().toISOString() })).catch(() => ({ snapshot: null, unavailable: true, readAt: null })),
    getAnalyticsOverviewSnapshot().then((snapshot) => ({ snapshot, unavailable: false })).catch(() => ({ snapshot: null, unavailable: true })),
    opportunityStore.attentionActions().then((reports) => ({ ...reports, unavailable: false, readAt: new Date().toISOString() })).catch(() => ({ items: [], unavailable: true, truncated: false, readAt: null })),
  ]);
  return <Dashboard automationHub={automationHub} googleOperations={getGoogleOperations(automationHub)} crmSnapshot={crmResult.snapshot} crmUnavailable={crmResult.unavailable} crmReadAt={crmResult.readAt} analyticsSnapshot={analyticsResult.snapshot} analyticsUnavailable={analyticsResult.unavailable} researchActions={researchResult.items} researchUnavailable={researchResult.unavailable} researchTruncated={researchResult.truncated} researchReadAt={researchResult.readAt} />;
}

