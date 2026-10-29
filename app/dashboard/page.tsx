import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellOff, BellRing } from "lucide-react";
import { Dashboard } from "@/components/dashboard";
import { getGoogleOperations } from "@/lib/dashboard-google-operations";
import { getOwnerSession } from "@/lib/owner-session";
import { getDashboardDueFollowUps, getDashboardOverdueFollowUps } from "@/lib/dashboard-data";

export default async function DashboardPage() {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard");
  const [dueFollowUps, overdueFollowUps, googleOperations] = await Promise.all([getDashboardDueFollowUps(), getDashboardOverdueFollowUps(), getGoogleOperations()]);
  return (
    <>
      <Dashboard googleOperations={googleOperations} />
      {(overdueFollowUps === null || dueFollowUps === null) ? (
        <Link href="/dashboard/leads" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
          <BellOff className="size-4" />Follow-up count unavailable
        </Link>
      ) : overdueFollowUps > 0 || dueFollowUps > 0 ? (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          {overdueFollowUps > 0 && <Link href="/dashboard/leads?followUp=overdue" className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-card px-3 py-2 text-xs text-red-400 shadow-lg backdrop-blur"><BellRing className="size-4" />Overdue · {overdueFollowUps}</Link>}
          {dueFollowUps > 0 && <Link href="/dashboard/leads?followUp=today" className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-card px-3 py-2 text-xs text-amber-400 shadow-lg backdrop-blur"><BellRing className="size-4" />Due today · {dueFollowUps}</Link>}
        </div>
      ) : null}
    </>
  );
}

