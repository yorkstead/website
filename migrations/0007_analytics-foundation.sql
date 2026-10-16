ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS event_id TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS session_hash TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS landing_page TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS referrer_host TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS utm_source TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS utm_medium TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS utm_content TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS utm_term TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS device_type TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS country_code TEXT;
--> statement-breakpoint
ALTER TABLE conversion_events ADD COLUMN IF NOT EXISTS region_code TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS conversion_events_event_id_idx ON conversion_events (event_id) WHERE event_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversion_events_session_created_at_idx ON conversion_events (session_hash, created_at DESC) WHERE session_hash IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversion_events_name_created_at_idx ON conversion_events (event_name, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversion_events_campaign_created_at_idx ON conversion_events (utm_campaign, created_at DESC) WHERE utm_campaign IS NOT NULL;
--> statement-breakpoint
ALTER TABLE conversion_events DROP CONSTRAINT IF EXISTS conversion_events_name_check;
--> statement-breakpoint
ALTER TABLE conversion_events ADD CONSTRAINT conversion_events_name_check CHECK (event_name IN ('service_page_view', 'case_study_view', 'page_view', 'view_content', 'demo_view', 'lead', 'schedule_start', 'schedule_complete', 'qualified_lead', 'workflow_audit_cta_click', 'contact_form_start', 'contact_form_submission', 'email_link_click', 'phone_link_click', 'external_booking_link_click', 'workflow_audit_view', 'workflow_audit_form_start', 'workflow_audit_validation_error', 'workflow_audit_submission_success', 'workflow_audit_booking_click', 'workflow_rescue_check_start', 'workflow_rescue_check_complete', 'card_scan', 'contact_save_click', 'web_vital', 'client_error', 'server_error'));
