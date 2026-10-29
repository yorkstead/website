import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellOff, BellRing, CalendarDays, ClipboardList, ExternalLink, LayoutDashboard, PanelsTopLeft, UserRoundSearch } from "lucide-react";
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
      <section aria-label="Unified Yorkstead workspace navigation" className="mx-auto w-full max-w-7xl px-4 pt-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card/70 px-4 py-3 shadow-sm backdrop-blur">
          <div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">Yorkstead systems</p><p className="mt-1 text-sm font-medium">One workspace · connected operations</p></div>
          <nav className="flex flex-wrap gap-2 text-xs" aria-label="Workspace sections">
            <Link href="/dashboard" aria-current="page" className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-primary"><LayoutDashboard className="size-4" /> Workspace</Link>
            <Link href="/dashboard/leads" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><UserRoundSearch className="size-4" /> Website leads</Link>
            <Link href="/dashboard/marketing" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><ClipboardList className="size-4" /> Marketing</Link>
            <Link href="/dashboard/customer-portal-preview" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><PanelsTopLeft className="size-4" /> Portal preview</Link>
            <Link href="/dashboard/client-publishing" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><PanelsTopLeft className="size-4" /> Client Publishing</Link>
            <Link href="/dashboard/client-access" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><PanelsTopLeft className="size-4" /> Client Access</Link>
            <Link href="/dashboard/portal-readiness" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><PanelsTopLeft className="size-4" /> Portal Readiness</Link>
            <Link href="/dashboard/customer-communications" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><PanelsTopLeft className="size-4" /> Customer Communications</Link>
            <a href="https://cal.yorkstead.com/command" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-foreground hover:bg-accent"><CalendarDays className="size-4" /> Daily operations <ExternalLink className="size-3" /></a>
          </nav>
        </div>
      </section>
        <Dashboard googleOperations={googleOperations} />
      {(overdueFollowUps === null || dueFollowUps === null) ? (
        <Link href="/dashboard/leads" className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur lg:bottom-4">
          <BellOff className="size-4" />Follow-up count unavailable
        </Link>
      ) : overdueFollowUps > 0 || dueFollowUps > 0 ? (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 lg:bottom-4">
          {overdueFollowUps > 0 && <Link href="/dashboard/leads?followUp=overdue" className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-card px-3 py-2 text-xs text-red-400 shadow-lg backdrop-blur"><BellRing className="size-4" />Overdue · {overdueFollowUps}</Link>}
          {dueFollowUps > 0 && <Link href="/dashboard/leads?followUp=today" className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-card px-3 py-2 text-xs text-amber-400 shadow-lg backdrop-blur"><BellRing className="size-4" />Due today · {dueFollowUps}</Link>}
        </div>
      ) : null}
    </>
  );
}

