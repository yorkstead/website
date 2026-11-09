import { contactDatabase } from "@/lib/contact-inquiries";
import { getMarketingWorkspace } from "@/lib/marketing-storage";
import { opportunityStore } from "@/lib/opportunity-discovery-store";

export type OverlapRecord = { source: "Marketing" | "Discovery" | "CRM"; id: string; company: string; email: string; href: string; crmLeadId: number | null };
export type OverlapCandidate = { records: OverlapRecord[]; signal: "email" | "company only" };
export const MAX_QUERY_LENGTH = 80;
export const MAX_SOURCE_RECORDS = 50;
const ignoredNames = new Set(["unknown", "test", "none", "business", "company", "prospect"]);

export function parseOverlapQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");
  return query.length >= 3 && query.length <= MAX_QUERY_LENGTH ? query : null;
}

export function companyKey(value: string): string | null {
  const key = value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
  return key.length >= 5 && !ignoredNames.has(key) ? key : null;
}

export function findOverlapCandidates(records: OverlapRecord[]): OverlapCandidate[] {
  const bounded = records.slice(0, MAX_SOURCE_RECORDS * 3);
  const groups = new Map<string, OverlapRecord[]>();
  for (const record of bounded) {
    const key = companyKey(record.company);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.values()].filter((group) => new Set(group.map((record) => record.source)).size > 1).map((group) => {
    const emails = new Map<string, Set<string>>();
    for (const record of group) {
      const email = record.email.trim().toLowerCase();
      if (!email) continue;
      emails.set(email, (emails.get(email) ?? new Set()).add(record.source));
    }
    return { records: group, signal: [...emails.values()].some((sources) => sources.size > 1) ? "email" as const : "company only" as const };
  }).slice(0, MAX_SOURCE_RECORDS);
}

type OverlapSources = {
  marketing: typeof getMarketingWorkspace;
  discovery: typeof opportunityStore.list;
  crm: (pattern: string) => Promise<Array<{ id: number; name: string; company: string | null; email: string }>>;
};

const defaultSources: OverlapSources = {
  marketing: getMarketingWorkspace,
  discovery: (options) => opportunityStore.list(options),
  crm: async (pattern) => {
    const sql = await contactDatabase();
    const rows = await sql.query(`SELECT i.id,i.name,i.company,i.email FROM contact_inquiries i
      WHERE NOT EXISTS(SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)
      AND (i.company ILIKE $1 ESCAPE '\\' OR i.name ILIKE $1 ESCAPE '\\' OR i.email ILIKE $1 ESCAPE '\\')
      ORDER BY i.updated_at DESC,i.id DESC LIMIT 51`, [pattern]);
    return rows.map((row) => ({ id: Number(row.id), name: String(row.name ?? ""), company: row.company === null ? null : String(row.company ?? ""), email: String(row.email ?? "") }));
  },
};

export async function loadOverlapReview(query: string, sources: OverlapSources = defaultSources) {
  const parsed = parseOverlapQuery(query);
  if (!parsed) throw new Error("Search must be 3–80 characters.");
  const escaped = parsed.replace(/[\\%_]/g, "\\$&");
  const [marketing, discovery, crm] = await Promise.all([
    sources.marketing(),
    sources.discovery({ query: parsed, page: 1 }),
    sources.crm(`%${escaped}%`),
  ]);
  const marketingMatches = marketing.workspace.prospects.filter((item) => [item.company, item.contactName, item.email].some((field) => field.toLowerCase().includes(parsed.toLowerCase())));
  const records: OverlapRecord[] = [
    ...marketingMatches.slice(0, MAX_SOURCE_RECORDS).map((item) => ({ source: "Marketing" as const, id: item.id, company: item.company, email: item.email, href: "/dashboard/marketing", crmLeadId: item.crmLeadId })),
    ...discovery.opportunities.slice(0, MAX_SOURCE_RECORDS).map((item) => ({ source: "Discovery" as const, id: item.id, company: item.businessName, email: "", href: `/dashboard/opportunities?id=${encodeURIComponent(item.id)}`, crmLeadId: item.crmLeadId })),
    ...crm.slice(0, MAX_SOURCE_RECORDS).map((item) => ({ source: "CRM" as const, id: String(item.id), company: String(item.company ?? ""), email: String(item.email ?? ""), href: `/dashboard/leads?lead=${Number(item.id)}`, crmLeadId: Number(item.id) })),
  ];
  return { candidates: findOverlapCandidates(records), limited: marketingMatches.length > MAX_SOURCE_RECORDS || discovery.pagination.hasNext || crm.length > MAX_SOURCE_RECORDS };
}

export async function loadOwnerOverlapReview(authorized: boolean, query: string | null, read = loadOverlapReview) {
  if (!authorized || !query) return null;
  return read(query);
}
