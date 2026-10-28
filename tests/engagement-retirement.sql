-- Synthetic, transaction-scoped regression suite; run only with the guarded script.
BEGIN;
CREATE ROLE retirement_test_reader NOLOGIN;
DO $$ BEGIN
 IF has_function_privilege('retirement_test_reader','retire_inquiry(bigint,text,uuid,text)','EXECUTE')
 OR has_table_privilege('retirement_test_reader','inquiry_retirements','INSERT') THEN RAISE EXCEPTION 'Untrusted role can retire engagement'; END IF;
END $$;
CREATE FUNCTION pg_temp.expect_denied(command TEXT, expected_code TEXT DEFAULT '23514') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE command;
 EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE=expected_code THEN RETURN; END IF;
  RAISE;
 END;
 RAISE EXCEPTION 'Expected retirement denial';
END $$;
INSERT INTO contact_inquiries(name,email,company,message,status,archived_at,ip_hash)
VALUES ('Synthetic Owner','owner@example.test','Synthetic Retired','Evidence','archived',now()-interval '400 days',repeat('a',64)),
 ('Synthetic Other','other@example.test','Synthetic Unrelated','Evidence','archived',now()-interval '400 days',repeat('a',64)),
 ('Synthetic Winner','win@example.test','Synthetic Won','Evidence','won',NULL,repeat('a',64));
DO $$
DECLARE target BIGINT; digest TEXT; operation UUID:=gen_random_uuid(); before_row JSONB; winner BIGINT;
BEGIN
 SELECT id,to_jsonb(i)-'retirement_lock_version' INTO target,before_row FROM contact_inquiries i WHERE company='Synthetic Retired';
 digest:=inquiry_retirement_digest(target);
 PERFORM pg_temp.expect_denied(format('SELECT retire_inquiry(%s,%L,%L,%L)',target,repeat('0',64),operation,'test:owner'),'40001');
 IF EXISTS(SELECT 1 FROM inquiry_retirements WHERE inquiry_id=target) THEN RAISE EXCEPTION 'Stale operation changed data'; END IF;
 PERFORM retire_inquiry(target,digest,operation,'test:owner');
 IF retire_inquiry(target,digest,operation,'test:owner') THEN RAISE EXCEPTION 'Replay duplicated event'; END IF;
 IF (SELECT to_jsonb(i)-'retirement_lock_version' FROM contact_inquiries i WHERE id=target)<>before_row THEN RAISE EXCEPTION 'Evidence changed'; END IF;
 IF (SELECT count(*) FROM inquiry_retirement_audit WHERE inquiry_id=target)<>1 THEN RAISE EXCEPTION 'Audit missing'; END IF;
 PERFORM pg_temp.expect_denied(format('SELECT retire_inquiry(%s,%L,%L,%L)',target,digest,gen_random_uuid(),'test:owner'),'40001');
 PERFORM pg_temp.expect_denied(format('UPDATE contact_inquiries SET status=''won'',archived_at=NULL WHERE id=%s',target));
 PERFORM pg_temp.expect_denied(format('UPDATE contact_inquiries SET converted_project_id=''synthetic-project'' WHERE id=%s',target));
 PERFORM pg_temp.expect_denied(format('DELETE FROM contact_inquiries WHERE id=%s',target));
 PERFORM pg_temp.expect_denied('TRUNCATE contact_inquiries CASCADE');
 PERFORM pg_temp.expect_denied('UPDATE inquiry_retirements SET actor=''different''');
 PERFORM pg_temp.expect_denied('DELETE FROM inquiry_retirement_audit');
 PERFORM pg_temp.expect_denied('TRUNCATE inquiry_retirement_audit');
 PERFORM pg_temp.expect_denied(format('INSERT INTO inquiry_retirement_audit(operation_id,inquiry_id,actor,prior_status,retained_digest) VALUES(%L,%s,''fake'',''won'',%L)',gen_random_uuid(),target,digest));
 DELETE FROM contact_inquiries WHERE status='archived' AND archived_at<now()-interval '365 days' AND NOT EXISTS(SELECT 1 FROM inquiry_retirements r WHERE r.inquiry_id=contact_inquiries.id);
 IF NOT EXISTS(SELECT 1 FROM contact_inquiries WHERE id=target) OR EXISTS(SELECT 1 FROM contact_inquiries WHERE company='Synthetic Unrelated') THEN RAISE EXCEPTION 'Retention isolation failed'; END IF;
 SELECT id INTO winner FROM contact_inquiries WHERE company='Synthetic Won';
 PERFORM retire_inquiry(winner,inquiry_retirement_digest(winner),gen_random_uuid(),'test:owner');
 IF (SELECT status FROM contact_inquiries WHERE id=winner)<>'won' THEN RAISE EXCEPTION 'Historical win changed'; END IF;
END $$;
-- A nested subtransaction abort must remove the tombstone and generated event together.
DO $$
DECLARE target BIGINT; operation UUID:=gen_random_uuid();
BEGIN
 INSERT INTO contact_inquiries(name,email,message,converted_project_id,ip_hash) VALUES('Synthetic Linked','linked@example.test','Evidence','synthetic-project',repeat('a',64)) RETURNING id INTO target;
 PERFORM pg_temp.expect_denied(format('SELECT retire_inquiry(%s,inquiry_retirement_digest(%s),%L,%L)',target,target,operation,'test:owner'));
 UPDATE contact_inquiries SET converted_project_id=NULL,notification_status='queued' WHERE id=target;
 PERFORM pg_temp.expect_denied(format('SELECT retire_inquiry(%s,inquiry_retirement_digest(%s),%L,%L)',target,target,operation,'test:owner'));
 UPDATE contact_inquiries SET notification_status='not_configured' WHERE id=target;
 BEGIN
  PERFORM retire_inquiry(target,inquiry_retirement_digest(target),operation,'test:owner');
  RAISE EXCEPTION 'Synthetic rollback' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM inquiry_retirements WHERE inquiry_id=target) OR EXISTS(SELECT 1 FROM inquiry_retirement_audit WHERE operation_id=operation) THEN RAISE EXCEPTION 'Rollback retained retirement'; END IF;
 UPDATE contact_inquiries SET notes='Unrelated functionality retained' WHERE id=target;
END $$;
ROLLBACK;
