ALTER TABLE system_directory_entries
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (verification_status IN ('verified','unverified','stale','unknown','unavailable')),
  ADD COLUMN verification_subject TEXT,
  ADD COLUMN verification_method TEXT
    CHECK (verification_method IS NULL OR verification_method IN ('provider_console','provider_export','invoice','contract','vendor_document','manual_observation','owner_claim')),
  ADD COLUMN verification_reference TEXT
    CHECK (verification_reference IS NULL OR (length(verification_reference) BETWEEN 1 AND 512 AND verification_reference=btrim(verification_reference))),
  ADD COLUMN verification_observed_at TIMESTAMPTZ,
  ADD COLUMN verification_review_due DATE,
  ADD COLUMN verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN monitoring_configuration TEXT NOT NULL DEFAULT 'unknown'
    CHECK (monitoring_configuration IN ('configured','unmonitored','unknown')),
  ADD COLUMN monitoring_outcome TEXT NOT NULL DEFAULT 'unknown'
    CHECK (monitoring_outcome IN ('healthy','degraded','down','unknown','stale','unavailable')),
  ADD COLUMN monitoring_method TEXT
    CHECK (monitoring_method IS NULL OR monitoring_method IN ('provider_console','status_page','manual_observation','local_check')),
  ADD COLUMN monitoring_reference TEXT
    CHECK (monitoring_reference IS NULL OR (length(monitoring_reference) BETWEEN 1 AND 512 AND monitoring_reference=btrim(monitoring_reference))),
  ADD COLUMN monitoring_observed_at TIMESTAMPTZ,
  ADD COLUMN monitoring_review_due DATE,
  ADD COLUMN monitoring_reviewed_at TIMESTAMPTZ,
  ADD COLUMN monitoring_summary TEXT NOT NULL DEFAULT ''
    CHECK (length(monitoring_summary)<=1000),
  ADD CONSTRAINT system_directory_entries_verification_evidence_check CHECK (
    (verification_status='unknown' AND verification_subject IS NULL AND verification_method IS NULL AND verification_reference IS NULL AND verification_observed_at IS NULL AND verification_review_due IS NULL AND verification_reviewed_at IS NULL)
    OR (verification_status IN ('verified','stale') AND verification_subject IS NOT NULL AND length(btrim(verification_subject)) BETWEEN 1 AND 240 AND verification_method IS NOT NULL AND verification_method<>'owner_claim' AND verification_reference IS NOT NULL AND verification_observed_at IS NOT NULL AND verification_reviewed_at IS NOT NULL)
    OR (verification_status IN ('unverified','unavailable') AND verification_subject IS NOT NULL AND length(btrim(verification_subject)) BETWEEN 1 AND 240 AND verification_method IS NOT NULL AND verification_reviewed_at IS NOT NULL)
  ),
  ADD CONSTRAINT system_directory_entries_monitoring_evidence_check CHECK (
    (monitoring_outcome='unknown' AND monitoring_method IS NULL AND monitoring_reference IS NULL AND monitoring_observed_at IS NULL AND monitoring_review_due IS NULL AND monitoring_reviewed_at IS NULL AND monitoring_summary='')
    OR (monitoring_outcome<>'unknown' AND monitoring_method IS NOT NULL AND monitoring_observed_at IS NOT NULL AND monitoring_reviewed_at IS NOT NULL)
  );
--> statement-breakpoint
CREATE UNIQUE INDEX system_directory_entries_billing_class_identity_idx
  ON system_directory_entries(id,tenant_id,entity_class);
