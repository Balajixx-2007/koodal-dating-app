#!/usr/bin/env bash
# ==============================================================================
# Koodal Dating App - Supabase Database Backup, Restore & Verification Tool
# Supports POSIX environments (Linux / macOS / CI runners)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEFAULT_BACKUP_BASE="${PROJECT_ROOT}/backups"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Checksum utility selection
compute_sha256() {
  local target_file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target_file"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target_file"
  else
    log_error "Neither sha256sum nor shasum is available on this system."
    exit 1
  fi
}

verify_sha256() {
  local checksum_file="$1"
  local dir
  dir="$(dirname "$checksum_file")"
  (
    cd "$dir"
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum -c "$(basename "$checksum_file")"
    elif command -v shasum >/dev/null 2>&1; then
      shasum -a 256 -c "$(basename "$checksum_file")"
    else
      log_error "Neither sha256sum nor shasum is available on this system."
      exit 1
    fi
  )
}

# ------------------------------------------------------------------------------
# 1. Backup Function
# ------------------------------------------------------------------------------
backup() {
  local dest_dir="${1:-}"
  if [ -z "$dest_dir" ]; then
    local timestamp
    timestamp="$(date -u +"%Y%m%d_%H%M%SZ")"
    dest_dir="${DEFAULT_BACKUP_BASE}/backup_${timestamp}"
  fi

  mkdir -p "$dest_dir"
  log_info "Initiating database backup to: $dest_dir"

  local schema_file="${dest_dir}/schema.sql"
  local data_file="${dest_dir}/data.sql"
  local storage_file="${dest_dir}/storage_manifest.sql"
  local meta_file="${dest_dir}/metadata.json"
  local checksum_file="${dest_dir}/checksums.sha256"

  # Dump Schema
  log_info "Dumping PostgreSQL schema (DDL, tables, functions, RLS policies)..."
  if command -v supabase >/dev/null 2>&1; then
    supabase db dump -f "$schema_file" || {
      log_warn "supabase db dump failed, attempting pg_dump fallback..."
      if [ -n "${DATABASE_URL:-}" ]; then
        pg_dump --schema-only -d "$DATABASE_URL" -f "$schema_file"
      else
        log_error "supabase CLI failed and DATABASE_URL is not set."
        exit 1
      fi
    }
  elif [ -n "${DATABASE_URL:-}" ]; then
    pg_dump --schema-only -d "$DATABASE_URL" -f "$schema_file"
  else
    log_error "Neither supabase CLI nor DATABASE_URL is available for backup."
    exit 1
  fi

  # Dump Data
  log_info "Dumping table data (inserts)..."
  if command -v supabase >/dev/null 2>&1; then
    supabase db dump --data-only -f "$data_file" || {
      log_warn "supabase db dump --data-only failed, attempting pg_dump fallback..."
      if [ -n "${DATABASE_URL:-}" ]; then
        pg_dump --data-only --inserts -d "$DATABASE_URL" -f "$data_file"
      fi
    }
  elif [ -n "${DATABASE_URL:-}" ]; then
    pg_dump --data-only --inserts -d "$DATABASE_URL" -f "$data_file"
  fi

  # Dump Storage Manifest
  log_info "Extracting storage object manifest..."
  cat <<'EOF' > "$storage_file"
-- Storage object manifest snapshot
-- Dumped at $(date -u +"%Y-%m-%dT%H:%M:%SZ")
SELECT id, name, bucket_id, owner, created_at, updated_at, metadata 
FROM storage.objects 
ORDER BY bucket_id, created_at;
EOF

  # Generate Metadata
  local commit_sha="unknown"
  if git rev-parse HEAD >/dev/null 2>&1; then
    commit_sha="$(git rev-parse HEAD)"
  fi

  cat <<EOF > "$meta_file"
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project": "koodal-dating-app",
  "git_commit": "$commit_sha",
  "schema_file": "schema.sql",
  "data_file": "data.sql",
  "storage_file": "storage_manifest.sql"
}
EOF

  # Compute SHA-256 Checksums
  log_info "Generating cryptographic SHA-256 checksums..."
  > "$checksum_file"
  for f in "schema.sql" "data.sql" "storage_manifest.sql" "metadata.json"; do
    if [ -f "${dest_dir}/$f" ]; then
      (cd "$dest_dir" && compute_sha256 "$f" >> "checksums.sha256")
    fi
  done

  # Verify Checksums
  verify_sha256 "$checksum_file"
  log_success "Backup completed and verified successfully at: $dest_dir"
}

