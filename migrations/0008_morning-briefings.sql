CREATE TABLE IF NOT EXISTS morning_briefings (
  briefing_date DATE PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'generating',
  spoken_text TEXT,
  word_count INTEGER,
  source_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_code TEXT
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'morning_briefings_status_check' AND conrelid = 'morning_briefings'::regclass) THEN
    ALTER TABLE morning_briefings ADD CONSTRAINT morning_briefings_status_check CHECK (status IN ('generating', 'ready', 'failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'morning_briefings_ready_content_check' AND conrelid = 'morning_briefings'::regclass) THEN
    ALTER TABLE morning_briefings ADD CONSTRAINT morning_briefings_ready_content_check CHECK (
      status <> 'ready' OR (
        spoken_text IS NOT NULL AND btrim(spoken_text) <> '' AND
        word_count IS NOT NULL AND word_count BETWEEN 1 AND 1800 AND
        generated_at IS NOT NULL
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'morning_briefings_source_status_object_check' AND conrelid = 'morning_briefings'::regclass) THEN
    ALTER TABLE morning_briefings ADD CONSTRAINT morning_briefings_source_status_object_check CHECK (jsonb_typeof(source_status) = 'object');
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS morning_briefings_ready_generated_at_idx ON morning_briefings (generated_at DESC) WHERE status = 'ready';
