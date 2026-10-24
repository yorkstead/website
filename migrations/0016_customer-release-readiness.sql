CREATE TABLE portal_release_reviews (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 context_digest TEXT NOT NULL UNIQUE CHECK (context_digest ~ '^[a-f0-9]{64}$'),
 release_id TEXT NOT NULL CHECK (release_id='customer-portal-v1'),
 code_revision TEXT CHECK (code_revision ~ '^[a-f0-9]{40}$'),
 schema_version TEXT NOT NULL CHECK (schema_version='0016'),
 schema_identity TEXT NOT NULL CHECK (schema_identity ~ '^[a-f0-9]{64}$'),
 configuration_identity TEXT CHECK (configuration_identity ~ '^[a-f0-9]{64}$'),
 environment TEXT NOT NULL CHECK (environment IN ('disposable','unverified')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0),
 decision TEXT NOT NULL DEFAULT 'none' CHECK (decision IN ('none','acknowledged','approved','withdrawn')),
 decision_digest TEXT CHECK (decision_digest ~ '^[a-f0-9]{64}$'),
 decision_expires_at TIMESTAMPTZ,
 actor_id TEXT NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(id,context_digest),
 CHECK ((decision='none')=(decision_digest IS NULL)),
 CHECK ((decision='none')=(decision_expires_at IS NULL))
);
--> statement-breakpoint
CREATE TABLE portal_release_evidence (
 id BIGSERIAL PRIMARY KEY,
 review_id UUID NOT NULL,
 context_digest TEXT NOT NULL,
 review_revision INTEGER NOT NULL CHECK (review_revision>0),
 requirement_id TEXT NOT NULL CHECK (length(requirement_id) BETWEEN 1 AND 80 AND requirement_id ~ '^[a-z]+[.][a-z-]+$'),
 kind TEXT NOT NULL CHECK (kind IN ('technical','manual')),
 status TEXT NOT NULL CHECK (status IN ('passed','blocked','not_verified','not_applicable')),
 fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
 source TEXT NOT NULL CHECK (source IN ('code-inspection','disposable-schema','unavailable-adapter','isolated-test-adapter','owner-attestation')),
 actor_id TEXT NOT NULL,
 verified_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 expires_at TIMESTAMPTZ NOT NULL,
 FOREIGN KEY(review_id,context_digest) REFERENCES portal_release_reviews(id,context_digest),
 CHECK ((kind='manual')=(source='owner-attestation')),
 CHECK ((kind='manual')=(requirement_id IN ('security.review','operations.ownership','recovery.escalation','rollout.plan'))),
 CHECK (status<>'not_applicable' OR requirement_id='documents.excluded')
);
--> statement-breakpoint
CREATE INDEX portal_release_evidence_scope ON portal_release_evidence(review_id,requirement_id,id DESC);
--> statement-breakpoint
CREATE TABLE portal_release_audit (
 id BIGSERIAL PRIMARY KEY,
 review_id UUID NOT NULL REFERENCES portal_release_reviews(id),
 revision INTEGER NOT NULL,
 event TEXT NOT NULL CHECK (event IN ('created','verified','attested','acknowledged','approved','withdrawn')),
 from_decision TEXT,
 to_decision TEXT NOT NULL,
 assessment_digest TEXT,
 actor_id TEXT NOT NULL,
 actor_role TEXT NOT NULL DEFAULT 'owner_internal' CHECK (actor_role='owner_internal'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(review_id,revision)
);
--> statement-breakpoint
CREATE FUNCTION portal_release_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor TEXT:=nullif(current_setting('yorkstead.readiness_actor',true),'');
DECLARE event TEXT:=current_setting('yorkstead.readiness_event',true);
BEGIN
 IF TG_OP IN ('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Release history is retained' USING ERRCODE='23514'; END IF;
 IF actor IS NULL OR length(actor)>255 OR actor<>btrim(actor) THEN RAISE EXCEPTION 'Verified release owner required' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.decision<>'none' THEN RAISE EXCEPTION 'Review evidence first' USING ERRCODE='23514'; END IF;
  NEW.revision:=1;
 ELSE
  IF ROW(NEW.id,NEW.context_digest,NEW.release_id,NEW.code_revision,NEW.schema_version,NEW.schema_identity,NEW.configuration_identity,NEW.environment)
   IS DISTINCT FROM ROW(OLD.id,OLD.context_digest,OLD.release_id,OLD.code_revision,OLD.schema_version,OLD.schema_identity,OLD.configuration_identity,OLD.environment)
   THEN RAISE EXCEPTION 'Release context is immutable' USING ERRCODE='23514'; END IF;
  IF event IS NULL OR event NOT IN ('verified','attested','acknowledged','approved','withdrawn') THEN RAISE EXCEPTION 'Explicit review transition required' USING ERRCODE='42501'; END IF;
  IF (event IN ('verified','attested') AND NEW.decision<>'none') OR
   (event IN ('acknowledged','approved','withdrawn') AND NEW.decision<>event) THEN RAISE EXCEPTION 'Invalid review transition' USING ERRCODE='23514'; END IF;
  IF NEW.decision<>'none' AND (NEW.decision_expires_at<=clock_timestamp() OR NEW.decision_expires_at>clock_timestamp()+interval '1 day') THEN RAISE EXCEPTION 'Invalid decision lifetime' USING ERRCODE='23514'; END IF;
  NEW.revision:=OLD.revision+1;
 END IF;
 NEW.actor_id:=actor; NEW.updated_at:=clock_timestamp(); RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER portal_release_review_guard BEFORE INSERT OR UPDATE OR DELETE ON portal_release_reviews FOR EACH ROW EXECUTE FUNCTION portal_release_review_guard();
--> statement-breakpoint
CREATE TRIGGER portal_release_review_truncate BEFORE TRUNCATE ON portal_release_reviews FOR EACH STATEMENT EXECUTE FUNCTION portal_release_review_guard();
--> statement-breakpoint
CREATE FUNCTION portal_release_audit_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO portal_release_audit(review_id,revision,event,from_decision,to_decision,assessment_digest,actor_id)
 VALUES(NEW.id,NEW.revision,CASE WHEN TG_OP='INSERT' THEN 'created' ELSE current_setting('yorkstead.readiness_event') END,
 CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.decision END,NEW.decision,NEW.decision_digest,NEW.actor_id);
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER portal_release_audit_write AFTER INSERT OR UPDATE ON portal_release_reviews FOR EACH ROW EXECUTE FUNCTION portal_release_audit_write();
--> statement-breakpoint
CREATE FUNCTION portal_release_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor TEXT:=nullif(current_setting('yorkstead.readiness_actor',true),'');
BEGIN
 IF TG_OP='INSERT' AND TG_TABLE_NAME='portal_release_audit' AND pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' AND TG_TABLE_NAME='portal_release_evidence' AND actor IS NOT NULL THEN
  NEW.actor_id:=actor; NEW.verified_at:=clock_timestamp();
  IF NEW.expires_at<=NEW.verified_at OR NEW.expires_at>NEW.verified_at+interval '1 day' THEN RAISE EXCEPTION 'Invalid evidence lifetime' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 RAISE EXCEPTION 'Release evidence and audit are immutable' USING ERRCODE='23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER portal_release_evidence_guard BEFORE INSERT OR UPDATE OR DELETE ON portal_release_evidence FOR EACH ROW EXECUTE FUNCTION portal_release_history_guard();
--> statement-breakpoint
CREATE TRIGGER portal_release_evidence_truncate BEFORE TRUNCATE ON portal_release_evidence FOR EACH STATEMENT EXECUTE FUNCTION portal_release_history_guard();
--> statement-breakpoint
CREATE TRIGGER portal_release_audit_guard BEFORE INSERT OR UPDATE OR DELETE ON portal_release_audit FOR EACH ROW EXECUTE FUNCTION portal_release_history_guard();
--> statement-breakpoint
CREATE TRIGGER portal_release_audit_truncate BEFORE TRUNCATE ON portal_release_audit FOR EACH STATEMENT EXECUTE FUNCTION portal_release_history_guard();
