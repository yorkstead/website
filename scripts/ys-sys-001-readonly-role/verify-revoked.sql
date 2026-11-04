-- Synthetic test assertion only. Confirms revocation removes effective access.
\set ON_ERROR_STOP on
DO $verify_revoked$
DECLARE reader oid := pg_catalog.to_regrole('ys_sys_001_preflight_reader');
BEGIN
  IF reader IS NULL THEN RAISE EXCEPTION 'FAIL: role unexpectedly absent before role-drop assertion'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE oid=reader AND rolcanlogin) THEN
    RAISE EXCEPTION 'FAIL: reader login remains enabled';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=reader OR roleid=reader) THEN
    RAISE EXCEPTION 'FAIL: role membership remains';
  END IF;
  IF pg_catalog.has_database_privilege(reader,current_database(),'CONNECT')
     OR pg_catalog.has_database_privilege(reader,current_database(),'CREATE')
     OR pg_catalog.has_database_privilege(reader,current_database(),'TEMP')
     OR pg_catalog.has_schema_privilege(reader,'public','USAGE')
     OR pg_catalog.has_schema_privilege(reader,'public','CREATE') THEN
    RAISE EXCEPTION 'FAIL: database/schema access remains effective';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')
      AND (pg_catalog.has_table_privilege(reader,c.oid,'SELECT')
        OR pg_catalog.has_any_column_privilege(reader,c.oid,'SELECT')
        OR pg_catalog.has_table_privilege(reader,c.oid,'INSERT')
        OR pg_catalog.has_table_privilege(reader,c.oid,'UPDATE')
        OR pg_catalog.has_table_privilege(reader,c.oid,'DELETE'))
  ) THEN RAISE EXCEPTION 'FAIL: relation privilege remains effective'; END IF;
END
$verify_revoked$;
