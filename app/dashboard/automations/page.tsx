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
  const writeEnabled = process.env.YORKSTEAD_AUTOMATIONS_ACTIONS_ENABLED === "true" && Boolean(process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET && process.env.YORKSTEAD_AUTOMATIONS_WRITE_SECRET.length >= 32);
  return <OperationsWorkspace automationHub={automationHub} writeEnabled={writeEnabled} />;
}
