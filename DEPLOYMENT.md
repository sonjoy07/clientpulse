# ClientPulse — Production Deployment Guide

This document details the production deployment architecture, step-by-step procedure, configuration values, and smoke-testing checklists for **ClientPulse**.

---

## 1. Architecture Overview

ClientPulse operates on a multi-service production architecture:

```
┌─────────────────────────────────┐
│     Vercel (Next.js 15)         │
│     clientpulse.vercel.app      │
└────────────────┬────────────────┘
                 │ HTTPS (REST /api/v1)
                 ▼
┌─────────────────────────────────┐       ┌───────────────────────────────┐
│     Render Web Service          │       │    Render Background Worker   │
│     (NestJS API Server)         │       │    (BullMQ WorkerHost)        │
│     clientpulse-api             │       │    clientpulse-worker         │
└───────┬───────────────────┬─────┘       └─────────┬─────────────────────┘
        │                   │                       │
        │                   └───────────────┐       │
        ▼                                   ▼       ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│    PostgreSQL Database        │   │    Redis Queue & Cache        │
│    (Render / Supabase)        │   │    (Render Redis / Upstash)   │
└───────────────────────────────┘   └───────────────────────────────┘
```

---

## 2. Component Specifications & Commands

### A. Backend API Web Service (Render)
- **Service Type**: `Web Service`
- **Environment**: `Node`
- **Region**: `Oregon` (or region closest to database)
- **Root Directory**: `.` *(repository root)*
- **Build Command**:
  ```bash
  npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
  ```
- **Start Command**:
  ```bash
  npm run start:prod
  ```
- **Health Check Path**: `/api/v1/health`

### B. Background Worker (Render)
- **Service Type**: `Background Worker`
- **Environment**: `Node`
- **Region**: Same as API service
- **Root Directory**: `.` *(repository root)*
- **Build Command**:
  ```bash
  npm ci && npx prisma generate && npm run build
  ```
- **Start Command**:
  ```bash
  npm run start:worker
  ```
- *Note:* Do NOT run `prisma migrate deploy` in the worker build command. Only the API service executes migrations to avoid concurrent deployment locks.

### C. Frontend Dashboard (Vercel)
- **Framework Preset**: `Next.js`
- **Root Directory**: `frontend` *(Crucial: must select `frontend`)*
- **Build Command**: `next build` *(default)*
- **Output Directory**: `.next` *(default)*
- **Install Command**: `npm install` *(default)*

---

## 3. Environment Variables Reference

### Backend (Render API & Worker)

| Variable | Required In | Purpose & Example |
| :--- | :--- | :--- |
| `NODE_ENV` | API, Worker | Set to `production`. Activates strict 32-char JWT secret check and security headers. |
| `PORT` | API | Port to bind. Render automatically injects `10000`. |
| `DATABASE_URL` | API, Worker | PostgreSQL connection string. E.g., `postgresql://user:pass@dpg-xxx:5432/clientpulse` |
| `DIRECT_URL` | API, Worker | Direct connection for migrations. Set equal to `DATABASE_URL` (or direct 5432 port for pooled databases). |
| `JWT_ACCESS_SECRET` | API | Random string at least 32 characters long. E.g., `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | API | Separate random string at least 32 characters long for refresh token verification. |
| `JWT_ACCESS_EXPIRES_IN` | API | Lifetime of access tokens (Default: `15m`). |
| `JWT_REFRESH_EXPIRES_IN` | API | Lifetime of refresh tokens (Default: `7d`). |
| `REDIS_URL` | API, Worker | Redis connection string. E.g., `redis://red-xxx:6379` or `rediss://default:xxx@xxx.upstash.io:6379`. |
| `FRONTEND_URL` | API | Comma-separated allowed CORS origins. E.g., `https://clientpulse.vercel.app,https://clientpulse-git-main.vercel.app`. |
| `AI_PROVIDER` | API, Worker | Set to `mock` for built-in rule generator, or `openai` for OpenAI. |
| `AI_API_KEY` | API, Worker | Required only if `AI_PROVIDER=openai`. |
| `AI_MODEL` | API, Worker | Optional OpenAI model (Default: `gpt-4o-mini`). |

### Frontend (Vercel)

| Variable | Purpose & Example |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public base URL of your deployed Render backend API with prefix.<br>Example: `https://clientpulse-api.onrender.com/api/v1` |

---

## 4. Deployment Sequence

To avoid connection failures, follow this exact deployment order:

### Step 1: Provision Data Infrastructure
1. **Provision PostgreSQL Database**:
   - In Render: Click **New** -> **PostgreSQL**.
   - Note the **Internal Database URL** (for services running inside Render) and **External Database URL**.
2. **Provision Redis**:
   - In Render: Click **New** -> **Redis** (or create an Upstash Redis database).
   - Note the **Internal Redis URL** (e.g. `redis://red-xxxx:6379`).

### Step 2: Deploy the Render API Web Service
1. In Render Dashboard, click **New** -> **Web Service**.
2. Connect your GitHub repository: `sonjoy07/clientpulse`.
3. Set **Name**: `clientpulse-api`.
4. Set **Region**: Same as database and Redis.
5. Set **Root Directory**: `.` (leave blank or `.`).
6. Set **Build Command**:
   ```bash
   npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
   ```
