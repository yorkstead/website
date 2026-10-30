CREATE TABLE system_directory_entries (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'yorkstead-owner' CHECK (tenant_id = 'yorkstead-owner'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120 AND name = btrim(name)),
  category TEXT NOT NULL CHECK (category IN ('hosting','database','development','productivity','payments','communications','analytics','automation','security','infrastructure','other')),
  provider TEXT NOT NULL CHECK (length(provider) BETWEEN 1 AND 80 AND provider = btrim(provider)),
  purpose TEXT NOT NULL DEFAULT '' CHECK (length(purpose) <= 1000),
  dashboard_url TEXT CHECK (dashboard_url IS NULL OR (length(dashboard_url) <= 2048 AND dashboard_url LIKE 'https://%')),
  documentation_url TEXT CHECK (documentation_url IS NULL OR (length(documentation_url) <= 2048 AND documentation_url LIKE 'https://%')),
  account_identity TEXT NOT NULL DEFAULT '' CHECK (length(account_identity) <= 320),
  billing_entity TEXT NOT NULL DEFAULT '' CHECK (length(billing_entity) <= 160),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  relationships JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(relationships) = 'array' AND jsonb_array_length(relationships) <= 40),
  billing_cadence TEXT NOT NULL DEFAULT 'unknown' CHECK (billing_cadence IN ('monthly','annual','quarterly','weekly','usage_based','free','promotional','unknown')),
  currency CHAR(3) NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  amount NUMERIC(12,2) CHECK (amount IS NULL OR amount >= 0),
  amount_basis TEXT NOT NULL DEFAULT 'unknown' CHECK (amount_basis IN ('actual','estimated','unknown')),
  cost_confirmation TEXT NOT NULL DEFAULT 'unverified' CHECK (cost_confirmation IN ('confirmed','unverified')),
  renewal_date DATE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  manual_health TEXT NOT NULL DEFAULT 'not_monitored' CHECK (manual_health IN ('healthy','degraded','down','unknown','not_monitored')),
  manual_health_summary TEXT NOT NULL DEFAULT '' CHECK (length(manual_health_summary) <= 500),
  manual_health_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((manual_health = 'not_monitored' AND manual_health_checked_at IS NULL) OR (manual_health <> 'not_monitored' AND manual_health_checked_at IS NOT NULL)),
  CHECK (billing_cadence NOT IN ('free','unknown') OR amount IS NULL OR amount = 0),
  CHECK (amount_basis <> 'unknown' OR amount IS NULL),
  CHECK (amount IS NOT NULL OR cost_confirmation = 'unverified')
);
--> statement-breakpoint
CREATE UNIQUE INDEX system_directory_entries_name_provider_key ON system_directory_entries(tenant_id,lower(name),lower(provider));
--> statement-breakpoint
CREATE INDEX system_directory_entries_scope_idx ON system_directory_entries(tenant_id, archived_at, pinned DESC, lower(name));
--> statement-breakpoint
CREATE TABLE system_directory_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (tenant_id = 'yorkstead-owner'),
  entry_id UUID NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  action TEXT NOT NULL CHECK (action IN ('created','updated','archived','restored')),
  actor_id TEXT NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 255),
  before_state JSONB,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE INDEX system_directory_audit_scope_idx ON system_directory_audit(tenant_id, entry_id, id DESC);
--> statement-breakpoint
CREATE FUNCTION system_directory_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.revision := 1;
  ELSE NEW.revision := OLD.revision + 1; END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_revision BEFORE INSERT OR UPDATE ON system_directory_entries FOR EACH ROW EXECUTE FUNCTION system_directory_revision();
--> statement-breakpoint
CREATE FUNCTION system_directory_write_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actor TEXT := nullif(current_setting('yorkstead.system_directory_actor', true), '');
  before_value JSONB;
  after_value JSONB := to_jsonb(NEW) - 'tenant_id';
  action_name TEXT;
BEGIN
  IF actor IS NULL OR length(actor) > 255 THEN RAISE EXCEPTION 'Owner audit context required' USING ERRCODE='42501'; END IF;
  IF TG_OP = 'UPDATE' THEN
    before_value := to_jsonb(OLD) - 'tenant_id';
    IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN action_name := 'archived';
    ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN action_name := 'restored';
    ELSE action_name := 'updated'; END IF;
  ELSE action_name := 'created'; END IF;
  INSERT INTO system_directory_audit(tenant_id,entry_id,revision,action,actor_id,before_state,after_state)
    VALUES(NEW.tenant_id,NEW.id,NEW.revision,action_name,actor,before_value,after_value);
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_audit_entry AFTER INSERT OR UPDATE ON system_directory_entries FOR EACH ROW EXECUTE FUNCTION system_directory_write_audit();
--> statement-breakpoint
CREATE FUNCTION system_directory_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'System directory audit history is immutable' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE TRIGGER system_directory_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON system_directory_audit FOR EACH STATEMENT EXECUTE FUNCTION system_directory_audit_immutable();
--> statement-breakpoint
REVOKE ALL ON system_directory_entries, system_directory_audit FROM PUBLIC;
