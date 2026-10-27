#!/usr/bin/env bash
set -euo pipefail
if [[ "${RETIREMENT_TEST_CONFIRM:-}" != YES || -z "${RETIREMENT_TEST_DATABASE_URL:-}" ]]; then
 echo "Explicit disposable retirement test configuration required." >&2; exit 2
fi
bun -e '
const value=process.env.RETIREMENT_TEST_DATABASE_URL;
try {
 const u=new URL(value);
 if(!["postgres:","postgresql:"].includes(u.protocol)||u.hostname!=="127.0.0.1"||!u.port||u.search||u.hash||!/^\/[a-z0-9_]+_test$/.test(u.pathname)||value===process.env.DATABASE_URL)throw Error();
} catch { console.error("Refusing non-loopback or ambiguous disposable target.");process.exit(2); }
'
env -u PGHOSTADDR -u PGSERVICE -u PGSERVICEFILE PGOPTIONS='-c statement_timeout=15000 -c lock_timeout=3000' psql "$RETIREMENT_TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f tests/engagement-retirement.sql
