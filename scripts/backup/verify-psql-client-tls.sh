#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" || -L "$1" ]]; then
  printf 'TLS verification input is missing or unsafe.\n' >&2
  exit 2
fi

# psql \\conninfo output is private and may contain host/user/database details.
# Require both an SSL connection report and a supported TLS protocol in the same
# report. Never print the captured output or its sensitive connection metadata.
if LC_ALL=C grep -Eiq 'SSL connection.*TLSv1\.(2|3)|SSL[[:space:]_-]*Connection[[:space:]]*=[[:space:]]*true.*TLSv1\.(2|3)' "$1"; then
  exit 0
fi

printf 'Client did not confirm a TLS 1.2 or TLS 1.3 PostgreSQL connection.\n' >&2
exit 1
