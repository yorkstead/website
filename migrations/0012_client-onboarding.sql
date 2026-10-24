CREATE TABLE customer_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES customer_tenants(id),
  recipient_email TEXT NOT NULL CHECK (char_length(recipient_email) BETWEEN 3 AND 320 AND recipient_email = lower(btrim(recipient_email)) AND recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  token_verifier TEXT NOT NULL UNIQUE CHECK (token_verifier ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','redeemed','revoked','superseded')),
  issued_by TEXT NOT NULL CHECK (char_length(issued_by) BETWEEN 1 AND 255),
  revoked_by TEXT,
  redeemed_identity_id TEXT REFERENCES customer_identities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_transaction xid8 NOT NULL DEFAULT pg_current_xact_id(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (id, tenant_id),
  FOREIGN KEY (tenant_id, redeemed_identity_id) REFERENCES customer_tenant_memberships(tenant_id, identity_id),
  CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '7 days'),
  CHECK ((status = 'redeemed') = (redeemed_identity_id IS NOT NULL) AND (status = 'redeemed') = (redeemed_at IS NOT NULL)),
  CHECK ((status IN ('revoked','superseded')) = (revoked_by IS NOT NULL) AND (status IN ('revoked','superseded')) = (revoked_at IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX customer_invitations_pending_recipient ON customer_invitations(tenant_id, recipient_email) WHERE status = 'pending';
--> statement-breakpoint
CREATE TABLE customer_invitation_projects (
  invitation_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  PRIMARY KEY (invitation_id, project_id),
  FOREIGN KEY (invitation_id, tenant_id) REFERENCES customer_invitations(id, tenant_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES customer_tenant_projects(tenant_id, project_id)
);
--> statement-breakpoint
CREATE TABLE customer_provisioning_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES customer_invitations(id),
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('issued','revoked','superseded','redeemed')),
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('owner_internal','customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (invitation_id, tenant_id) REFERENCES customer_invitations(id, tenant_id)
);
--> statement-breakpoint
CREATE FUNCTION customer_invitation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor TEXT := nullif(current_setting('yorkstead.provisioning_actor', true), '');
DECLARE actor_role TEXT := current_setting('yorkstead.provisioning_role', true);
BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Invitation history is immutable' USING ERRCODE = '23514'; END IF;
  IF actor IS NULL OR actor_role NOT IN ('owner_internal','customer') OR actor_role IS NULL THEN
    RAISE EXCEPTION 'Trusted provisioning actor required' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := clock_timestamp();
    NEW.created_transaction := pg_current_xact_id();
    IF actor_role <> 'owner_internal' OR NEW.status <> 'pending' OR NEW.issued_by <> actor THEN
      RAISE EXCEPTION 'Owner issuance required' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF ROW(NEW.id,NEW.tenant_id,NEW.recipient_email,NEW.token_verifier,NEW.issued_by,NEW.created_at,NEW.created_transaction,NEW.expires_at)
      IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.recipient_email,OLD.token_verifier,OLD.issued_by,OLD.created_at,OLD.created_transaction,OLD.expires_at)
      OR OLD.status <> 'pending' OR NEW.status = 'pending' THEN
      RAISE EXCEPTION 'Invalid invitation transition' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'redeemed' THEN
      IF actor_role <> 'customer' OR NEW.redeemed_identity_id <> actor OR OLD.expires_at <= clock_timestamp() THEN
        RAISE EXCEPTION 'Invalid redemption' USING ERRCODE = '23514';
      END IF;
      NEW.redeemed_at := clock_timestamp();
    ELSE
      IF actor_role <> 'owner_internal' OR NEW.revoked_by <> actor THEN
        RAISE EXCEPTION 'Owner revocation required' USING ERRCODE = '42501';
      END IF;
      NEW.revoked_at := clock_timestamp();
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION customer_invitation_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Invitation scope is immutable' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM customer_invitations WHERE id = NEW.invitation_id AND status = 'pending' AND created_transaction = pg_current_xact_id()
      AND issued_by = current_setting('yorkstead.provisioning_actor',true)
      AND current_setting('yorkstead.provisioning_role',true) = 'owner_internal') THEN
    RAISE EXCEPTION 'Trusted pending invitation required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION customer_invitation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO customer_provisioning_audit(invitation_id,tenant_id,event_type,actor_id,actor_role)
    VALUES (NEW.id,NEW.tenant_id,CASE WHEN TG_OP='INSERT' THEN 'issued' ELSE NEW.status END,
      current_setting('yorkstead.provisioning_actor',true),current_setting('yorkstead.provisioning_role',true));
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION customer_provisioning_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Provisioning audit is append only' USING ERRCODE = '23514'; END IF;
  IF pg_trigger_depth() < 2 THEN RAISE EXCEPTION 'Audit must be generated' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER customer_invitation_write BEFORE INSERT OR UPDATE OR DELETE ON customer_invitations FOR EACH ROW EXECUTE FUNCTION customer_invitation_guard();
--> statement-breakpoint
CREATE TRIGGER customer_invitation_truncate BEFORE TRUNCATE ON customer_invitations FOR EACH STATEMENT EXECUTE FUNCTION customer_invitation_guard();
--> statement-breakpoint
CREATE TRIGGER customer_invitation_scope_write BEFORE INSERT OR UPDATE OR DELETE ON customer_invitation_projects FOR EACH ROW EXECUTE FUNCTION customer_invitation_scope_guard();
--> statement-breakpoint
CREATE TRIGGER customer_invitation_scope_truncate BEFORE TRUNCATE ON customer_invitation_projects FOR EACH STATEMENT EXECUTE FUNCTION customer_invitation_scope_guard();
--> statement-breakpoint
CREATE TRIGGER customer_invitation_audit_event AFTER INSERT OR UPDATE ON customer_invitations FOR EACH ROW EXECUTE FUNCTION customer_invitation_audit();
--> statement-breakpoint
CREATE TRIGGER customer_provisioning_audit_write BEFORE INSERT OR UPDATE OR DELETE ON customer_provisioning_audit FOR EACH ROW EXECUTE FUNCTION customer_provisioning_audit_guard();
--> statement-breakpoint
CREATE TRIGGER customer_provisioning_audit_truncate BEFORE TRUNCATE ON customer_provisioning_audit FOR EACH STATEMENT EXECUTE FUNCTION customer_provisioning_audit_guard();
--> statement-breakpoint
CREATE FUNCTION customer_invitation_complete_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM customer_invitation_projects WHERE invitation_id=NEW.id) THEN
    RAISE EXCEPTION 'Invitation requires explicit project scope' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER customer_invitation_scope_required AFTER INSERT ON customer_invitations
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION customer_invitation_complete_scope();
