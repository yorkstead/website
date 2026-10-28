ALTER TABLE contact_inquiries ADD COLUMN retirement_lock_version BIGINT NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE inquiry_retirements (
 inquiry_id BIGINT PRIMARY KEY REFERENCES contact_inquiries(id) ON DELETE RESTRICT,
 operation_id UUID NOT NULL UNIQUE,
 actor TEXT NOT NULL CHECK (length(actor) BETWEEN 1 AND 255 AND actor=btrim(actor)),
 expected_digest TEXT NOT NULL CHECK (expected_digest ~ '^[a-f0-9]{64}$'),
 reason TEXT NOT NULL DEFAULT 'terminated' CHECK (reason='terminated'),
 retired_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE TABLE inquiry_retirement_audit (
 operation_id UUID PRIMARY KEY REFERENCES inquiry_retirements(operation_id),
 inquiry_id BIGINT NOT NULL REFERENCES contact_inquiries(id),
 actor TEXT NOT NULL,
 prior_status TEXT NOT NULL,
 retained_digest TEXT NOT NULL,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
CREATE FUNCTION inquiry_retirement_digest(target BIGINT) RETURNS TEXT LANGUAGE sql VOLATILE SET search_path=pg_catalog,public AS $$
 SELECT encode(sha256(convert_to((to_jsonb(i)-'retirement_lock_version')::text,'UTF8')),'hex') FROM public.contact_inquiries i WHERE id=target
$$;
--> statement-breakpoint
CREATE FUNCTION inquiry_retirement_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Retirement evidence is immutable' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE FUNCTION inquiry_retirement_prepare() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE source public.contact_inquiries;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Retirement requires read committed serialization' USING ERRCODE='40001'; END IF;
 SELECT * INTO source FROM public.contact_inquiries WHERE id=NEW.inquiry_id FOR UPDATE;
 IF NOT FOUND OR source.converted_project_id IS NOT NULL OR source.notification_status IN ('queued','sent') THEN RAISE EXCEPTION 'Inquiry retirement scope unavailable' USING ERRCODE='23514'; END IF;
 IF public.inquiry_retirement_digest(NEW.inquiry_id) IS DISTINCT FROM NEW.expected_digest THEN RAISE EXCEPTION 'Retirement conflict' USING ERRCODE='40001'; END IF;
 UPDATE public.contact_inquiries SET retirement_lock_version=retirement_lock_version+1 WHERE id=NEW.inquiry_id;
 NEW.retired_at:=clock_timestamp();
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION inquiry_retirement_record() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO public.inquiry_retirement_audit(operation_id,inquiry_id,actor,prior_status,retained_digest)
 SELECT NEW.operation_id,NEW.inquiry_id,NEW.actor,status,NEW.expected_digest FROM public.contact_inquiries WHERE id=NEW.inquiry_id;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION inquiry_retirement_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF pg_trigger_depth()<>2 THEN RAISE EXCEPTION 'Retirement audit is generated only' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION inquiry_retirement_protect() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.inquiry_retirements WHERE inquiry_id=OLD.id) THEN
  RAISE EXCEPTION 'Retired inquiry is retained and cannot change' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION retire_inquiry(target BIGINT, expected TEXT, operation UUID, verified_actor TEXT) RETURNS BOOLEAN LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE prior public.inquiry_retirements;
BEGIN
 PERFORM 1 FROM public.contact_inquiries WHERE id=target FOR UPDATE;
 SELECT * INTO prior FROM public.inquiry_retirements WHERE inquiry_id=target;
 IF FOUND THEN
  IF prior.operation_id=operation AND prior.actor=verified_actor AND prior.expected_digest=expected THEN RETURN false; END IF;
  RAISE EXCEPTION 'Retirement operation conflict' USING ERRCODE='40001';
 END IF;
 INSERT INTO public.inquiry_retirements(inquiry_id,operation_id,actor,expected_digest) VALUES(target,operation,verified_actor,expected);
 RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON inquiry_retirements,inquiry_retirement_audit FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION retire_inquiry(BIGINT,TEXT,UUID,TEXT) FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER inquiry_retirement_prepare BEFORE INSERT ON inquiry_retirements FOR EACH ROW EXECUTE FUNCTION inquiry_retirement_prepare();
--> statement-breakpoint
CREATE TRIGGER inquiry_retirement_record AFTER INSERT ON inquiry_retirements FOR EACH ROW EXECUTE FUNCTION inquiry_retirement_record();
--> statement-breakpoint
CREATE TRIGGER inquiry_retirement_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON inquiry_retirements EXECUTE FUNCTION inquiry_retirement_immutable();
--> statement-breakpoint
CREATE TRIGGER inquiry_retirement_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON inquiry_retirement_audit EXECUTE FUNCTION inquiry_retirement_immutable();
--> statement-breakpoint
CREATE TRIGGER inquiry_retirement_audit_generated BEFORE INSERT ON inquiry_retirement_audit FOR EACH ROW EXECUTE FUNCTION inquiry_retirement_audit_guard();
--> statement-breakpoint
CREATE TRIGGER inquiry_retirement_protect BEFORE UPDATE OR DELETE ON contact_inquiries FOR EACH ROW EXECUTE FUNCTION inquiry_retirement_protect();
--> statement-breakpoint
CREATE TRIGGER inquiry_retirement_no_truncate BEFORE TRUNCATE ON contact_inquiries EXECUTE FUNCTION inquiry_retirement_immutable();
--> statement-breakpoint
ALTER TABLE portal_release_reviews DROP CONSTRAINT portal_release_reviews_schema_version_check;
--> statement-breakpoint
ALTER TABLE portal_release_reviews ADD CONSTRAINT portal_release_reviews_schema_version_check CHECK (schema_version IN ('0016','0017','0018'));
