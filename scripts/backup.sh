#!/usr/bin/env bash
# ==============================================================================
# ClientPulse — PostgreSQL Automated Backup Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/clientpulse_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14
COMPOSE_FILE="docker-compose.prod.yml"

mkdir -p "${BACKUP_DIR}"

echo "[+] Starting automated database backup to ${BACKUP_FILE}..."

# Source environment variables if .env exists
if [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-clientpulse}"

# Execute pg_dump from inside PostgreSQL container and compress on the host
docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[+] Backup successfully created: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

# Retention Policy: Clean up backups older than RETENTION_DAYS
echo "[+] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "clientpulse_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[+] Backup process completed successfully."
