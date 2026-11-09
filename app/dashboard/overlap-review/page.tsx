import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { loadOverlapReview, parseOverlapQuery } from "@/lib/overlap-review";

export const metadata: Metadata = { title: "Account overlap review | Yorkstead", robots: { index: false, follow: false, noarchive: true } };

export default async function OverlapReviewPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  if (!(await getOwnerSession(await headers()))) redirect("/login?next=/dashboard/overlap-review");
  const requested = (await searchParams).q;
  const raw = Array.isArray(requested) ? requested[0] : requested;
  const query = parseOverlapQuery(raw);
  let result: Awaited<ReturnType<typeof loadOverlapReview>> | null = null;
  let unavailable = false;
  if (query) {
    try { result = await loadOverlapReview(query); }
    catch { unavailable = true; }
  }
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-foreground sm:px-8">
    <header><p className="font-mono text-xs uppercase text-primary">Command Center · Phase 1</p><h1 className="mt-2 text-3xl font-semibold">Account overlap review</h1><p className="mt-2 text-sm text-muted-foreground">Possible matches across Marketing, Opportunity Discovery, and CRM. Review each source record before linking anything.</p></header>
    <form className="flex gap-2" action="/dashboard/overlap-review"><label className="flex-1 text-sm">Search company or contact<input name="q" maxLength={80} minLength={3} defaultValue={query ?? ""} required className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2" /></label><button className="self-end rounded-md bg-primary px-4 py-2 text-primary-foreground">Review</button></form>
    {raw && !query && <p role="alert">Enter 3–80 characters.</p>}
    {unavailable && <p role="alert">Review data is unavailable. Try again later; no records were changed.</p>}
    {result?.limited && <p role="status">Results are limited by source. Refine the search before concluding there is no match.</p>}
    {result && !result.candidates.length && <p>No cross-source candidates in this bounded search. This does not establish that records are unique.</p>}
    {result?.candidates.map((candidate, index) => <section key={index} className="rounded-lg border border-border bg-card p-4"><h2 className="font-medium">Possible match · {candidate.signal === "email" ? "same email and company" : "company name only — weak signal"}</h2><ul className="mt-3 space-y-2">{candidate.records.map((record) => <li key={`${record.source}:${record.id}`} className="text-sm"><span className="font-mono text-xs text-muted-foreground">{record.source}</span> · {record.company} {record.email ? `· ${record.email}` : ""} · <Link className="text-primary underline" href={record.href}>Open source</Link>{record.crmLeadId && record.source !== "CRM" ? ` · already linked to CRM #${record.crmLeadId}` : ""}</li>)}</ul></section>)}
  </main>;
}