--> statement-breakpoint
CREATE TABLE system_directory_billing_evidence (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'yorkstead-owner' CHECK (tenant_id='yorkstead-owner'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0),
  provider_account_id UUID,
  provider_account_entity_class TEXT NOT NULL DEFAULT 'provider_account' CHECK (provider_account_entity_class='provider_account'),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('invoice','contract','provider_export','vendor_document','owner_observation')),
  evidence_reference TEXT NOT NULL CHECK (length(evidence_reference) BETWEEN 1 AND 512 AND evidence_reference=btrim(evidence_reference)),
  observed_at TIMESTAMPTZ NOT NULL,
  period_start DATE,
  period_end DATE,
  amount_basis TEXT NOT NULL CHECK (amount_basis IN ('actual','estimated','unknown')),
  amount NUMERIC(12,2),
  currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  payer_label TEXT CHECK (payer_label IS NULL OR (length(payer_label)<=160 AND payer_label=btrim(payer_label))),
  evidence_status TEXT NOT NULL DEFAULT 'unverified' CHECK (evidence_status IN ('verified','unverified','stale','unknown','unavailable')),
  review_due DATE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((period_start IS NULL AND period_end IS NULL) OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_start<=period_end)),
  CHECK ((amount_basis='unknown' AND amount IS NULL) OR (amount_basis IN ('actual','estimated') AND amount IS NOT NULL AND amount>=0 AND currency IS NOT NULL)),
  CONSTRAINT system_directory_billing_evidence_account_class_fkey FOREIGN KEY(provider_account_id,tenant_id,provider_account_entity_class)
    REFERENCES system_directory_entries(id,tenant_id,entity_class) ON DELETE RESTRICT ON UPDATE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX system_directory_billing_evidence_dedupe_idx
  ON system_directory_billing_evidence(tenant_id,provider_account_id,source_kind,lower(evidence_reference),period_start,period_end,currency) NULLS NOT DISTINCT
  WHERE archived_at IS NULL;
--> statement-breakpoint
CREATE INDEX system_directory_billing_evidence_period_idx
  ON system_directory_billing_evidence(tenant_id,period_start,period_end,evidence_status,amount_basis)
  WHERE archived_at IS NULL;
