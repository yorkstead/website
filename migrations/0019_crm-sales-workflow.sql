ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS industry TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS pain TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS company_size TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS decision_maker TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS budget_indication TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS next_step TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS won_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS lost_reason TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS crm_proposals (
  id TEXT PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  engagement_type TEXT NOT NULL CHECK (engagement_type IN ('audit', 'sprint', 'system', 'custom')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000000),
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'sent', 'accepted', 'declined')),
  sent_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  next_action TEXT NOT NULL DEFAULT '',
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS crm_proposals_lead_updated_idx ON crm_proposals (lead_id, updated_at DESC, id DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS crm_proposals_pipeline_state_idx ON crm_proposals (state, lead_id);
