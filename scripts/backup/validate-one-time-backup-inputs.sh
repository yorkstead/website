# Sourced by the owner-operated one-time backup procedure. This file only
# validates local inputs and client prerequisites; it never connects to a service.
ys_sys_001_fail_check() {
  printf '[YS-SYS-001 check %02d] %s\n' "$((10#$1))" "$2" >&2
  return 1
}

ys_sys_001_read_secret() {
  local variable="$1" prompt="$2" label="$3"
  if ! IFS= read -r -s -p "$prompt" "$variable"; then
    printf '\n' >&2
    ys_sys_001_fail_check 02 "$label was not supplied."
    return 1
  fi
  printf '\n'
}

ys_sys_001_read_text() {
  local variable="$1" prompt="$2" label="$3"
  if ! IFS= read -r -p "$prompt" "$variable"; then
    ys_sys_001_fail_check 02 "$label was not supplied."
    return 1
  fi
}

ys_sys_001_check_local_utilities() {
  local tool
  local required_tools=(age age-keygen openssl aws stat realpath mktemp sha256sum awk sed cut cmp install id date chmod rm mkdir env)
  for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      ys_sys_001_fail_check 16 "Required local utility '$tool' is unavailable."
      return 1
    fi
  done
}

ys_sys_001_check_postgres_clients() {
  local tool version major
  for tool in psql pg_dump pg_restore; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      ys_sys_001_fail_check 18 "Required PostgreSQL client '$tool' is unavailable."
      return 1
    fi
    version="$("$tool" --version 2>/dev/null)" || {
      ys_sys_001_fail_check 18 "PostgreSQL client prerequisite '$tool' could not report its version."
      return 1
    }
    if [[ ! "$version" =~ ([0-9]+)(\.[0-9]+)? ]]; then
      ys_sys_001_fail_check 18 "PostgreSQL client prerequisite '$tool' returned an unrecognized version."
      return 1
    fi
    major="${BASH_REMATCH[1]}"
    if [[ "$major" != 18 ]]; then
      ys_sys_001_fail_check 18 "PostgreSQL client prerequisite '$tool' must be major version 18."
      return 1
    fi
    case "$tool" in
      pg_dump) PG_DUMP_MAJOR="$major" ;;
      pg_restore) PG_RESTORE_MAJOR="$major" ;;
      psql) PSQL_MAJOR="$major" ;;
    esac
  done
}

ys_sys_001_prepare_workspace() {
  local expected_workspace="${HOME}/.local/state/yorkstead/ys-sys-001/backups"
  local resolved mode owner

  if [[ "${workspace:-}" != "$expected_workspace" ]]; then
    ys_sys_001_fail_check 01 "The backup workspace is not the required private local workspace."
    return 1
  fi
  if [[ -L "$workspace" ]]; then
    ys_sys_001_fail_check 01 "The backup workspace must not be a symbolic link."
    return 1
  fi
  if [[ -e "$workspace" && ! -d "$workspace" ]]; then
    ys_sys_001_fail_check 01 "The backup workspace path exists but is not a directory."
    return 1
  fi
  if [[ -e "$workspace" ]]; then
    mode="$(stat -c %a -- "$workspace" 2>/dev/null)" || {
      ys_sys_001_fail_check 01 "The existing backup workspace permissions could not be checked."
      return 1
    }
    if [[ "$mode" != 700 ]]; then
      ys_sys_001_fail_check 01 "The existing backup workspace must already have mode 0700; it was not changed."
      return 1
    fi
  fi
  if ! install -d -m 0700 "$workspace" 2>/dev/null; then
    ys_sys_001_fail_check 01 "The private backup workspace could not be created."
    return 1
  fi
  if [[ -L "$workspace" || ! -d "$workspace" ]]; then
    ys_sys_001_fail_check 01 "The backup workspace is not a regular directory."
    return 1
  fi
  mode="$(stat -c %a -- "$workspace" 2>/dev/null)" || {
    ys_sys_001_fail_check 01 "The backup workspace permissions could not be checked."
    return 1
  }
  if [[ "$mode" != 700 ]]; then
    ys_sys_001_fail_check 01 "The backup workspace must have mode 0700."
    return 1
  fi
  owner="$(stat -c %u -- "$workspace" 2>/dev/null)" || {
    ys_sys_001_fail_check 01 "The backup workspace owner could not be checked."
    return 1
  }
  if [[ "$owner" != "$(id -u)" ]]; then
    ys_sys_001_fail_check 01 "The backup workspace must be owned by the current user."
    return 1
  fi
  resolved="$(realpath -e -- "$workspace" 2>/dev/null)" || {
    ys_sys_001_fail_check 01 "The backup workspace path could not be resolved safely."
    return 1
  }
  if [[ "$resolved" != "$workspace" ]]; then
    ys_sys_001_fail_check 01 "The backup workspace path must be canonical and contain no symbolic-link components."
    return 1
  fi
}

