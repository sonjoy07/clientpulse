#!/usr/bin/env bash
# ==============================================================================
# ClientPulse — Production Controlled Deployment Script
# ==============================================================================
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "=========================================================="
echo " Starting ClientPulse Deployment: ${TIMESTAMP}"
echo "=========================================================="

# 1. Verify environment configuration file exists
if [ ! -f "${ENV_FILE}" ]; then
    echo "[-] Error: Production environment file (${ENV_FILE}) not found!"
    echo "[-] Please create ${ENV_FILE} before running deploy.sh."
    exit 1
fi

# 2. Pull latest code (if in git repository)
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[+] Pulling latest Git changes..."
    git pull --rebase origin main || {
        echo "[-] Git pull failed. Aborting deployment."
        exit 1
    }
fi

# 3. Create pre-deployment database backup if database container is running
if docker compose -f "${COMPOSE_FILE}" ps -q postgres 2>/dev/null | grep -q .; then
    echo "[+] Creating pre-deployment database snapshot..."
    bash scripts/backup.sh || {
        echo "[!] Warning: Automated backup failed or skipped. Continuing with caution..."
    }
fi

# 4. Pull base images and build production containers
echo "[+] Building production Docker images..."
docker compose -f "${COMPOSE_FILE}" build --pull api worker

# 5. Execute Prisma Database Migrations safely (migrate deploy)
echo "[+] Applying Prisma migrations to production database..."
docker compose -f "${COMPOSE_FILE}" run --rm api npx prisma migrate deploy || {
    echo "[-] FATAL: Database migration failed! Aborting container rollout."
    exit 1
}

# 6. Zero-Downtime Rollout of Core Services
echo "[+] Rolling out updated API, Worker, Proxy, and Database containers..."
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

# 7. Post-Deployment Readiness & Health Check Probe
echo "[+] Waiting for API service readiness probe..."
MAX_ATTEMPTS=20
ATTEMPT=1
HEALTH_URL="http://127.0.0.1:4000/api/v1/health/ready"

until [ "${ATTEMPT}" -gt "${MAX_ATTEMPTS}" ]; do
    HTTP_CODE=$(docker compose -f "${COMPOSE_FILE}" exec -T api curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" || true)
    if [ "${HTTP_CODE}" = "200" ]; then
        echo "[+] API is READY and operational (HTTP 200)."
        break
    fi
    echo "[*] Attempt ${ATTEMPT}/${MAX_ATTEMPTS}: API not ready yet (HTTP ${HTTP_CODE}). Retrying in 3s..."
    sleep 3
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "${ATTEMPT}" -gt "${MAX_ATTEMPTS}" ]; then
    echo "[-] FATAL: Deployment verification failed. API did not become healthy in time!"
    echo "[-] Inspect container logs via: docker compose -f ${COMPOSE_FILE} logs --tail=100 api"
    exit 1
fi

echo "=========================================================="
echo " Deployment Successfully Completed!"
echo " Container Status:"
docker compose -f "${COMPOSE_FILE}" ps
echo "=========================================================="
