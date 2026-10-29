import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { getAutomationHubHealth } from "@/lib/automation-hub-health";
import { OperationsWorkspace } from "@/components/dashboard/operations";

export const metadata = {
  title: "Automations | Yorkstead",
  robots: { index: false, follow: false },
};

export default async function AutomationsPage() {
  if (!(await getOwnerSession(await headers())))
    redirect("/login?next=/dashboard/automations");
  const automationHub = await getAutomationHubHealth();
  return <OperationsWorkspace automationHub={automationHub} />;
}