7. Set **Start Command**:
   ```bash
   npm run start:prod
   ```
8. Set **Health Check Path**: `/api/v1/health`.
9. Add the Environment Variables:
   - `NODE_ENV=production`
   - `DATABASE_URL` (Internal Database URL from Step 1)
   - `DIRECT_URL` (Same as DATABASE_URL)
   - `JWT_ACCESS_SECRET` (generate 32+ char key)
   - `JWT_REFRESH_SECRET` (generate 32+ char key)
   - `REDIS_URL` (Internal Redis URL from Step 1)
   - `AI_PROVIDER=mock`
   - `FRONTEND_URL=http://localhost:3000` *(Temporary until Step 4 provides live Vercel URL)*
10. Click **Create Web Service**. Wait for build and deployment to succeed. Verify URL: `https://<your-service>.onrender.com`.

### Step 3: Deploy the Render Background Worker
1. In Render Dashboard, click **New** -> **Background Worker**.
2. Connect the same repository: `sonjoy07/clientpulse`.
3. Set **Name**: `clientpulse-worker`.
4. Set **Build Command**:
   ```bash
   npm ci && npx prisma generate && npm run build
   ```
5. Set **Start Command**:
   ```bash
   npm run start:worker
   ```
6. Add the Environment Variables:
   - `NODE_ENV=production`
   - `DATABASE_URL` (same as API)
   - `DIRECT_URL` (same as API)
   - `REDIS_URL` (same as API)
   - `AI_PROVIDER=mock`
7. Click **Create Background Worker**.

### Step 4: Deploy the Vercel Frontend
1. Go to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Select your repository: `sonjoy07/clientpulse`.
3. Under **Project Settings**:
   - Click **Edit** next to **Root Directory** and select **`frontend`**.
   - Framework preset will automatically detect **Next.js**.
4. In **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_API_URL=https://<your-render-api>.onrender.com/api/v1
   ```
5. Click **Deploy**.
6. Once deployed, copy your production domain (e.g., `https://clientpulse-xxx.vercel.app`).

### Step 5: Update CORS on Backend
1. Go back to Render Dashboard -> `clientpulse-api` -> **Environment**.
2. Update `FRONTEND_URL` with your exact Vercel production domain:
   ```env
   FRONTEND_URL=https://clientpulse-xxx.vercel.app
   ```
3. Save changes. Render will perform a quick zero-downtime redeploy.

---

## 5. Post-Deployment Smoke-Test Checklist

- [ ] **Liveness & Readiness**:
  - Open `https://<api>.onrender.com` in browser -> should return `{ "name": "ClientPulse API", "status": "online" }`.
  - Open `https://<api>.onrender.com/api/v1/health` -> should return `{ "status": "ok", "dependencies": { "postgres": "up", "redis": "up" } }`.
- [ ] **Frontend Loading**:
  - Open `https://<frontend>.vercel.app` -> Landing page renders with full CSS and navigation links.
- [ ] **Authentication**:
  - Visit `/login` and sign in with initial administrative credentials.
  - Verify redirect to `/dashboard`.
- [ ] **Executive Dashboard**:
  - Confirm dashboard cards load without network errors.
  - Verify charts display real data or empty state.
- [ ] **Client & Project Creation**:
  - Navigate to `/clients/new`, create a client.
  - Navigate to `/projects/new`, create a project linked to the client.
  - Verify created records display on `/clients` and `/projects`.
- [ ] **Capacity & Allocation**:
  - Navigate to `/resources` and verify workload metrics load.
- [ ] **Client Portal Isolation**:
  - Sign in with a client account.
  - Confirm redirect to `/portal/dashboard`.
  - Verify internal hourly rates, budget costs, and risk algorithms are inaccessible.
- [ ] **AI Report Generation**:
  - In a project, navigate to the **AI Reports** tab.
  - Click **Generate Report**.
  - Verify job is picked up by `clientpulse-worker` and status transitions from `PENDING` -> `GENERATING` -> `COMPLETED`.

---

## 6. Troubleshooting & Common Scenarios

### 1. `CORS policy: No 'Access-Control-Allow-Origin' header`
- **Cause:** `FRONTEND_URL` in the Render API does not match the origin sent by the browser.
- **Fix:** Ensure `FRONTEND_URL` in Render matches your exact Vercel domain, including `https://` and without trailing slash (e.g. `https://clientpulse.vercel.app`). For multiple domains, comma-separate them.

### 2. `PrismaClientInitializationError: Can't reach database server`
- **Cause:** Incorrect `DATABASE_URL` or SSL configuration.
- **Fix:** If using Render Internal Database, use the Internal Database URL (which has no public bandwidth fees). If using an external provider like Supabase, ensure `?sslmode=require` is present in the connection string.

### 3. `Redis connection refused`
- **Cause:** `REDIS_URL` is pointing to localhost or incorrect port.
- **Fix:** Verify `REDIS_URL` matches the connection string provided by Render Redis. If using TLS (e.g. Upstash), ensure the protocol is `rediss://` or `REDIS_TLS=true`.

### 4. Background Worker not processing AI report jobs
- **Cause:** API and Worker are connected to different Redis instances or queues.
- **Fix:** Verify that both `clientpulse-api` and `clientpulse-worker` share the exact same `REDIS_URL` environment variable.
