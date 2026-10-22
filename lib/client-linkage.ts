export type WebsiteInquiryLink = {
  id: number;
  label: string;
  status: string;
  href: string;
};

export type CrmOpportunityCandidate = {
  opportunity_id: string;
  company: string;
  title: string;
  stage: string;
};

export type CrmOpportunityLink = {
  opportunityId: string;
  company: string;
  title: string;
  stage: string;
  href: string;
};

export type CrmLinkageStatus = "linked" | "no_match" | "ambiguous" | "unavailable" | "not_linked";

function normalizedLabel(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function findExactCrmOpportunity(
  lead: { name: string; company: string | null },
  candidates: CrmOpportunityCandidate[],
): { status: "linked"; opportunity: CrmOpportunityLink } | { status: "no_match" | "ambiguous" } {
  const company = lead.company?.trim();
  if (!company) return { status: "no_match" };
  const normalizedCompany = normalizedLabel(company);
  const matches = candidates.filter((candidate) => normalizedLabel(candidate.company) === normalizedCompany);
  if (matches.length === 0) return { status: "no_match" };
  if (matches.length > 1) return { status: "ambiguous" };
  const match = matches[0];
  return {
    status: "linked",
    opportunity: {
      opportunityId: match.opportunity_id,
      company: match.company,
      title: match.title,
      stage: match.stage,
      href: "https://cal.yorkstead.com/crm/pipeline",
    },
  };
}
