CREATE TABLE IF NOT EXISTS customer_enrollment_challenges (
  id UUID PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES customer_invitations(id),
  proof_verifier TEXT NOT NULL CHECK (proof_verifier ~ '^[a-f0-9]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '10 minutes')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_enrollment_invitation_idx ON customer_enrollment_challenges(invitation_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS customer_enrollment_limits (
  bucket TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  attempts INTEGER NOT NULL CHECK (attempts > 0)
);
