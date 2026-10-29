import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ConsultationWorkspace } from "@/components/consultation-workspace";
import { getContactInquiry } from "@/lib/contact-inquiries";
import { CONSULTATION_PAGE_SIZE, getLeadConsultation, listConsultationsPage } from "@/lib/consultations";
import { getOwnerSession } from "@/lib/owner-session";
import { createPagination, parseRequestedPage } from "@/lib/pagination";

export default async function ConsultationsPage({ searchParams }: { searchParams: Promise<{ lead?: string | string[]; consultation?: string | string[]; page?: string | string[] }> }) {
  const session = await getOwnerSession(await headers());
  if (!session) redirect("/login?next=/dashboard/consultations");
  const requested = await searchParams;
  const leadId = Number(Array.isArray(requested.lead) ? requested.lead[0] : requested.lead);
  const consultationId = Array.isArray(requested.consultation) ? requested.consultation[0] : requested.consultation;
  const page = parseRequestedPage(requested.page);
  const [initialLead, initialConsultation, consultationResult] = await Promise.all([
    Number.isSafeInteger(leadId) && leadId > 0 ? getContactInquiry(leadId).catch(() => null) : Promise.resolve(null),
    consultationId ? getLeadConsultation(leadId, consultationId) : Promise.resolve(null),
    listConsultationsPage(page)
      .then((result) => ({ ...result, available: true }))
      .catch((error) => { console.error("Consultation list unavailable", error); return { records: [], activeTotal: 0, pagination: createPagination(0, page, CONSULTATION_PAGE_SIZE), available: false }; }),
  ]);
  return <ConsultationWorkspace key={`consultations-${consultationResult.pagination.page}-${consultationId ?? ""}`} initialConsultations={consultationResult.records} initialActiveTotal={consultationResult.activeTotal} initialLead={consultationId ? null : initialLead} initialConsultation={initialConsultation} pagination={consultationResult.pagination} storageAvailable={consultationResult.available} />;
}
