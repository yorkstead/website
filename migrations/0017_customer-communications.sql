ALTER TABLE portal_release_reviews DROP CONSTRAINT portal_release_reviews_schema_version_check;
--> statement-breakpoint
ALTER TABLE portal_release_reviews ADD CONSTRAINT portal_release_reviews_schema_version_check CHECK (schema_version IN ('0016','0017'));
--> statement-breakpoint
CREATE TABLE customer_recovery_challenges (
 id UUID PRIMARY KEY,
 tenant_id TEXT NOT NULL REFERENCES customer_tenants(id),
 identity_id TEXT NOT NULL REFERENCES customer_identities(id),
 verifier TEXT NOT NULL CHECK (verifier ~ '^[a-f0-9]{64}$'),
 expires_at TIMESTAMPTZ NOT NULL,
 consumed_at TIMESTAMPTZ,
 revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(id,tenant_id,identity_id),
 FOREIGN KEY(tenant_id,identity_id) REFERENCES customer_tenant_memberships(tenant_id,identity_id),
 CHECK (expires_at>created_at AND expires_at<=created_at+interval '10 minutes')
);
--> statement-breakpoint
CREATE TABLE customer_mail_jobs (
 id UUID PRIMARY KEY,
 deduplication_key TEXT NOT NULL UNIQUE CHECK (deduplication_key ~ '^[a-f0-9]{64}$'),
 type TEXT NOT NULL CHECK (type IN ('invitation','email_proof','account_recovery','security_notification')),
 tenant_id TEXT NOT NULL REFERENCES customer_tenants(id),
 identity_id TEXT REFERENCES customer_identities(id),
 invitation_id UUID REFERENCES customer_invitations(id),
 proof_id UUID REFERENCES customer_enrollment_challenges(id),
 recovery_id UUID REFERENCES customer_recovery_challenges(id),
 recipient TEXT NOT NULL CHECK (length(recipient)<=254 AND recipient=lower(btrim(recipient)) AND recipient !~ '[\r\n]'),
 sender TEXT NOT NULL CHECK (length(sender)<=254 AND sender=lower(btrim(sender)) AND sender !~ '[\r\n]'),
 origin TEXT NOT NULL CHECK (origin ~ '^https://[^/?#@]+$'),
 template_version INTEGER NOT NULL DEFAULT 1 CHECK (template_version=1),
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','leased','accepted','failed','canceled')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 lease_token UUID,
 lease_until TIMESTAMPTZ,
 provider TEXT CHECK (provider IN ('fake','resend')),
 provider_id TEXT,
 failure TEXT CHECK (failure IN ('timeout','network','rate_limit','rejected','configuration','disabled','ineligible','custody','exhausted')),
 delivery TEXT NOT NULL DEFAULT 'unknown' CHECK (delivery IN ('unknown','accepted','delayed','delivered','failed','bounced','complained')),
 FOREIGN KEY(invitation_id,tenant_id) REFERENCES customer_invitations(id,tenant_id),
 FOREIGN KEY(tenant_id,identity_id) REFERENCES customer_tenant_memberships(tenant_id,identity_id),
 FOREIGN KEY(recovery_id,tenant_id,identity_id) REFERENCES customer_recovery_challenges(id,tenant_id,identity_id),
 CHECK ((state='leased')=(lease_token IS NOT NULL AND lease_until IS NOT NULL)),
 CHECK ((type='invitation' AND invitation_id IS NOT NULL AND proof_id IS NULL AND recovery_id IS NULL) OR
 (type='email_proof' AND invitation_id IS NOT NULL AND proof_id IS NOT NULL AND recovery_id IS NULL) OR
 (type='account_recovery' AND identity_id IS NOT NULL AND recovery_id IS NOT NULL AND invitation_id IS NULL AND proof_id IS NULL) OR
 (type='security_notification' AND identity_id IS NOT NULL AND invitation_id IS NULL AND proof_id IS NULL AND recovery_id IS NULL)),
 CHECK (expires_at>created_at AND expires_at<=created_at+interval '10 minutes')
);
--> statement-breakpoint
CREATE INDEX customer_mail_claim ON customer_mail_jobs(next_attempt_at,id) WHERE state IN ('queued','leased');
--> statement-breakpoint
CREATE UNIQUE INDEX customer_mail_provider_id ON customer_mail_jobs(provider,provider_id) WHERE provider_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE customer_mail_custody (
 job_id UUID PRIMARY KEY REFERENCES customer_mail_jobs(id),
 key_id TEXT NOT NULL CHECK (key_id ~ '^[a-z0-9-]{1,40}$'),
 nonce TEXT NOT NULL CHECK (length(nonce)=16),
 ciphertext TEXT NOT NULL CHECK (length(ciphertext)=60),
 tag TEXT NOT NULL CHECK (length(tag)=24),
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 CHECK (expires_at>created_at AND expires_at<=created_at+interval '10 minutes')
);
--> statement-breakpoint
REVOKE ALL ON customer_mail_custody FROM PUBLIC;
--> statement-breakpoint
CREATE TABLE customer_mail_suppressions (
 recipient_digest TEXT PRIMARY KEY CHECK (recipient_digest ~ '^[a-f0-9]{64}$'),
 reason TEXT NOT NULL CHECK (reason IN ('bounced','complained')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE TABLE customer_mail_events (
 id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 200),
 job_id UUID NOT NULL REFERENCES customer_mail_jobs(id),
 event TEXT NOT NULL CHECK (event IN ('accepted','delayed','delivered','failed','bounced','complained')),
 provider_created_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE TABLE customer_mail_audit (
 id BIGSERIAL PRIMARY KEY,
 job_id UUID REFERENCES customer_mail_jobs(id),
 event TEXT NOT NULL CHECK (event IN ('queued','claimed','retried','accepted','failed','canceled','webhook','recovery_completed','recovery_requested')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE FUNCTION customer_mail_intent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Mail history retained' USING ERRCODE='23514'; END IF;
 IF ROW(NEW.id,NEW.deduplication_key,NEW.type,NEW.tenant_id,NEW.identity_id,NEW.invitation_id,NEW.proof_id,NEW.recovery_id,NEW.recipient,NEW.sender,NEW.origin,NEW.template_version,NEW.expires_at,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.deduplication_key,OLD.type,OLD.tenant_id,OLD.identity_id,OLD.invitation_id,OLD.proof_id,OLD.recovery_id,OLD.recipient,OLD.sender,OLD.origin,OLD.template_version,OLD.expires_at,OLD.created_at)
 THEN RAISE EXCEPTION 'Mail intent immutable' USING ERRCODE='23514'; END IF;
 IF (OLD.state IN ('accepted','failed','canceled') AND NEW.state<>OLD.state) OR NEW.attempts<OLD.attempts THEN RAISE EXCEPTION 'Invalid mail transition' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER customer_mail_intent_guard BEFORE UPDATE OR DELETE ON customer_mail_jobs FOR EACH ROW EXECUTE FUNCTION customer_mail_intent_guard();
--> statement-breakpoint
CREATE TRIGGER customer_mail_intent_truncate BEFORE TRUNCATE ON customer_mail_jobs FOR EACH STATEMENT EXECUTE FUNCTION customer_mail_intent_guard();
--> statement-breakpoint
CREATE FUNCTION customer_mail_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Mail history append only' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER customer_mail_events_guard BEFORE UPDATE OR DELETE ON customer_mail_events FOR EACH ROW EXECUTE FUNCTION customer_mail_history_guard();
--> statement-breakpoint
CREATE TRIGGER customer_mail_events_truncate BEFORE TRUNCATE ON customer_mail_events FOR EACH STATEMENT EXECUTE FUNCTION customer_mail_history_guard();
--> statement-breakpoint
CREATE TRIGGER customer_mail_audit_guard BEFORE UPDATE OR DELETE ON customer_mail_audit FOR EACH ROW EXECUTE FUNCTION customer_mail_history_guard();
--> statement-breakpoint
CREATE TRIGGER customer_mail_audit_truncate BEFORE TRUNCATE ON customer_mail_audit FOR EACH STATEMENT EXECUTE FUNCTION customer_mail_history_guard();
