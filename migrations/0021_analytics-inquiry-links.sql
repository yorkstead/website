ALTER TABLE conversion_events
  ADD COLUMN IF NOT EXISTS contact_inquiry_id BIGINT REFERENCES contact_inquiries(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversion_events_inquiry_created_at_idx
  ON conversion_events (contact_inquiry_id, created_at DESC)
  WHERE contact_inquiry_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS conversion_events_inquiry_outcome_idx
  ON conversion_events (contact_inquiry_id, event_name)
  WHERE contact_inquiry_id IS NOT NULL
    AND event_name IN ('contact_form_submission', 'workflow_audit_submission_success', 'lead', 'qualified_lead');
