# ClientPulse — VPS Deployment Guide (Ubuntu / Debian / Docker)

This guide walks you through deploying the complete **ClientPulse SaaS** stack on any Linux VPS (DigitalOcean Droplet, Hetzner, Linode, Contabo, AWS EC2, etc.) using Docker Compose.

---

## 1. What Gets Deployed?

Using the included `docker-compose.prod.yml`, a single command starts:
1. **Frontend**: Next.js 15 Standalone Web UI (Port `3000`)
2. **Backend API**: NestJS REST API Server (Port `4000`)
3. **Background Worker**: BullMQ Background Worker (Processes AI status reports)
4. **Database**: PostgreSQL 16 Alpine
5. **Cache / Queue**: Redis 7 Alpine
6. **Reverse Proxy & SSL**: Nginx with Let's Encrypt / Certbot support (Ports `80`, `443`)

---

## 2. Server Prerequisites

- **OS**: Ubuntu 22.04 / 24.04 LTS (or Debian 12)
- **Minimum Specs**: 1 vCPU, 2 GB RAM (or 1 GB RAM + 2 GB Swap file)
- **Root or Sudo Access**

---

## 3. Step-by-Step Installation

### Step 1: Connect to your VPS
From your terminal or PowerShell:
```bash
ssh root@<YOUR_VPS_IP>
```

---

### Step 2: Install Docker and Git
Run this on your VPS:
```bash
# Update package repositories
apt update && apt upgrade -y

# Install Docker, Docker Compose V2, and Git
apt install -y docker.io docker-compose-v2 git curl

# Start and enable Docker on boot
systemctl enable --now docker
```

*(Optional for 1 GB RAM VPS: Add 2GB Swap to prevent out-of-memory during builds)*
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

### Step 3: Clone the Repository
```bash
git clone https://github.com/sonjoy07/clientpulse.git
cd clientpulse
```

---

### Step 4: Configure Production Environment (`.env`)
Create your production `.env` file from the template:
```bash
cp .env.example .env
nano .env
```

Set the following values in `.env`:
```env
# Application
NODE_ENV=production
PORT=4000

# PostgreSQL Database Configuration
POSTGRES_USER=clientpulse_admin
POSTGRES_PASSWORD=replace_with_strong_password_here
POSTGRES_DB=clientpulse
DATABASE_URL=postgresql://clientpulse_admin:replace_with_strong_password_here@postgres:5432/clientpulse?schema=public
DIRECT_URL=postgresql://clientpulse_admin:replace_with_strong_password_here@postgres:5432/clientpulse?schema=public

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=replace_with_strong_redis_password_here
REDIS_TLS=false

# Authentication Secrets (Must be 32+ characters)
# Generate via: openssl rand -base64 32
JWT_ACCESS_SECRET=your_generated_random_32_char_access_secret_key
JWT_REFRESH_SECRET=your_generated_random_32_char_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS and Frontend URL
# If accessing via IP:
FRONTEND_URL=http://<YOUR_VPS_IP>:3000
NEXT_PUBLIC_API_URL=http://<YOUR_VPS_IP>:4000/api/v1

# If using a Custom Domain:
# FRONTEND_URL=https://yourdomain.com
# NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1

# AI Report Generator (mock or openai)
AI_PROVIDER=mock
AI_MODEL=gpt-4o-mini
```
*(Save and exit in nano: press `Ctrl + O`, then `Enter`, then `Ctrl + X`)*

---

### Step 5: Run Database Migrations & Initial Seed
Run the Prisma migrations against the PostgreSQL container:
```bash
# Start PostgreSQL and Redis first
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait 5 seconds for PostgreSQL to be healthy
sleep 5

# Build and run database migrations
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# Seed initial admin user and organization
docker compose -f docker-compose.prod.yml run --rm api npm run prisma:seed
```

---

### Step 6: Start All Services
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check the status of all containers:
```bash
docker compose -f docker-compose.prod.yml ps
```
You should see all 5 containers running (`postgres`, `redis`, `api`, `worker`, `frontend`).

---

## 4. Verify Your Live Deployment

Open your web browser:
1. **Frontend**: `http://<YOUR_VPS_IP>:3000`
2. **Backend API Health**: `http://<YOUR_VPS_IP>:4000/api/v1/health`
3. Sign in using the seeded administrative credentials (or create your organization).

---

## 5. Useful Management Commands

```bash
# View live logs of all services
docker compose -f docker-compose.prod.yml logs -f

# View live logs of the API only
docker compose -f docker-compose.prod.yml logs -f api

# View live logs of the background AI worker
docker compose -f docker-compose.prod.yml logs -f worker

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Stop all services
docker compose -f docker-compose.prod.yml down

# Update to latest git changes
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```
