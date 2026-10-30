CREATE TABLE IF NOT EXISTS research_opportunities (
  id UUID PRIMARY KEY,
  business_name TEXT NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 200),
  industry TEXT NOT NULL CHECK (char_length(industry) BETWEEN 1 AND 100),
  geographic_market TEXT NOT NULL DEFAULT '' CHECK (char_length(geographic_market) <= 200),
  workflow TEXT NOT NULL DEFAULT '' CHECK (char_length(workflow) <= 300),
  suspected_problem TEXT NOT NULL DEFAULT '' CHECK (char_length(suspected_problem) <= 5000),
  observed_on DATE,
  last_verified_on DATE,
  evidence_confidence TEXT NOT NULL DEFAULT 'unknown' CHECK (evidence_confidence IN ('unknown','low','medium','high')),
  current_workaround TEXT NOT NULL DEFAULT '' CHECK (char_length(current_workaround) <= 3000),
  likely_frequency TEXT NOT NULL DEFAULT '' CHECK (char_length(likely_frequency) <= 500),
  likely_severity TEXT NOT NULL DEFAULT '' CHECK (char_length(likely_severity) <= 500),
  operational_impact TEXT NOT NULL DEFAULT '' CHECK (char_length(operational_impact) <= 3000),
  potential_software_approach TEXT NOT NULL DEFAULT '' CHECK (char_length(potential_software_approach) <= 2000),
  open_questions TEXT NOT NULL DEFAULT '' CHECK (char_length(open_questions) <= 3000),
  research_status TEXT NOT NULL DEFAULT 'hypothesis' CHECK (research_status IN ('hypothesis','researching','interview_scheduled','validated','qualified','archived')),
  outreach_status TEXT NOT NULL DEFAULT 'research_only' CHECK (outreach_status IN ('research_only','preparing','permission_requested','permission_granted','declined')),
  commercial_permission_at TIMESTAMPTZ,
  next_action TEXT NOT NULL DEFAULT '' CHECK (char_length(next_action) <= 1000),
  next_action_at DATE,
  qualification JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(qualification) = 'object'),
  manual_priority SMALLINT CHECK (manual_priority BETWEEN 1 AND 5),
  manual_priority_reason TEXT NOT NULL DEFAULT '' CHECK (char_length(manual_priority_reason) <= 500),
  crm_lead_id BIGINT UNIQUE REFERENCES contact_inquiries(id) ON DELETE RESTRICT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (last_verified_on IS NULL OR observed_on IS NULL OR last_verified_on >= observed_on),
  CHECK ((outreach_status = 'permission_granted') = (commercial_permission_at IS NOT NULL)),
  CHECK ((research_status = 'archived') = (archived_at IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS opportunity_evidence (
  id UUID PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES research_opportunities(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('verified_fact','business_statement','research_inference','hypothesis')),
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 4000),
  source_reference TEXT NOT NULL CHECK (char_length(source_reference) BETWEEN 1 AND 1000),
  observed_on DATE NOT NULL,
  owner_note TEXT NOT NULL DEFAULT '' CHECK (char_length(owner_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS opportunity_interviews (
  id UUID PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES research_opportunities(id) ON DELETE CASCADE,
  consultation_id TEXT UNIQUE REFERENCES consultations(id) ON DELETE SET NULL,
  participant_role TEXT NOT NULL DEFAULT '' CHECK (char_length(participant_role) <= 160),
  interview_on DATE NOT NULL,
  interview_status TEXT NOT NULL DEFAULT 'completed' CHECK (interview_status IN ('scheduled','completed')),
  notes JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(notes) = 'object'),
  commercial_permission TEXT NOT NULL DEFAULT 'not_asked' CHECK (commercial_permission IN ('not_asked','research_only','granted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS opportunity_history (
  id BIGSERIAL PRIMARY KEY,
  -- Deliberately retained after an owner erases archived research; contains no research text.
  opportunity_id UUID NOT NULL,
  actor_id TEXT NOT NULL CHECK (char_length(actor_id) BETWEEN 1 AND 255),
  event_type TEXT NOT NULL CHECK (event_type IN ('created','updated','evidence_added','interview_added','interview_updated','status_changed','permission_changed','priority_changed','crm_linked','crm_created','archived','restored','erased')),
  from_value TEXT,
  to_value TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS research_opportunities_status_industry_updated_idx ON research_opportunities (research_status, industry, updated_at DESC, id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS research_opportunities_next_action_idx ON research_opportunities (next_action_at, updated_at) WHERE archived_at IS NULL AND next_action_at IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS research_opportunities_crm_lead_idx ON research_opportunities (crm_lead_id) WHERE crm_lead_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS opportunity_evidence_opportunity_date_idx ON opportunity_evidence (opportunity_id, observed_on DESC, id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS opportunity_interviews_opportunity_date_idx ON opportunity_interviews (opportunity_id, interview_on DESC, id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS opportunity_history_opportunity_created_idx ON opportunity_history (opportunity_id, created_at DESC, id DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS opportunity_history_created_idx ON opportunity_history (created_at DESC, id DESC);