ys_sys_001_validate_backup_inputs() {
  local path mode owner resolved

  if [[ -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
    ys_sys_001_fail_check 02 "Both bucket-scoped R2 credentials must be supplied."
    return 1
  fi
  if [[ ! "${DIRECTORY_ENTRY_COUNT:-}" =~ ^[0-9]+$ || ! "${DIRECTORY_AUDIT_COUNT:-}" =~ ^[0-9]+$ ]]; then
    ys_sys_001_fail_check 03 "Directory entry and audit counts must both be non-negative integers from the current approved preflight."
    return 1
  fi
  if [[ ! "${R2_UNUSED_GB_MONTH:-}" =~ ^(10(\.0{1,3})?|[0-9](\.[0-9]{1,3})?)$ ]]; then
    ys_sys_001_fail_check 04 "Unused R2 Standard storage allowance must be a number from 0 through 10 GB-month."
    return 1
  fi
  if [[ ! "${AGE_KEY_ID:-}" =~ ^[A-Za-z0-9_-]{1,64}$ ]]; then
    ys_sys_001_fail_check 05 "The non-secret age key label must be 1–64 letters, digits, underscores, or hyphens."
    return 1
  fi
  if [[ ! "${PREFLIGHT_REFERENCE:-}" =~ ^[A-Za-z0-9_.:-]{1,120}$ && ! "${PREFLIGHT_REFERENCE:-}" =~ ^/[A-Za-z0-9_./:-]{1,240}$ ]]; then
    ys_sys_001_fail_check 05 "The preflight evidence reference must be a short token or a slash-prefixed local path using letters, digits, dot, underscore, colon, or hyphen."
    return 1
  fi
  if [[ ! "${AGE_PUBLIC_RECIPIENT:-}" =~ ^age1[a-z0-9]{50,}$ ]]; then
    ys_sys_001_fail_check 06 "The age recipient has an invalid public-recipient format."
    return 1
  fi
  if [[ ! "${APPROVED_DUMP_ROLE:-}" =~ ^[A-Za-z_][A-Za-z0-9_$]{0,62}$ ]]; then
    ys_sys_001_fail_check 07 "The approved PostgreSQL dump role name has an unsupported format."
    return 1
  fi
  if [[ ! "${R2_BUCKET:-}" =~ ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$ ]]; then
    ys_sys_001_fail_check 08 "The private R2 bucket name has an invalid format."
    return 1
  fi
  if [[ ! "${R2_S3_ENDPOINT:-}" =~ ^https://[a-z0-9-]+\.us\.r2\.cloudflarestorage\.com$ ]]; then
    ys_sys_001_fail_check 09 "The R2 S3 endpoint must use the HTTPS US-jurisdiction Cloudflare R2 endpoint format."
    return 1
  fi

  for path in "${AGE_IDENTITY_FILE:-}"; do
    if [[ -z "$path" || "$path" != /* || ! -f "$path" || -L "$path" ]]; then
      ys_sys_001_fail_check 10 "The age recovery identity path must be an existing absolute regular file, without tilde shorthand or a symbolic link."
      return 1
    fi
  done
  if [[ ! -f "${PGSERVICEFILE:-}" || -L "${PGSERVICEFILE:-}" ]]; then
    ys_sys_001_fail_check 11 "The configured PostgreSQL service-file path must be an existing regular file, not a symbolic link."
    return 1
  fi
  if [[ ! -f "${PGPASSFILE:-}" || -L "${PGPASSFILE:-}" ]]; then
    ys_sys_001_fail_check 12 "The configured PostgreSQL password-file path must be an existing regular file, not a symbolic link."
    return 1
  fi

  for path in "$AGE_IDENTITY_FILE" "$PGSERVICEFILE" "$PGPASSFILE"; do
    if [[ "$path" != /* ]]; then
      ys_sys_001_fail_check 13 "Age identity, PostgreSQL service, and PostgreSQL password file paths must be absolute."
      return 1
    fi
    resolved="$(realpath -e -- "$path" 2>/dev/null)" || {
      ys_sys_001_fail_check 13 "A required private file path could not be resolved."
      return 1
    }
    if [[ "$resolved" != "$path" ]]; then
      ys_sys_001_fail_check 13 "A required private file path is non-canonical or traverses a symbolic link."
      return 1
    fi
  done

  for path in "$AGE_IDENTITY_FILE" "$PGSERVICEFILE" "$PGPASSFILE"; do
    mode="$(stat -c %a -- "$path" 2>/dev/null)" || {
      ys_sys_001_fail_check 14 "Permissions on a required private file could not be checked."
      return 1
    }
    if [[ "$mode" != 600 ]]; then
      case "$path" in
        "$AGE_IDENTITY_FILE") ys_sys_001_fail_check 14 "The age recovery identity file must have mode 0600." ;;
        "$PGSERVICEFILE") ys_sys_001_fail_check 14 "The PostgreSQL service file must have mode 0600." ;;
        *) ys_sys_001_fail_check 14 "The PostgreSQL password file must have mode 0600." ;;
      esac
      return 1
    fi
    owner="$(stat -c %u -- "$path" 2>/dev/null)" || {
      ys_sys_001_fail_check 15 "Ownership on a required private file could not be checked."
      return 1
    }
    if [[ "$owner" != "$(id -u)" ]]; then
      case "$path" in
        "$AGE_IDENTITY_FILE") ys_sys_001_fail_check 15 "The age recovery identity file must be owned by the current user." ;;
        "$PGSERVICEFILE") ys_sys_001_fail_check 15 "The PostgreSQL service file must be owned by the current user." ;;
        *) ys_sys_001_fail_check 15 "The PostgreSQL password file must be owned by the current user." ;;
      esac
      return 1
    fi
  done

  local identity_recipient
  identity_recipient="$(age-keygen -y "$AGE_IDENTITY_FILE" 2>/dev/null)" || {
    ys_sys_001_fail_check 17 "The age recovery identity could not be read; no key material was displayed."
    return 1
  }
  if [[ "$identity_recipient" != "$AGE_PUBLIC_RECIPIENT" ]]; then
    ys_sys_001_fail_check 17 "The age recovery identity does not match the supplied public recipient."
    return 1
  fi

}
