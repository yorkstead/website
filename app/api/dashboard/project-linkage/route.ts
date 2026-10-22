import { NextResponse } from "next/server";
import { contactDatabase } from "@/lib/contact-inquiries";
import { findExactCrmOpportunity, type CrmOpportunityCandidate } from "@/lib/client-linkage";
import { requireOwner } from "@/lib/owner-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

function crmCandidates(value: unknown): CrmOpportunityCandidate[] {
  if (!value || typeof value !== "object" || !("opportunities" in value)) return [];
  const opportunities = (value as { opportunities?: unknown }).opportunities;
  if (!Array.isArray(opportunities)) return [];
  return opportunities.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.opportunity_id !== "string" || typeof record.company !== "string" || typeof record.title !== "string" || typeof record.stage !== "string") return [];
    return [{
      opportunity_id: record.opportunity_id.slice(0, 100),
      company: record.company.slice(0, 300),
      title: record.title.slice(0, 300),
      stage: record.stage.slice(0, 100),
    }];
  }).slice(0, 500);
}

export async function GET(request: Request) {
  const unauthorized = await requireOwner(request.headers);
  if (unauthorized) return unauthorized;

  const projectId = new URL(request.url).searchParams.get("projectId")?.trim();
  if (!projectId || projectId.length > 80) {
    return NextResponse.json({ error: "Invalid project" }, { status: 400, headers: responseHeaders });
  }

  try {
    const sql = await contactDatabase();
    const rows = await sql`
      SELECT id, name, company, status
      FROM contact_inquiries
      WHERE converted_project_id = ${projectId}
      ORDER BY id ASC
      LIMIT 2
    `;
    if (rows.length > 1) {
      return NextResponse.json({ error: "Multiple website inquiries reference this project" }, { status: 409, headers: responseHeaders });
    }
    if (!rows.length) {
      return NextResponse.json({ websiteInquiry: null, crmOpportunity: null, crmStatus: "not_linked" }, { headers: responseHeaders });
    }

    const lead = {
      id: Number(rows[0].id),
      name: String(rows[0].name || ""),
      company: rows[0].company ? String(rows[0].company) : null,
      status: String(rows[0].status || ""),
    };
    const websiteInquiry = {
      id: lead.id,
      label: lead.company || lead.name || `Website inquiry #${lead.id}`,
      status: lead.status,
      href: "/dashboard/leads",
    };

    const secret = process.env.YORKSTEAD_DASHBOARD_BRIDGE_SECRET;
    if (!secret || secret.length < 32) {
      return NextResponse.json({ websiteInquiry, crmOpportunity: null, crmStatus: "unavailable" }, { headers: responseHeaders });
    }

    try {
      const response = await fetch("https://cal.yorkstead.com/api/integrations/website-summary", {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error("CRM unavailable");
      const linkage = findExactCrmOpportunity(lead, crmCandidates(await response.json()));
      return NextResponse.json({
        websiteInquiry,
        crmOpportunity: linkage.status === "linked" ? linkage.opportunity : null,
        crmStatus: linkage.status,
      }, { headers: responseHeaders });
    } catch {
      return NextResponse.json({ websiteInquiry, crmOpportunity: null, crmStatus: "unavailable" }, { headers: responseHeaders });
    }
  } catch (error) {
    console.error("Client project linkage read failed", error);
    return NextResponse.json({ error: "Client linkage is unavailable" }, { status: 503, headers: responseHeaders });
  }
}
