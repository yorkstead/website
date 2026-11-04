-- Disposable test database only. The Actions job provisions a private,
-- per-job PostgreSQL service; this fixture resets only synthetic database ACLs.
\set ON_ERROR_STOP on

DO $$
DECLARE other_db record;
BEGIN
  EXECUTE format('REVOKE CONNECT, TEMPORARY, CREATE ON DATABASE %I FROM PUBLIC', current_database());
  FOR other_db IN SELECT datname FROM pg_catalog.pg_database
    WHERE datallowconn AND datname <> current_database()
  LOOP
    EXECUTE format('REVOKE CONNECT, TEMPORARY, CREATE ON DATABASE %I FROM PUBLIC', other_db.datname);
  END LOOP;
END $$;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- The isolated baseline mirrors the required production policy: owners that
-- create routines in public must not inherit PUBLIC EXECUTE by default.
DO $revoke_future_public_execute$
DECLARE creator record;
BEGIN
  FOR creator IN SELECT rolname FROM pg_catalog.pg_roles
                  WHERE pg_catalog.has_schema_privilege(oid, 'public', 'CREATE')
  LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC', creator.rolname);
  END LOOP;
END
$revoke_future_public_execute$;

CREATE TABLE public.application_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL CHECK (char_length(checksum) = 64),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ys_unrelated_permission_probe (id integer PRIMARY KEY);
