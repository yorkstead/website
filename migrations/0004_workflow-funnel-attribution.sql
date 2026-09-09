ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS phone TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS description TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS problem_areas TEXT[];
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS source TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS medium TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS campaign TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS content TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS term TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS landing_page TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS referrer TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS utm_source TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS utm_medium TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS utm_content TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS utm_term TEXT;
--> statement-breakpoint
ALTER TABLE contact_inquiries ADD COLUMN IF NOT EXISTS qualification_status TEXT NOT NULL DEFAULT 'new';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS contact_inquiries_qualification_status_idx ON contact_inquiries (qualification_status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS contact_inquiries_problem_areas_idx ON contact_inquiries USING GIN (problem_areas);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS contact_inquiries_utm_campaign_idx ON contact_inquiries (utm_campaign);
