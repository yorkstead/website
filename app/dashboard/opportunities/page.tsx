import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/owner-session";
import { opportunityStore } from "@/lib/opportunity-discovery-store";
import { OpportunityWorkspace } from "@/components/dashboard/opportunities/opportunity-workspace";
import { researchStatuses, outreachStatuses } from "@/lib/opportunity-discovery";

export const metadata: Metadata = { title: "Opportunity Discovery | Yorkstead", robots: { index: false, follow: false, noarchive: true } };

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function OpportunityDiscoveryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!await getOwnerSession(await headers())) redirect("/login?next=/dashboard/opportunities");
  const query = await searchParams;
  const id = first(query.id) ?? "";
  const selectedStatus = first(query.status) ?? "";
  const selectedOutreach = first(query.outreach) ?? "";
  const selectedIndustry = first(query.industry) ?? "";
  const page = Math.max(1, Number(first(query.page) ?? 1) || 1);
  let data: Awaited<ReturnType<typeof opportunityStore.list>> | null = null;
  let selected: Awaited<ReturnType<typeof opportunityStore.get>> = null;
  let reports: Awaited<ReturnType<typeof opportunityStore.reports>> | null = null;
  let duplicates: Awaited<ReturnType<typeof opportunityStore.duplicateLeads>> = [];
  let consultations: Awaited<ReturnType<typeof opportunityStore.consultations>> = [];
  let unavailable = false;
  try {
    [data,reports,consultations] = await Promise.all([
      opportunityStore.list({ query: first(query.q), researchStatus: researchStatuses.includes(selectedStatus as typeof researchStatuses[number]) ? selectedStatus as typeof researchStatuses[number] : undefined, outreachStatus: outreachStatuses.includes(selectedOutreach as typeof outreachStatuses[number]) ? selectedOutreach as typeof outreachStatuses[number] : undefined, industry: selectedIndustry || undefined, page }),
      opportunityStore.reports(),
      opportunityStore.consultations(),
    ]);
    if (id) {
      selected = await opportunityStore.get(id);
      if (selected && selected.crmLeadId === null) duplicates = await opportunityStore.duplicateLeads(selected.businessName);
    }
  } catch (error) {
    unavailable = true;
    console.error("Opportunity workspace unavailable", error instanceof Error ? error.message : "unknown error");
  }
  const industries = data?.opportunities.map((item) => item.industry).filter((value, index, all) => all.indexOf(value) === index).sort() ?? [];
  return <OpportunityWorkspace opportunities={data?.opportunities ?? []} pagination={data?.pagination ?? null} reports={reports} selected={selected} duplicates={duplicates} consultations={consultations} industries={industries} filters={{ query: first(query.q) ?? "", status: selectedStatus, outreach: selectedOutreach, industry: selectedIndustry }} unavailable={unavailable} />;
}
