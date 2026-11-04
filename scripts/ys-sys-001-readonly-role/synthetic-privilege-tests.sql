\set ON_ERROR_STOP on
SET default_transaction_read_only = off;

DO $allowed_reads$
BEGIN
  IF (SELECT count(id) FROM public.system_directory_entries) <> 1 THEN
    IF (SELECT count(id) FROM public.system_directory_entries) <> 2 THEN
      RAISE EXCEPTION 'Aggregate read did not return the synthetic entries';
    END IF;
  END IF;
  IF (SELECT count(id) FROM public.system_directory_audit) <> 2 THEN
    RAISE EXCEPTION 'Audit aggregate read failed';
  END IF;
  IF (SELECT count(id) FROM public.system_directory_entries WHERE entity_class = 'provider_service') <> 1
     OR (SELECT count(id) FROM public.system_directory_entries WHERE legacy_directory_entry) <> 1 THEN
    RAISE EXCEPTION 'Registry/legacy classification aggregates failed';
  END IF;
  IF (SELECT count(*) FROM public.application_migrations WHERE version = '0020' AND checksum = repeat('a',64)) <> 0 THEN
    RAISE EXCEPTION 'Migration ledger returned an unexpected fixture checksum';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.application_migrations WHERE version = '0020' AND char_length(checksum) = 64) THEN
    RAISE EXCEPTION 'Migration ledger read failed';
  END IF;
  IF NOT pg_catalog.has_column_privilege(current_user, 'public.system_directory_entries', 'id', 'SELECT') THEN
    RAISE EXCEPTION 'Required aggregate column is not readable';
  END IF;
  IF pg_catalog.has_column_privilege(current_user, 'public.system_directory_entries', 'name', 'SELECT') THEN
    RAISE EXCEPTION 'Sensitive business field is readable';
  END IF;
  IF pg_catalog.has_database_privilege(current_user, current_database(), 'TEMP') THEN
    RAISE EXCEPTION 'TEMP/CREATE privilege is inherited';
  END IF;
END
$allowed_reads$;

DO $denied_operations$
BEGIN
  BEGIN
    INSERT INTO public.system_directory_entries(id,revision,entity_class,legacy_directory_entry,name)
    VALUES ('00000000-0000-0000-0000-000000000002',1,'provider_service',true,'x');
    RAISE EXCEPTION 'INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.system_directory_entries SET revision = 3;
    RAISE EXCEPTION 'UPDATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.system_directory_entries;
    RAISE EXCEPTION 'DELETE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    TRUNCATE public.system_directory_entries;
    RAISE EXCEPTION 'TRUNCATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'CREATE TABLE public.ys_sys_001_forbidden (id integer)';
    RAISE EXCEPTION 'CREATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'CREATE TEMP TABLE ys_sys_001_forbidden_temp (id integer)';
    RAISE EXCEPTION 'TEMP/CREATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER TABLE public.system_directory_entries ADD COLUMN forbidden integer';
    RAISE EXCEPTION 'ALTER unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'DROP TABLE public.system_directory_entries';
    RAISE EXCEPTION 'DROP unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'CREATE ROLE ys_sys_001_forbidden_role';
    RAISE EXCEPTION 'Role administration unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER ROLE ys_sys_001_forbidden_target NOLOGIN';
    RAISE EXCEPTION 'ALTER ROLE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    EXECUTE 'DROP ROLE ys_sys_001_forbidden_target';
    RAISE EXCEPTION 'DROP ROLE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END
$denied_operations$;

-- The verifier must also stay safe if a caller tries to disable the default
-- read-only setting: database/table grants remain the enforcement boundary.
DO $still_denied$
BEGIN
  BEGIN
    INSERT INTO public.system_directory_entries(id,revision,entity_class,legacy_directory_entry,name)
    VALUES ('00000000-0000-0000-0000-000000000003',1,'provider_service',true,'x');
    RAISE EXCEPTION 'INSERT succeeded after changing the session default';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END
$still_denied$;
