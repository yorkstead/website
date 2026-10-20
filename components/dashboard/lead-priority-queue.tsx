import { updateCrmOpportunity } from "@/app/actions/crm-opportunity";
import Link from "next/link";
import { contactDatabase } from "@/lib/contact-inquiries";

type QueueItem = {
  id: string;
  source: "Website" | "CRM";
  label: string;
  stage: string;
  action: string;
  due: string | null;
  href: string;
  opportunityId?: string;
};

type CrmOpportunity = {
  opportunity_id: string;
  company: string;
  title: string;
  stage: string;
  next_action: string | null;
  follow_up_date: string | null;
};

const dateKey = (value: string | null) => value?.slice(0, 10) || null;
const localToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((p) => p.type === name)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
};

export async function LeadPriorityQueue() {
  const secret = process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
  const [website, crm] = await Promise.allSettled([
    (async () => {
      const sql = await contactDatabase();
      const rows = await sql`SELECT id,name,company,status,follow_up_at FROM contact_inquiries WHERE status NOT IN ('won','lost','archived') ORDER BY follow_up_at ASC NULLS LAST,created_at DESC LIMIT 100`;
      return rows.map((row): QueueItem => ({
        id: "web:" + row.id,
        source: "Website",
        label: String(row.company || row.name || "Website inquiry"),
        stage: String(row.status || "new"),
        action: "Review website inquiry",
        due: row.follow_up_at ? dateKey(String(row.follow_up_at instanceof Date ? row.follow_up_at.toISOString() : row.follow_up_at)) : null,
        href: "/dashboard/leads",
      }));
    })(),
    (async () => {
      if (!secret || secret.length < 32) throw Error("bridge_unconfigured");
      const res = await fetch("https://cal.yorkstead.com/api/integrations/website-summary", {
        headers: { Authorization: "Bearer " + secret }, cache: "no-store", signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw Error("crm_unavailable");
      const payload = await res.json() as { opportunities?: CrmOpportunity[] };
      return (payload.opportunities || []).map((item): QueueItem => ({
        id: "crm:" + item.opportunity_id,
        opportunityId: item.opportunity_id,
        source: "CRM",
        label: item.company || item.title || "CRM opportunity",
        stage: item.stage || "open",
        action: item.next_action || item.title || "Review opportunity",
        due: dateKey(item.follow_up_date),
        href: "https://cal.yorkstead.com/crm/pipeline",
      }));
    })(),
  ]);

  if (website.status === "rejected" && crm.status === "rejected") {
    return <p className="mb-5 rounded-xl border border-border p-4 text-sm text-muted-foreground">Follow-up queue is temporarily unavailable. Your original lead records remain unchanged.</p>;
  }
  const today = localToday();
  const items = [
    ...(website.status === "fulfilled" ? website.value : []),
    ...(crm.status === "fulfilled" ? crm.value : []),
  ].sort((a, b) => {
    const rank = (item: QueueItem) => item.due && item.due <= today ? 0 : item.due ? 1 : 2;
    return rank(a) - rank(b) || (a.due || "9999").localeCompare(b.due || "9999") || a.label.localeCompare(b.label);
  });
  const due = items.filter((item) => item.due && item.due <= today);
  return <section aria-label="Unified follow-up queue" className="mb-6 rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Across both lead sources</p><h2 className="mt-1 text-lg font-semibold">Follow-up priority queue</h2><p className="mt-1 text-xs text-muted-foreground">Due and overdue first, then scheduled, then unscheduled.</p></div>
      <span className="rounded-lg bg-secondary px-3 py-2 text-xs">{due.length} due or overdue</span>
    </div>
    {(website.status === "rejected" || crm.status === "rejected") && <p className="mt-3 text-xs text-amber-600">One source is unavailable. This is a partial queue; existing data is unaffected.</p>}
    {items.length ? <div className="mt-4 divide-y divide-border/60">{items.slice(0, 20).map((item) =>
      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px]">{item.source}</span><span className="text-sm font-medium">{item.label}</span><span className="text-xs text-muted-foreground">{item.stage}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.action}</p></div>
        <div className="flex items-center gap-3"><span className={"text-xs " + (item.due && item.due <= today ? "font-semibold text-amber-600" : "text-muted-foreground")}>{item.due ? item.due < today ? "Overdue · " + item.due : item.due === today ? "Due today" : item.due : "Unscheduled"}</span>{item.source === "CRM" ? <a className="text-xs text-primary" href={item.href}>Open →</a> : <Link className="text-xs text-primary" href={item.href}>Open →</Link>}</div>
        {item.opportunityId && <form action={updateCrmOpportunity} className="grid w-full gap-2 rounded-lg bg-secondary/30 p-3 sm:grid-cols-[160px_1fr_170px_auto]">
          <input type="hidden" name="opportunityId" value={item.opportunityId}/>
          <label className="text-[11px] text-muted-foreground">Stage
            <select name="stage" defaultValue={item.stage} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm">
              {["prospect","qualified","demo","proposal","won","lost"].map(stage=><option key={stage} value={stage}>{stage}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-muted-foreground">Next action
            <input name="nextAction" defaultValue={item.action} maxLength={500} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"/>
          </label>
          <label className="text-[11px] text-muted-foreground">Follow-up date
            <input type="date" name="followUpDate" defaultValue={item.due||""} className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"/>
          </label>
          <button type="submit" className="self-end rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Save CRM</button>
        </form>}
      </div>
    )}</div> : <p className="mt-4 text-sm text-muted-foreground">No open leads in the connected sources.</p>}
    {items.length > 20 && <p className="mt-3 text-xs text-muted-foreground">Showing 20 of {items.length} prioritized records.</p>}
    <p className="mt-3 text-[11px] text-muted-foreground">CRM stages, next actions and dates can be edited here. Website inquiry updates remain in the detailed lead cards below. Up to 100 open records per source are checked.</p>
  </section>;
}
