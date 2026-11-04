-- Owner-operated revocation only. Review target privately before execution.
-- Requires an authorized role administrator and TLS.
\set ON_ERROR_STOP on

BEGIN;
DO $revoke_scoped_privileges$
DECLARE
  relation_record record;
  column_name text;
BEGIN
  IF pg_catalog.to_regrole('ys_sys_001_preflight_reader') IS NULL THEN
    RAISE NOTICE 'Preflight role is already absent';
    RETURN;
  END IF;

  FOR relation_record IN
    SELECT c.oid, n.nspname, c.relname
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM ys_sys_001_preflight_reader',
                   relation_record.nspname, relation_record.relname);
    FOR column_name IN
      SELECT a.attname FROM pg_catalog.pg_attribute a
       WHERE a.attrelid = relation_record.oid AND a.attnum > 0 AND NOT a.attisdropped
    LOOP
      EXECUTE format(
        'REVOKE SELECT (%1$I), INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON TABLE %2$I.%3$I FROM ys_sys_001_preflight_reader',
        column_name, relation_record.nspname, relation_record.relname
      );
    END LOOP;
  END LOOP;

  EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ys_sys_001_preflight_reader');
  REVOKE ALL PRIVILEGES ON SCHEMA public FROM ys_sys_001_preflight_reader;
  EXECUTE format('REVOKE CONNECT, TEMPORARY ON DATABASE %I FROM ys_sys_001_preflight_reader', current_database());
  ALTER ROLE ys_sys_001_preflight_reader NOLOGIN PASSWORD NULL;
END
$revoke_scoped_privileges$;
COMMIT;

\echo 'New logins are disabled and direct grants are revoked. Existing sessions must be checked and terminated by the authorized operator before treating access as fully revoked.'
