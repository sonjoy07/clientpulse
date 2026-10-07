#!/usr/bin/env bash
# ==============================================================================
# ClientPulse — PostgreSQL Database Restore & Verification Script
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <backup-file.sql.gz> [target-database-name]"
    echo "Example: $0 backups/clientpulse_backup_20261008_000000.sql.gz clientpulse_restore_verify"
    exit 1
fi

BACKUP_FILE="$1"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[-] Error: Backup file '${BACKUP_FILE}' does not exist!"
    exit 1
fi

# Source environment
if [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

DB_USER="${POSTGRES_USER:-postgres}"
TARGET_DB="${2:-${POSTGRES_DB:-clientpulse}}"

echo "=========================================================="
echo " Starting Database Restore"
echo " Backup File: ${BACKUP_FILE}"
echo " Target DB:   ${TARGET_DB}"
echo "=========================================================="

if [ "${TARGET_DB}" = "${POSTGRES_DB:-clientpulse}" ]; then
    read -rp "[!] CAUTION: Restoring directly to active database '${TARGET_DB}'. Are you sure? (type 'yes' to proceed): " CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        echo "[-] Restore aborted by user."
        exit 1
    fi
else
    echo "[+] Creating verification database '${TARGET_DB}'..."
    docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${DB_USER}" -c "CREATE DATABASE ${TARGET_DB};" || true
fi

echo "[+] Decompressing and piping SQL into database '${TARGET_DB}'..."
gunzip -c "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${DB_USER}" -d "${TARGET_DB}" --quiet

echo "[+] Verifying restored table counts in '${TARGET_DB}'..."
docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U "${DB_USER}" -d "${TARGET_DB}" -c "
SELECT 
    (SELECT count(*) FROM \"Organization\") as org_count,
    (SELECT count(*) FROM \"User\") as user_count,
    (SELECT count(*) FROM \"Project\") as project_count,
    (SELECT count(*) FROM \"Task\") as task_count;
"

echo "[+] Restore verification completed successfully!"