--> statement-breakpoint
CREATE TABLE system_directory_billing_allocations (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'yorkstead-owner' CHECK (tenant_id='yorkstead-owner'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0),
  evidence_id UUID NOT NULL REFERENCES system_directory_billing_evidence(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL,
  subscription_entity_class TEXT NOT NULL DEFAULT 'subscription' CHECK (subscription_entity_class='subscription'),
  allocated_amount NUMERIC(12,2) CHECK (allocated_amount IS NULL OR allocated_amount>=0),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT system_directory_billing_allocation_subscription_class_fkey FOREIGN KEY(subscription_id,tenant_id,subscription_entity_class)
    REFERENCES system_directory_entries(id,tenant_id,entity_class) ON DELETE RESTRICT ON UPDATE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX system_directory_billing_allocation_unique_idx
  ON system_directory_billing_allocations(tenant_id,evidence_id,subscription_id)
  WHERE archived_at IS NULL;
--> statement-breakpoint
CREATE INDEX system_directory_billing_allocation_subscription_idx
  ON system_directory_billing_allocations(tenant_id,subscription_id,evidence_id)
  WHERE archived_at IS NULL;
--> statement-breakpoint
CREATE TABLE system_directory_billing_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (tenant_id='yorkstead-owner'),
  evidence_id UUID NOT NULL,
  allocation_id UUID,
  revision INTEGER NOT NULL CHECK (revision>0),
  action TEXT NOT NULL CHECK (action IN ('created','updated','archived','restored')),
  actor_id TEXT NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 255),
  before_state JSONB,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (evidence_id IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX system_directory_billing_audit_evidence_idx
  ON system_directory_billing_audit(tenant_id,evidence_id,id DESC)
  WHERE evidence_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX system_directory_billing_audit_allocation_idx
  ON system_directory_billing_audit(tenant_id,allocation_id,id DESC)
  WHERE allocation_id IS NOT NULL;
--> statement-breakpoint
CREATE FUNCTION system_directory_billing_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.revision:=1; ELSE NEW.revision:=OLD.revision+1; END IF;
  NEW.updated_at:=clock_timestamp();
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_evidence_revision
  BEFORE INSERT OR UPDATE ON system_directory_billing_evidence
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_revision();
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_allocation_revision
  BEFORE INSERT OR UPDATE ON system_directory_billing_allocations
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_revision();
--> statement-breakpoint
CREATE FUNCTION system_directory_billing_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM system_directory_entries e WHERE e.id=NEW.provider_account_id AND e.tenant_id=NEW.tenant_id AND e.entity_class='provider_account'
  ) THEN RAISE EXCEPTION 'Billing evidence account must be a provider account' USING ERRCODE='23503'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_identity_guard
  BEFORE INSERT OR UPDATE OF provider_account_id,tenant_id ON system_directory_billing_evidence
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_identity_guard();
--> statement-breakpoint
CREATE FUNCTION system_directory_billing_allocation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_record system_directory_billing_evidence%ROWTYPE;
BEGIN
  SELECT * INTO source_record FROM system_directory_billing_evidence WHERE id=NEW.evidence_id AND tenant_id=NEW.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Billing source not found' USING ERRCODE='23503'; END IF;
  IF NOT EXISTS (SELECT 1 FROM system_directory_entries e WHERE e.id=NEW.subscription_id AND e.tenant_id=NEW.tenant_id AND e.entity_class='subscription') THEN
    RAISE EXCEPTION 'Billing allocation target must be a subscription' USING ERRCODE='23503';
  END IF;
  IF NEW.allocated_amount IS NOT NULL AND source_record.amount IS NULL THEN RAISE EXCEPTION 'Unknown billing amount cannot be allocated numerically' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND (NEW.evidence_id IS DISTINCT FROM OLD.evidence_id OR NEW.subscription_id IS DISTINCT FROM OLD.subscription_id) THEN
    RAISE EXCEPTION 'Billing allocation identity is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_allocation_guard
  BEFORE INSERT OR UPDATE ON system_directory_billing_allocations
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_allocation_guard();
--> statement-breakpoint
CREATE FUNCTION system_directory_billing_entry_class_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_class IS DISTINCT FROM OLD.entity_class AND (
    (OLD.entity_class='provider_account' AND EXISTS (SELECT 1 FROM system_directory_billing_evidence WHERE provider_account_id=OLD.id))
    OR (OLD.entity_class='subscription' AND EXISTS (SELECT 1 FROM system_directory_billing_allocations WHERE subscription_id=OLD.id))
  ) THEN RAISE EXCEPTION 'Billing-linked Registry classifications are immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_entry_class_guard
  BEFORE UPDATE OF entity_class ON system_directory_entries
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_entry_class_guard();
--> statement-breakpoint
CREATE FUNCTION system_directory_billing_audit_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor TEXT:=nullif(current_setting('yorkstead.system_directory_actor',true),''); before_value JSONB; after_value JSONB; action_name TEXT; evidence UUID; allocation UUID;
BEGIN
  IF actor IS NULL OR length(actor)>255 THEN RAISE EXCEPTION 'Owner audit context required' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' THEN
    before_value:=to_jsonb(OLD)-'tenant_id'; after_value:=to_jsonb(NEW)-'tenant_id';
    IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN action_name:='archived'; ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN action_name:='restored'; ELSE action_name:='updated'; END IF;
  ELSE after_value:=to_jsonb(NEW)-'tenant_id'; action_name:='created'; END IF;
  IF TG_TABLE_NAME='system_directory_billing_evidence' THEN evidence:=NEW.id; ELSE evidence:=NEW.evidence_id; allocation:=NEW.id; END IF;
  INSERT INTO system_directory_billing_audit(tenant_id,evidence_id,allocation_id,revision,action,actor_id,before_state,after_state)
    VALUES(NEW.tenant_id,evidence,allocation,NEW.revision,action_name,actor,before_value,after_value);
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_evidence_write_audit
  AFTER INSERT OR UPDATE ON system_directory_billing_evidence
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_audit_write();
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_allocation_write_audit
  AFTER INSERT OR UPDATE ON system_directory_billing_allocations
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_audit_write();
--> statement-breakpoint
CREATE FUNCTION system_directory_billing_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Billing evidence is archived, not deleted' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_evidence_no_delete
  BEFORE DELETE ON system_directory_billing_evidence
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_no_delete();
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_allocation_no_delete
  BEFORE DELETE ON system_directory_billing_allocations
  FOR EACH ROW EXECUTE FUNCTION system_directory_billing_no_delete();
--> statement-breakpoint
CREATE FUNCTION system_directory_billing_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Billing evidence audit is immutable' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_billing_audit_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON system_directory_billing_audit
  FOR EACH STATEMENT EXECUTE FUNCTION system_directory_billing_audit_immutable();
--> statement-breakpoint
REVOKE ALL ON system_directory_billing_evidence,system_directory_billing_allocations,system_directory_billing_audit FROM PUBLIC;
