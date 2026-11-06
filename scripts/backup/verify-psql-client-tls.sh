#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" || -L "$1" ]]; then
  printf 'TLS verification input is missing or unsafe.\n' >&2
  exit 2
fi

# psql \\conninfo output is private and may contain host/user/database details.
# PostgreSQL 18 prints `SSL Connection` and `SSL Protocol` as separate table
# rows. Older clients and the owner's summarized report may put both on one
# line. Require a true SSL flag and TLS 1.2/1.3; never print captured details.
if LC_ALL=C awk '
  function trim(s) {
    sub(/^[[:space:]]+/, "", s)
    sub(/[[:space:]]+$/, "", s)
    return s
  }
  {
    lower = tolower($0)
    if (lower ~ /ssl connection.*tlsv1\.[23]/ ||
        lower ~ /ssl[[:space:]_-]*connection[[:space:]]*=[[:space:]]*true.*tlsv1\.[23]/)
      same_line = 1

    cells = split($0, fields, "|")
    if (cells >= 3 && trim(fields[1]) == "") {
      label = tolower(trim(fields[2]))
      value = trim(fields[3])
    } else if (cells >= 2) {
      label = tolower(trim(fields[1]))
      value = trim(fields[2])
    } else {
      next
    }

    if (label == "ssl connection" && tolower(value) == "true")
      ssl = 1
    if (label == "ssl protocol" && value ~ /^TLSv1\.[23]([^0-9]|$)/)
      protocol = 1
  }
  END { exit !(same_line || (ssl && protocol)) }
' "$1"; then
  exit 0
fi

printf 'Client did not confirm a TLS 1.2 or TLS 1.3 PostgreSQL connection.\n' >&2
exit 1
