export const workspaceSnapshotRetentionCount = 30;
export const workspaceSnapshotHistoryCount = 10;
export const archivedInquiryRetentionDays = 365;
export const morningBriefingRetentionDays = 35;

// Keep linked CRM records while their research provenance is retained. The
// research owner can erase an archived opportunity to release the link.
export const archivedInquiryPurgeQuery = `WITH eligible AS (
    SELECT i.id FROM contact_inquiries i
    WHERE NOT EXISTS (SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=i.id)
      AND NOT EXISTS (SELECT 1 FROM research_opportunities o WHERE o.crm_lead_id=i.id)
      AND i.status='archived' AND i.archived_at < $1::timestamptz
    FOR UPDATE OF i SKIP LOCKED
  )
  DELETE FROM contact_inquiries WHERE id IN (SELECT id FROM eligible)
  RETURNING id`;

export function archivedInquiryPurgeBefore(now = new Date()) {
  return new Date(now.getTime() - archivedInquiryRetentionDays * 24 * 60 * 60 * 1000);
}

export function archivedInquiryDeleteAfter(archivedAt: string | Date) {
  const archived = archivedAt instanceof Date ? archivedAt : new Date(archivedAt);
  return new Date(archived.getTime() + archivedInquiryRetentionDays * 24 * 60 * 60 * 1000);
}

export function morningBriefingPurgeBefore(now = new Date()) {
  return new Date(now.getTime() - morningBriefingRetentionDays * 24 * 60 * 60 * 1000);
}