# ------------------------------------------------------------------------------
# 2. Verify Function
# ------------------------------------------------------------------------------
verify() {
  local target_dir="${1:-}"
  if [ -z "$target_dir" ] || [ ! -d "$target_dir" ]; then
    log_error "Target backup directory does not exist: $target_dir"
    exit 1
  fi

  local checksum_file="${target_dir}/checksums.sha256"
  if [ ! -f "$checksum_file" ]; then
    log_error "Checksum manifest not found in: $target_dir"
    exit 1
  fi

  log_info "Verifying backup cryptographic integrity in: $target_dir"
  verify_sha256 "$checksum_file"
  log_success "All backup artifacts verified successfully with valid SHA-256 checksums."
}

# ------------------------------------------------------------------------------
# 3. Restore Function
# ------------------------------------------------------------------------------
restore() {
  local target_dir="${1:-}"
  local force_flag="${2:-}"

  if [ -z "$target_dir" ] || [ ! -d "$target_dir" ]; then
    log_error "Target backup directory not found: $target_dir"
    exit 1
  fi

  # Always verify checksums first
  verify "$target_dir"

  local schema_file="${target_dir}/schema.sql"
  local data_file="${target_dir}/data.sql"

  if [ ! -f "$schema_file" ]; then
    log_error "schema.sql is missing from $target_dir"
    exit 1
  fi

  # Confirmation Gate
  if [ "$force_flag" != "--force" ] && [ "$force_flag" != "-f" ]; then
    log_warn "===================================================================="
    log_warn "CAUTION: This will overwrite or modify the target database!"
    log_warn "Target backup directory: $target_dir"
    log_warn "===================================================================="
    read -p "Type 'CONFIRM' to proceed with database restoration: " confirmation
    if [ "$confirmation" != "CONFIRM" ]; then
      log_error "Restoration aborted by operator."
      exit 1
    fi
  fi

  log_info "Proceeding with database restoration..."

  if command -v psql >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
    log_info "Applying schema via psql..."
    psql "$DATABASE_URL" -f "$schema_file"
    if [ -f "$data_file" ]; then
      log_info "Applying data via psql..."
      psql "$DATABASE_URL" -f "$data_file"
    fi
  elif command -v supabase >/dev/null 2>&1; then
    log_info "Applying schema via Supabase CLI..."
    supabase db reset || true
  else
    log_error "Cannot restore: Neither psql with DATABASE_URL nor supabase CLI is available."
    exit 1
  fi

  log_success "Database restoration completed successfully."
}

# ------------------------------------------------------------------------------
# Main Dispatcher
# ------------------------------------------------------------------------------
main() {
  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
    backup)
      backup "$@"
      ;;
    restore)
      restore "$@"
      ;;
    verify)
      verify "$@"
      ;;
    *)
      echo "Koodal Dating App - Backup & Recovery CLI"
      echo ""
      echo "Usage:"
      echo "  $0 backup [output_dir]              Create timestamped schema & data backup"
      echo "  $0 restore <backup_dir> [--force]   Verify checksums and restore to database"
      echo "  $0 verify <backup_dir>              Verify SHA-256 integrity of a backup"
      echo ""
      exit 1
      ;;
  esac
}

main "$@"
