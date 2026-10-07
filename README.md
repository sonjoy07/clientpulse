# ClientPulse API

ClientPulse is a consulting/agency project health and delivery management platform. This repository contains the backend REST API built with NestJS, TypeScript, PostgreSQL, and Prisma ORM.

---

## Tech Stack

* **Framework:** NestJS (v11)
* **Language:** TypeScript (Strict mode)
* **ORM:** Prisma ORM (v6)
* **Database:** PostgreSQL 16
* **Cache & Queues:** Redis 7 & BullMQ 6 (Asynchronous background processing)
* **Authentication:** Passport JWT (Access & Refresh tokens) + Bcrypt
* **Containerization:** Docker & Docker Compose
* **Validation & Transformations:** `class-validator` & `class-transformer`
* **Testing:** Jest & Supertest (Unit & E2E)

---

## Project Structure

```text
clientpulse-api/
├── prisma/
│   ├── migrations/             # Generated database migrations
│   ├── schema.prisma           # Prisma data models & relational constraints
│   └── seed.ts                 # Database seed script with demo data
├── src/
│   ├── auth/                   # Authentication & Authorization module
│   │   ├── decorators/         # @CurrentUser(), @Roles()
│   │   ├── dto/                # LoginDto, RefreshTokenDto
│   │   ├── guards/             # JwtAuthGuard, RolesGuard
│   │   ├── strategies/         # JwtStrategy (Passport)
│   │   ├── auth.controller.ts  # Auth endpoints (/login, /refresh, /logout, /me)
│   │   ├── auth.module.ts      # Auth module definition
│   │   └── auth.service.ts     # Password verification, JWT issue/revoke logic
│   ├── common/
│   │   └── filters/            # Global HttpExceptionFilter
│   ├── config/
│   │   ├── configuration.ts    # Typed configuration factory
│   │   └── env.validation.ts   # Class-validator environment schema
│   ├── health/
│   │   ├── health.controller.ts# GET /api/v1/health
│   │   ├── health.module.ts
│   │   └── health.service.ts   # Database connectivity health check
│   ├── prisma/
│   │   ├── prisma.module.ts    # Global Prisma module
│   │   └── prisma.service.ts   # PrismaClient lifecycle & health probe
│   ├── app.module.ts           # Root module with Config, Prisma, Health, Auth
│   └── main.ts                 # Bootstrap with /api/v1 prefix, CORS, validation
├── test/
│   ├── app.e2e-spec.ts         # Health & Global filter e2e tests
│   ├── auth.e2e-spec.ts        # Login, JWT, RBAC, Refresh token e2e tests
│   └── jest-e2e.json           # Jest E2E configuration
├── .env.example                # Environment variables template
├── .gitignore
├── docker-compose.yml          # PostgreSQL 16 container definition
├── Dockerfile                  # Production multi-stage Docker build
├── package.json
├── tsconfig.json               # Strict TypeScript configuration
└── README.md
```

---

## Prerequisites

* **Node.js:** v20+ (tested on v22)
* **npm:** v10+
* **Docker & Docker Compose**

---

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Verify required variables in `.env`:
   ```env
   NODE_ENV=development
   PORT=4000

   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clientpulse

   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=

   JWT_ACCESS_SECRET=your-access-secret-minimum-32-chars-long
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=your-refresh-secret-minimum-32-chars-long
   JWT_REFRESH_EXPIRES_IN=7d
   ```

---

## Infrastructure Setup (PostgreSQL 16 + Redis 7)

Start the PostgreSQL 16 database and Redis 7 queue broker containers:
```bash
docker compose up -d
```

Verify both containers are healthy:
```bash
docker compose ps
```

---

## Prisma Migrations & Seeding

1. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

2. Run Database Migrations:
   ```bash
   npx prisma migrate dev
   ```

3. Seed the Database with Demo Data:
   ```bash
   npx prisma db seed
   ```

### Seeded Demo Accounts (Password: `Password123!`):

| Role | Email |
| :--- | :--- |
| `ADMIN` | `admin@acme.example.com` |
| `PROJECT_MANAGER` | `pm@acme.example.com` |
| `TEAM_LEAD` | `lead@acme.example.com` |
| `TEAM_MEMBER` | `dev@acme.example.com` |
| `CLIENT` | `client.rep@globalretail.example.com` |

---

## Development & Build Commands

```bash
# Start in development watch mode
npm run start:dev

# Build production bundle
npm run build

# Start production build
npm run start:prod

# Lint and fix codebase
npm run lint

# Format code with Prettier
npm run format
```

---

## Testing

```bash
# Run unit tests
npm run test

# Run End-to-End (E2E) integration tests
npm run test:e2e
```

---

## API Endpoints Overview

Global Prefix: `/api/v1`

### Health Check

* `GET /api/v1/health`
  Returns service status and verifies PostgreSQL database connectivity.
  ```json
  {
    "status": "ok",
    "service": "clientpulse-api",
    "timestamp": "2026-10-07T06:43:45.771Z",
    "database": "connected"
  }
  ```

### Authentication & RBAC

* `POST /api/v1/auth/login`
  Authenticates user, returns user profile, short-lived Access Token (JWT), and Refresh Token (JWT).
  * Request:
    ```json
    {
      "email": "admin@acme.example.com",
      "password": "Password123!"
    }
    ```
  * Response (HTTP 200):
    ```json
    {
      "user": {
        "id": "1885682f-0e8e-4f73-93c0-f4c6eb6acb10",
        "name": "Alice Administrator",
        "email": "admin@acme.example.com",
        "role": "ADMIN",
        "organizationId": "4fd79af2-2560-4739-a936-8e056ba515e5"
      },
      "accessToken": "ey...",
      "refreshToken": "ey..."
    }
    ```

* `GET /api/v1/auth/me`
  Protected endpoint (`JwtAuthGuard`). Returns authenticated user profile derived from the Bearer token.
  * Header: `Authorization: Bearer <accessToken>`
  * Response (HTTP 200):
    ```json
    {
      "id": "1885682f-0e8e-4f73-93c0-f4c6eb6acb10",
      "name": "Alice Administrator",
      "email": "admin@acme.example.com",
      "role": "ADMIN",
      "organizationId": "4fd79af2-2560-4739-a936-8e056ba515e5"
    }
    ```

* `POST /api/v1/auth/refresh`
  Issues a new Access Token after validating signature, expiration, and database revocation status.
  * Request:
    ```json
    {
      "refreshToken": "ey..."
    }
    ```
  * Response (HTTP 200):
    ```json
    {
      "accessToken": "ey..."
    }
    ```

* `POST /api/v1/auth/logout`
  Revokes the stored refresh token in PostgreSQL (`revokedAt = NOW()`).
  * Request:
    ```json
    {
      "refreshToken": "ey..."
    }
    ```
  * Response (HTTP 200):
    ```json
    {
      "success": true,
      "message": "Logged out successfully"
    }
    ```

* `GET /api/v1/auth/admin-test`
  Demonstrates RBAC enforcement using `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` and `RolesGuard`.
  * Allows `ADMIN` / `SUPER_ADMIN` (HTTP 200).
  * Returns HTTP 403 Forbidden for other roles (e.g., `TEAM_MEMBER`).

---

### Client Management

* `POST /api/v1/clients`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`
  * `organizationId` is derived from the authenticated user token (not accepted in request body).
  * Request:
    ```json
    {
      "name": "John Smith",
      "companyName": "Acme Corporation",
      "email": "john@acme.com",
      "phone": "+1-555-0100"
    }
    ```

* `GET /api/v1/clients`
  * Query parameters: `?page=1&limit=10&search=acme` (default limit 10, max limit 100).
  * Search matches across `name`, `companyName`, and `email` (case-insensitive).
  * Only returns clients belonging to the authenticated user's organization.

* `GET /api/v1/clients/:id`
  * Returns client details along with the associated projects count (`_count: { projects: true }`).
  * Cross-organization access returns `404 Not Found`.

* `PATCH /api/v1/clients/:id`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`
  * All fields optional (`name`, `companyName`, `email`, `phone`).
  * Immutable fields like `id`, `organizationId`, and timestamps cannot be modified.

* `DELETE /api/v1/clients/:id`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`
  * If the client has existing projects, returns `409 Conflict` to prevent cascading business data loss.

---

### Project Management

* `POST /api/v1/projects`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`
  * Verifies `clientId` exists and belongs to the authenticated user's organization (returns `404 Not Found` otherwise).
  * Validates date range (`startDate <= endDate`); returns `400 Bad Request` if invalid.
  * Request:
    ```json
    {
      "clientId": "3e387140-5a7a-4ec6-b333-db1ba3f005d4",
      "name": "E-commerce Platform",
      "description": "Build a scalable commerce platform",
      "status": "PLANNING",
      "startDate": "2026-10-10",
      "endDate": "2027-01-10"
    }
    ```

* `GET /api/v1/projects`
  * Query parameters: `?page=1&limit=10&search=ecommerce&status=ACTIVE&clientId=...`
  * Search matches against `name` and `description`.
  * Filters by `status` (enum) and `clientId` (UUID).
  * Returns client summary (`id`, `companyName`) and counts (`projectMembers`, `milestones`, `tasks`) without N+1 queries.

* `GET /api/v1/projects/:id`
  * Returns project details, client summary, and counts for members, milestones, and tasks.
  * Cross-organization project lookup returns `404 Not Found`.

* `PATCH /api/v1/projects/:id`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`
  * Updates mutable fields (`name`, `description`, `status`, `startDate`, `endDate`).
  * Re-validates that `startDate <= endDate` against updated and existing values.
  * Changing `clientId` or `organizationId` via generic PATCH is forbidden.

* `DELETE /api/v1/projects/:id`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`
  * If dependent milestones or tasks exist, returns `409 Conflict` to preserve project audit trail and business history.

### Project Member Management

* `POST /api/v1/projects/:projectId/members`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`
  * Validates that both the project and the user belong to the authenticated user's organization (`404 Not Found` if either does not exist in the tenant).
  * Validates `allocationPercentage` as an integer between `0` and `100`.
  * Enforces uniqueness per `(projectId, userId)` (`409 Conflict` if the member is already on the project).
  * Request:
    ```json
    {
      "userId": "d748f22e-1317-4853-9114-142f3605e783",
      "allocationPercentage": 50
    }
    ```
  * Response (HTTP 201):
    ```json
    {
      "id": "e2f1837d-bfa2-43bb-a5a4-0ecad68a5c37",
      "projectId": "a67123aa-8d2b-426b-8002-3f7491107590",
      "userId": "d748f22e-1317-4853-9114-142f3605e783",
      "allocationPercentage": 50,
      "createdAt": "2026-10-07T07:30:00.000Z",
      "updatedAt": "2026-10-07T07:30:00.000Z",
      "user": {
        "id": "d748f22e-1317-4853-9114-142f3605e783",
        "name": "Bob Developer",
        "email": "bob@acme.example.com",
        "role": "TEAM_MEMBER"
      }
    }
    ```

* `GET /api/v1/projects/:projectId/members`
  * Allowed: Any authenticated user within the organization having access to the project.
  * Query parameters: `?page=1&limit=10` (default limit 10, max limit 100).
  * Returns paginated member list with user summary.

* `PATCH /api/v1/projects/:projectId/members/:memberId`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`
  * Updates `allocationPercentage` (integer 0–100).
  * Request:
    ```json
    {
      "allocationPercentage": 75
    }
    ```

* `DELETE /api/v1/projects/:projectId/members/:memberId`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`
  * Removes member assignment from project.

---

### Resource Allocation & Capacity

* `GET /api/v1/resources/users/:userId`
  * Allowed: Authenticated users in the organization.
  * Calculates total cross-project allocation and returns detailed breakdown of assigned projects:
    * `totalAllocationPercentage`: Sum of all project allocations.
    * `status`: Capacity status based on thresholds:
      * `0% - 89%` $\rightarrow$ `AVAILABLE`
      * `90% - 100%` $\rightarrow$ `FULL`
      * `> 100%` $\rightarrow$ `OVERALLOCATED`
  * Response (HTTP 200):
    ```json
    {
      "user": {
        "id": "d748f22e-1317-4853-9114-142f3605e783",
        "name": "Bob Developer",
        "email": "bob@acme.example.com",
        "role": "TEAM_MEMBER"
      },
      "totalAllocationPercentage": 110,
      "status": "OVERALLOCATED",
      "allocations": [
        {
          "projectMemberId": "e2f1837d-bfa2-43bb-a5a4-0ecad68a5c37",
          "projectId": "a67123aa-8d2b-426b-8002-3f7491107590",
          "projectName": "E-commerce Platform",
          "projectStatus": "ACTIVE",
          "allocationPercentage": 60
        },
        {
          "projectMemberId": "fc1a89c3-1d01-4475-9c98-15cf451a44c2",
          "projectId": "b18234bb-9e3c-437c-9003-4f85022186a1",
          "projectName": "Mobile Companion App",
          "projectStatus": "PLANNING",
          "allocationPercentage": 50
        }
      ]
    }
    ```

* `GET /api/v1/resources/overview`
  * Allowed: Authenticated users in the organization.
  * Query parameters: `?page=1&limit=10&search=bob&status=OVERALLOCATED`
  * Filters across organization users, aggregating cross-project allocations per user.
  * Provides paginated summary showing utilization and capacity bottlenecks.

---

### Milestone Management

* `POST /api/v1/projects/:projectId/milestones`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD` (CLIENT role forbidden).
  * Validates that project belongs to the authenticated user's organization (`404 Not Found` otherwise).
  * Validates dates (`startDate <= dueDate`); returns `400 Bad Request` if invalid.
  * Request:
    ```json
    {
      "name": "Payment Integration",
      "description": "Complete payment gateway integration and testing",
      "startDate": "2026-10-10",
      "dueDate": "2026-10-25",
      "status": "PENDING"
    }
    ```

* `GET /api/v1/projects/:projectId/milestones`
  * Query parameters: `?page=1&limit=10&status=PENDING&search=payment`
  * Returns paginated milestones with dynamically calculated progress and task counts (zero N+1 queries):
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "c1f2389a-0e91-4e78-9842-7cf16a03e1b2",
          "name": "Payment Integration",
          "description": "Complete payment gateway integration and testing",
          "status": "IN_PROGRESS",
          "startDate": "2026-10-10T00:00:00.000Z",
          "dueDate": "2026-10-25T00:00:00.000Z",
          "progress": 60,
          "taskCount": 5,
          "completedTaskCount": 3
        }
      ],
      "meta": {
        "page": 1,
        "limit": 10,
        "total": 1,
        "totalPages": 1
      }
    }
    ```

* `GET /api/v1/projects/:projectId/milestones/:milestoneId`
  * Returns milestone details, project summary, task counts, and calculated progress.
  * Cross-organization access returns `404 Not Found`.

* `PATCH /api/v1/projects/:projectId/milestones/:milestoneId`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.
  * Allows updating `name`, `description`, `startDate`, `dueDate`, `status`.
  * Prevents marking milestone `COMPLETED` when unfinished tasks exist (`409 Conflict`).

* `DELETE /api/v1/projects/:projectId/milestones/:milestoneId`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`.
  * If tasks are assigned to the milestone, returns `409 Conflict` to prevent accidental business data loss.

---

### Task Management

* `POST /api/v1/projects/:projectId/tasks`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD` (TEAM_MEMBER and CLIENT forbidden).
  * Validates assignee is an active `ProjectMember` of this project (`400 Bad Request` if not).
  * Validates milestone belongs to this project (`400 Bad Request` if not).
  * Request:
    ```json
    {
      "title": "Implement Stripe webhook",
      "description": "Handle successful and failed payment events",
      "status": "TODO",
      "priority": "HIGH",
      "milestoneId": "c1f2389a-0e91-4e78-9842-7cf16a03e1b2",
      "assigneeId": "d748f22e-1317-4853-9114-142f3605e783",
      "dueDate": "2026-10-20"
    }
    ```

* `GET /api/v1/projects/:projectId/tasks`
  * Query parameters: `?page=1&limit=10&status=IN_PROGRESS&priority=HIGH&milestoneId=...&assigneeId=...&search=stripe`
  * Returns paginated tasks with safe assignee (`id`, `name`, `email`, `role`) and milestone references.
  * Sensitive credentials (`passwordHash`, tokens) are never leaked.

* `GET /api/v1/projects/:projectId/tasks/:taskId`
  * Returns task details, safe assignee profile, milestone info, and project reference.

* `PATCH /api/v1/projects/:projectId/tasks/:taskId`
  * Allowed:
    * `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`: Full task updates (re-validating assignee project membership and milestone relations).
    * `TEAM_MEMBER`: Allowed ONLY on tasks assigned to themselves, and ONLY updating `status` and `description` (`403 Forbidden` otherwise).
    * `CLIENT`: Forbidden.

* `DELETE /api/v1/projects/:projectId/tasks/:taskId`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.
  * `TEAM_MEMBER` and `CLIENT` cannot delete tasks (`403 Forbidden`).

---

### Delivery Summary & Timeline Health

* `GET /api/v1/projects/:projectId/delivery-summary`
  * Returns real-time project delivery metrics calculated from actual task and milestone data:
  * Response (HTTP 200):
    ```json
    {
      "success": true,
      "data": {
        "projectId": "a67123aa-8d2b-426b-8002-3f7491107590",
        "projectName": "E-commerce Platform",
        "progress": 70,
        "tasks": {
          "total": 20,
          "todo": 3,
          "inProgress": 2,
          "blocked": 1,
          "done": 14
        },
        "milestones": {
          "total": 5,
          "completed": 3,
          "inProgress": 1,
          "blocked": 1,
          "pending": 0
        },
        "timeline": {
          "status": "ON_TRACK",
          "expectedProgress": 65,
          "actualProgress": 70
        }
      }
    }
    ```
  * **Progress Formula:** `actualProgress = (completedTasks / totalTasks) * 100` (rounded integer, 0% if 0 tasks).
  * **Timeline Calculation:** Compares elapsed duration against scheduled duration, deriving `expectedProgress`.
    * `actualProgress >= expectedProgress - 10` $\rightarrow$ `ON_TRACK`
    * `actualProgress < expectedProgress - 10 && actualProgress >= expectedProgress - 25` $\rightarrow$ `AT_RISK`
    * `actualProgress < expectedProgress - 25` $\rightarrow$ `CRITICAL`
    * If `now < startDate`: `NOT_STARTED`
    * If project status is `COMPLETED`: `COMPLETED`

---

### Project Budget & Cost Tracking

* `POST /api/v1/projects/:projectId/budget`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER` (TEAM_LEAD, TEAM_MEMBER, CLIENT forbidden).
  * Enforces only 1 active budget per project (`409 Conflict` if one already exists).
  * Request:
    ```json
    {
      "totalBudget": 50000,
      "currency": "USD"
    }
    ```

* `GET /api/v1/projects/:projectId/budget`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.
  * Computes `spent` dynamically from recorded `CostEntry` records, returning `remaining` and `budgetUsedPercentage`:
    ```json
    {
      "success": true,
      "data": {
        "projectId": "a67123aa-8d2b-426b-8002-3f7491107590",
        "totalBudget": 50000,
        "currency": "USD",
        "spent": 32500,
        "remaining": 17500,
        "budgetUsedPercentage": 65
      }
    }
    ```

* `PATCH /api/v1/projects/:projectId/budget`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`.
  * Allows updating `totalBudget` and `currency`.
  * Changing `currency` after cost entries exist is forbidden to protect financial integrity (`409 Conflict`).

* `POST /api/v1/projects/:projectId/budget/costs`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.
  * Records cost entry with category (`LABOR`, `INFRASTRUCTURE`, `SOFTWARE`, `THIRD_PARTY`, `TRAVEL`, `OTHER`).
  * Request:
    ```json
    {
      "amount": 2500,
      "category": "INFRASTRUCTURE",
      "description": "AWS ECS cluster hosting",
      "incurredAt": "2026-10-05T00:00:00.000Z"
    }
    ```

* `GET /api/v1/projects/:projectId/budget/costs`
  * Query parameters: `?page=1&limit=10&category=INFRASTRUCTURE&fromDate=...&toDate=...&search=AWS`
  * Returns paginated cost entries with safe creator summary (`id`, `name`).

* `GET /api/v1/projects/:projectId/budget/costs/:costId`
  * Returns cost entry details. Safe `404 Not Found` across tenants.

* `PATCH /api/v1/projects/:projectId/budget/costs/:costId`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.
  * Updates `amount`, `category`, `description`, or `incurredAt`.

* `DELETE /api/v1/projects/:projectId/budget/costs/:costId`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`.
  * Restricts financial deletion; `TEAM_LEAD` and `TEAM_MEMBER` cannot delete cost records (`403 Forbidden`).

---

### Budget Summary & Burn Rate Engine

* `GET /api/v1/projects/:projectId/budget/summary`
  * Allowed Roles: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.
  * Computes financial burn vs. scheduled timeline elapsed burn:
  * Response (HTTP 200):
    ```json
    {
      "success": true,
      "data": {
        "budget": {
          "total": 50000,
          "spent": 32500,
          "remaining": 17500,
          "usedPercentage": 65,
          "currency": "USD",
          "status": "UNDER_CONTROL"
        },
        "timeline": {
          "timeBurnPercentage": 50
        },
        "burnRate": {
          "budgetBurnPercentage": 65,
          "timeBurnPercentage": 50,
          "difference": 15,
          "status": "BURNING_FAST"
        }
      }
    }
    ```
  * **Budget Status Rules:**
    * `usedPercentage < 80%` $\rightarrow$ `UNDER_CONTROL`
    * `80% <= usedPercentage <= 100%` $\rightarrow$ `AT_RISK`
    * `usedPercentage > 100%` $\rightarrow$ `OVER_BUDGET` (retains unclamped values such as 110%)
    * Missing budget $\rightarrow$ `NOT_CONFIGURED`
  * **Burn Rate Rules:**
    * Compares `budgetBurnPercentage` vs `timeBurnPercentage`:
      * `budgetBurn <= timeBurn + 10` $\rightarrow$ `ON_TRACK`
      * `timeBurn + 10 < budgetBurn <= timeBurn + 25` $\rightarrow$ `BURNING_FAST`
      * `budgetBurn > timeBurn + 25` OR `OVER_BUDGET` $\rightarrow$ `CRITICAL`

* `GET /api/v1/projects/:projectId/budget/breakdown`
  * Returns database-aggregated category distribution and percentage breakdown:
    ```json
    {
      "success": true,
      "data": [
        {
          "category": "LABOR",
          "amount": 18000,
          "percentage": 55.38
        },
        {
          "category": "INFRASTRUCTURE",
          "amount": 8000,
          "percentage": 24.62
        },
        {
          "category": "SOFTWARE",
          "amount": 6500,
          "percentage": 20
        }
      ]
    }
    ```

* `GET /api/v1/projects/:projectId/budget/monthly`
  * Aggregates costs grouped by month using PostgreSQL `TO_CHAR(incurredAt, 'YYYY-MM')`:
    ```json
    {
      "success": true,
      "data": [
        {
          "month": "2026-09",
          "amount": 18000
        },
        {
          "month": "2026-10",
          "amount": 14500
        }
      ]
    }
    ```

### Step 8: Advanced Resource Allocation & Capacity Planning Endpoints

* `GET /api/v1/resources/users/:userId`
  * Returns user resource profile with `totalAllocation`, `availableCapacity` (clamped at 0), `overallocatedBy`, and `status`.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD` can view any internal user; `TEAM_MEMBER` can view only their own profile; `CLIENT` is forbidden (403).
  * Example Response:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "c1f77d61-3962-49b8-bc8c-1a8435d7963b",
          "name": "Jane Developer",
          "email": "jane@pulse.io",
          "role": "TEAM_MEMBER"
        },
        "projects": [
          {
            "projectId": "a3b98c12-3456-7890-abcd-ef0123456789",
            "projectName": "Project Alpha",
            "allocationPercentage": 70
          },
          {
            "projectId": "b4c09d23-4567-8901-bcde-f0123456789a",
            "projectName": "Project Beta",
            "allocationPercentage": 40
          }
        ],
        "totalAllocation": 110,
        "availableCapacity": 0,
        "overallocatedBy": 10,
        "status": "OVERALLOCATED"
      }
    }
    ```

* `GET /api/v1/resources/overview`
  * Returns organization resource overview excluding `CLIENT` users, with an aggregated summary, filters (`status`, `role`, `minAllocation`, `maxAllocation`, `search`), and pagination.
  * Query parameters: `page`, `limit`, `status`, `role`, `minAllocation`, `maxAllocation`, `search`.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.
  * Example Response:
    ```json
    {
      "success": true,
      "summary": {
        "totalResources": 12,
        "averageAllocation": 82.5,
        "availableCount": 4,
        "fullCount": 6,
        "overallocatedCount": 2
      },
      "data": [
        {
          "user": {
            "id": "c1f77d61-3962-49b8-bc8c-1a8435d7963b",
            "name": "Jane Developer",
            "email": "jane@pulse.io",
            "role": "TEAM_MEMBER"
          },
          "projects": [...],
          "totalAllocation": 110,
          "availableCapacity": 0,
          "overallocatedBy": 10,
          "status": "OVERALLOCATED"
        }
      ],
      "meta": {
        "page": 1,
        "limit": 20,
        "total": 12,
        "totalPages": 1
      }
    }
    ```

* `GET /api/v1/resources/overallocated`
  * Lists users with `totalAllocation > 100%`, sorted in descending order of `overallocatedBy`.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/resources/available`
  * Lists users with `totalAllocation < 90%`, sorted in descending order of `availableCapacity`.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/resources/utilization`
  * Returns organization-wide capacity utilization metrics:
    ```json
    {
      "success": true,
      "data": {
        "totalResources": 15,
        "totalAllocatedCapacity": 1235,
        "availableCapacity": 315,
        "averageAllocation": 82.33,
        "availableResources": 5,
        "fullyAllocatedResources": 8,
        "overallocatedResources": 2
      }
    }
    ```
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/resources/distribution`
  * Returns organization resource distribution counts and percentages across statuses:
    ```json
    {
      "success": true,
      "data": {
        "total": 15,
        "available": { "count": 5, "percentage": 33.33 },
        "full": { "count": 8, "percentage": 53.33 },
        "overallocated": { "count": 2, "percentage": 13.33 }
      }
    }
    ```
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/resources/projects/ranking`
  * Returns projects ranked in descending order of total capacity consumed (`totalAllocation`), including `memberCount` and `averageMemberAllocation`.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/projects/:projectId/resources`
  * Returns project capacity status and member allocations.
  * `capacityStatus`: `UNDERSTAFFED` (<50%), `BALANCED` (50%-90%), `HIGH_UTILIZATION` (>90%).
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`. `TEAM_MEMBER` allowed only if assigned as a member of the project; `CLIENT` forbidden (403).
  * Example Response:
    ```json
    {
      "success": true,
      "data": {
        "projectId": "a3b98c12-3456-7890-abcd-ef0123456789",
        "projectName": "Project Alpha",
        "projectStatus": "ACTIVE",
        "totalMembers": 3,
        "totalAllocation": 150,
        "averageAllocation": 50,
        "capacityStatus": "BALANCED",
        "members": [
          {
            "userId": "c1f77d61-3962-49b8-bc8c-1a8435d7963b",
            "name": "Jane Developer",
            "email": "jane@pulse.io",
            "role": "TEAM_MEMBER",
            "allocationPercentage": 70,
            "totalUserAllocation": 110,
            "userStatus": "OVERALLOCATED"
          }
        ]
      }
    }
    ```

### Step 10: Client Portal & Client Isolation Endpoints

All Client Portal endpoints require `Bearer JWT` authentication and `Role: CLIENT`. The authenticated user's `clientId` is extracted from the secure JWT context (`request.user.clientId`), guaranteeing that clients can only access their own data.

* `GET /api/v1/client-portal/dashboard`
  * Returns client profile, high-level project summary, and sanitized list of client projects with progress and milestone totals.
  * Example Response:
    ```json
    {
      "success": true,
      "data": {
        "client": {
          "id": "e4a77b81-1234-5678-abcd-0123456789ab",
          "name": "Global Retail Customer Success",
          "companyName": "Global Retail Enterprises Inc."
        },
        "summary": {
          "totalProjects": 1,
          "activeProjects": 1,
          "completedProjects": 0
        },
        "projects": [
          {
            "id": "a3b98c12-3456-7890-abcd-ef0123456789",
            "name": "E-Commerce Re-platforming",
            "description": "Modernizing core checkout flow",
            "status": "ACTIVE",
            "startDate": "2026-10-01T00:00:00.000Z",
            "endDate": "2027-04-30T00:00:00.000Z",
            "progress": 68,
            "timelineStatus": "ON_TRACK",
            "milestones": {
              "total": 3,
              "completed": 1,
              "inProgress": 1,
              "blocked": 0
            }
          }
        ]
      }
    }
    ```

* `GET /api/v1/client-portal/projects`
  * Lists projects belonging strictly to the authenticated user's client account.
  * Query parameters: `page` (default 1), `limit` (default 10, max 100), `search`, `status`.
  * Returns paginated client-safe projects with `data` and `meta`.

* `GET /api/v1/client-portal/projects/:projectId`
  * Returns details for a specific project.
  * Returns `404 Not Found` if the project does not exist, belongs to another organization, or belongs to another client.

* `GET /api/v1/client-portal/projects/:projectId/progress`
  * Returns client-safe delivery progress (`progress`, client-friendly delivery `status`, milestone counts, and sanitized `timeline`).

* `GET /api/v1/client-portal/projects/:projectId/milestones`
  * Lists milestones for the project with completion status and progress percentage.
  * Internal task details, assignees, and developer comments are completely omitted.

* `GET /api/v1/client-portal/projects/:projectId/status`
  * Returns simplified client status (`NOT_STARTED`, `ON_TRACK`, `AT_RISK`, `DELAYED`, `COMPLETED`) and communication message:
    ```json
    {
      "success": true,
      "data": {
        "projectId": "a3b98c12-3456-7890-abcd-ef0123456789",
        "projectName": "E-Commerce Re-platforming",
        "status": "ON_TRACK",
        "progress": 68,
        "message": "Project delivery is currently on track."
      }
    }
    ```

### Step 11: AI Weekly Client Status Reports Endpoints

AI Weekly Client Status Reports synthesize real delivery metrics (progress %, milestone completion, budget burn rate, and active blockers) into client-ready executive narratives. Internal domain services remain the authoritative source of truth for all metrics; LLMs strictly provide synthesis, executive explanation, and actionable next steps.

* `POST /api/v1/projects/:projectId/ai-reports`
  * Generates an executive weekly status report for a given reporting period (`periodStart` to `periodEnd`).
  * Idempotent: returns existing completed report for the same period without duplicate LLM calls unless `force: true` is passed.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`. (`CLIENT` and `TEAM_MEMBER` forbidden - 403).
  * Request Body:
    ```json
    {
      "periodStart": "2026-03-01T00:00:00.000Z",
      "periodEnd": "2026-03-07T00:00:00.000Z",
      "force": false
    }
    ```
  * Example Response:
    ```json
    {
      "success": true,
      "data": {
        "id": "e8a91b23-c456-4789-8901-234567abcdef",
        "projectId": "a3b98c12-3456-7890-abcd-ef0123456789",
        "periodStart": "2026-03-01T00:00:00.000Z",
        "periodEnd": "2026-03-07T00:00:00.000Z",
        "status": "COMPLETED",
        "summary": "Weekly executive delivery update: Core checkout modernization progressed steadily with 68% overall milestone completion. Infra provisioning was finalized ahead of schedule, keeping overall delivery pace on track.",
        "highlights": [
          "Overall delivery progress achieved 68% completion.",
          "Milestone 1 Discovery completed successfully.",
          "Timeline health evaluated as ON_TRACK with no schedule variance."
        ],
        "achievements": [
          "Kubernetes cluster infrastructure provisioned and certified.",
          "Payment gateway webhook synchronization finalized."
        ],
        "concerns": [
          "Active blocker on third-party carrier webhook token validation."
        ],
        "nextSteps": [
          "Initiate end-to-end integration testing for stage 2 checkout flow.",
          "Schedule client milestone sign-off review for Phase 1 deliverables."
        ],
        "model": "gpt-4o-mini",
        "generatedAt": "2026-03-07T12:00:00.000Z",
        "errorMessage": null,
        "createdAt": "2026-03-07T12:00:00.000Z",
        "updatedAt": "2026-03-07T12:00:00.000Z"
      }
    }
    ```

* `GET /api/v1/projects/:projectId/ai-reports`
  * Returns paginated list of generated status reports for a project.
  * Query parameters: `page`, `limit`, `status` (`PENDING`, `GENERATING`, `COMPLETED`, `FAILED`), `from`, `to`.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/projects/:projectId/ai-reports/:reportId`
  * Retrieves detailed status report by ID.
  * Includes internal generation metadata (`model`, `generatedAt`, `errorMessage`).
  * Enforces organization-level tenant isolation (cross-tenant access returns 404).
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/client-portal/projects/:projectId/reports`
  * Returns client-safe weekly status reports for the client's own project.
  * Strictly filters for reports in `COMPLETED` status.
  * Completely strips internal implementation details (`model`, `errorMessage`, `organizationId`).
  * Enforces strict client isolation: accessing another client's project returns `404 Not Found`.
  * RBAC: `CLIENT`.

* `GET /api/v1/client-portal/projects/:projectId/reports/:reportId`
  * Retrieves single client-safe weekly status report by ID.
  * Returns `404 Not Found` if the report does not exist, is not completed, or belongs to another client.
  * RBAC: `CLIENT`.

### Step 12: Redis + BullMQ Background Job Architecture

Expensive and non-deterministic operations (such as AI report synthesis) are processed asynchronously using BullMQ and Redis 7, moving long-running workloads out of synchronous HTTP request lifecycles.

```text
Client Request
      │
      ▼
POST /api/v1/projects/:id/ai-reports
      │
      ├── 1. Validate dates & permissions
      ├── 2. Check DB: if COMPLETED and !force, return 200 OK immediately
      ├── 3. If PENDING/GENERATING, return 202 Accepted (no duplicate enqueue)
      ├── 4. Upsert DB record in PENDING status
      └── 5. Enqueue job to BullMQ queue: 'ai-report'
            │
            ▼
      HTTP 202 Accepted { status: "PENDING", message: "Report generation queued" }

Background Worker (AiReportProcessor)
      │
      ├── 1. Check idempotency: skip if already COMPLETED in PostgreSQL
      ├── 2. Transition status to GENERATING in PostgreSQL
      ├── 3. Build snapshot from PostgreSQL (domain source of truth)
      ├── 4. Invoke LLM provider with exponential retry backoff
      ├── 5. Validate schema and save COMPLETED report to PostgreSQL
      └── On Max Failure: Update status to FAILED with errorMessage in PostgreSQL
```

#### Endpoints & Background Capabilities

* `POST /api/v1/projects/:projectId/ai-reports`
  * Asynchronously dispatches weekly report generation to the `ai-report` BullMQ queue.
  * Responds immediately with `202 Accepted` and `{ status: "PENDING", message: "Report generation queued" }`.
  * Idempotency & Duplicate prevention:
    * If an identical completed report already exists and `force: false`, returns `200 OK` with the completed report.
    * If a report is already `PENDING` or `GENERATING`, returns `202 Accepted` without enqueueing duplicate jobs.
  * Worker automatic retries: 3 attempts with exponential backoff (`2000ms`, `4000ms`, `8000ms`).
  * Graceful failure handling: If Redis is unreachable on enqueue, marks the report `FAILED` and throws `503 Service Unavailable` without issuing a false 202.
  * RBAC: `SUPER_ADMIN`, `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`.

* `GET /api/v1/admin/queues/ai-reports`
  * Real-time BullMQ queue metrics monitoring:
    ```json
    {
      "success": true,
      "data": {
        "queue": "ai-report",
        "waiting": 0,
        "active": 0,
        "completed": 14,
        "failed": 0,
        "delayed": 0
      }
    }
    ```
  * RBAC: `SUPER_ADMIN`, `ADMIN` only (`CLIENT`, `PROJECT_MANAGER`, `TEAM_LEAD`, `TEAM_MEMBER` forbidden - 403).

* `GET /api/v1/health`
  * Enhanced health check probing PostgreSQL database and Redis connectivity:
    ```json
    {
      "status": "ok",
      "service": "clientpulse-api",
      "timestamp": "2026-03-07T12:00:00.000Z",
      "database": "connected",
      "dependencies": {
        "postgres": "up",
        "redis": "up"
      }
    }
    ```
  * Graceful degradation: If Redis is temporarily down but PostgreSQL is up, the API continues serving HTTP requests and returns `status: "ok"` with `redis: "down"`.

---

## Multi-Tenant Security & Design Decisions

1. **Organization Isolation:** Every query strictly enforces `organizationId = currentUser.organizationId`. Single-entity lookups use `findFirst({ where: { id, organizationId } })` to ensure cross-tenant resources cannot be read or modified.
2. **Safe 404 on Cross-Tenant Access:** Accessing a resource belonging to another organization responds with `404 Not Found` rather than `403 Forbidden`, preventing attackers from enumerating valid resource IDs across tenants.
3. **No Blind Cascade Deletion (409 Conflict):** Deleting clients with projects or projects/milestones with dependent tasks returns `409 Conflict`. This preserves auditability and avoids catastrophic accidental data loss.
4. **N+1 Query Prevention:** List endpoints retrieve relational summaries and entity counts in a single database round-trip via Prisma `_count`, `groupBy`, and selective `include`.
5. **Secure Token Storage:** Refresh tokens are hashed using SHA-256 before storage in PostgreSQL and revoked on logout.
6. **Explicit RBAC:** Routes enforce explicit role requirements using `@Roles(...)` and `RolesGuard` without hierarchical assumptions.
7. **Resource Allocation Status Derivation:** Allocation status (`AVAILABLE`, `FULL`, `OVERALLOCATED`) is dynamically calculated from the single source of truth (`ProjectMember` rows) across active projects, guaranteeing integrity without denormalization drift.
8. **Real Delivery Metrics:** Milestone and project progress are computed strictly from underlying task completion states, never static or manually editable percentages.
9. **Assignee Boundary Enforcement:** Tasks can only be assigned to users who are active `ProjectMember` records within that specific project.
10. **Timeline Health vs. Project Status Separation:** Project lifecycle (`ProjectStatus`) is kept strictly separate from the delivery pace health indicator (`TimelineStatus`).
11. **Decimal Precision for Money:** Budgets and cost amounts are defined as PostgreSQL numeric/Prisma Decimal types (`Decimal(12, 2)`), preventing binary floating point inaccuracies.
12. **Cost Entries as Source of Truth:** `spent` is always dynamically aggregated from `CostEntry` records, preventing concurrent counter desynchronization.
13. **Internal Financial Isolation:** All financial endpoints strictly forbid `CLIENT` and regular `TEAM_MEMBER` roles from accessing internal costs, budgets, and burn rates.
14. **Capacity Clamping & Client Exclusion:** `availableCapacity` is safely clamped at `Math.max(0, 100 - totalAllocation)` to avoid negative capacity representations, while `overallocatedBy` tracks excess. `CLIENT` accounts are excluded from organization team capacity calculations.
15. **Scoped Member Visibility:** Regular team members (`TEAM_MEMBER`) can only inspect their own individual resource profile and the resource breakdown of projects to which they are assigned.
16. **Client Isolation & Identity Enforcement:** A `CLIENT` user must have an explicit `clientId`. `clientId` is NEVER accepted from request parameters or headers; it is strictly loaded from the authenticated JWT session.
17. **Cross-Client Enumeration Defense:** When a client requests a project that exists but belongs to a different client, the API returns `404 Not Found` to prevent project ID enumeration across clients.
18. **Strict Data Leakage Protection:** Client portal endpoints pass internal entities through dedicated serializers (`ClientProjectSerializer`), stripping financial records, cost entries, employee utilization/staffing, raw risk engine formulas, and internal database IDs.
19. **Delivery Status Abstraction:** Internal management signals (such as `CRITICAL` timeline or internal risk scores) are mapped to client-friendly statuses (`DELAYED`, `AT_RISK`, `ON_TRACK`) with clear communication messaging.
20. **AI Output Grounding (Domain Source of Truth):** Progress percentages, milestone status, timeline health, and budget status are never calculated by the LLM. The authoritative domain services calculate all metrics, and the LLM receives a sanitized snapshot strictly to generate executive explanations.
21. **Prompt Injection Defense:** Untrusted project descriptions and task titles are demarcated inside `<UNTRUSTED_PROJECT_DATA>` tags. System prompts instruct the LLM to ignore any instructions, prompts, or commands found within untrusted content.
22. **Strict LLM Output Validation:** All LLM outputs must parse as valid JSON and satisfy rigid structural schema constraints (validated by `AiReportValidatorService`). Markdown code fences are stripped, field lengths are enforced, and non-empty arrays are validated.
23. **Idempotency & Cost Control:** Reports are indexed with a unique compound constraint on `[projectId, periodStart, periodEnd]`. Repeated generation requests return the existing completed report, preventing redundant AI provider token consumption unless explicit `force: true` is provided.
24. **AI Client Portal Privacy:** Reports displayed in the Client Portal omit LLM provider identifiers, internal model names (`model`), internal generation error messages, and prompt tokens, ensuring an executive, client-safe presentation.
25. **PostgreSQL as Sole Authoritative Source of Truth:** Redis is used exclusively for ephemeral job queues and runtime metrics. Job state transitions (`PENDING`, `GENERATING`, `COMPLETED`, `FAILED`) are persisted in PostgreSQL.
26. **Minimal Queue Payloads:** Job data in Redis contains only lightweight identifiers (`reportId`, `projectId`, `organizationId`, and ISO dates). No sensitive user data, passwords, JWT tokens, employee salaries, or full database models are transmitted to or stored in Redis.
27. **Queue Idempotency by Job ID:** Jobs are enqueued with deterministic `jobId: ai-report-${report.id}`. Completed job records are capped (`removeOnComplete: 100`, `removeOnFail: 200`) to prevent Redis memory bloat.
28. **Graceful Queue Degradation:** An unreachable Redis broker fails fast with a controlled `503 Service Unavailable` on queue operations and marks the database entity as `FAILED`, never returning a false `202 Accepted`. General API health remains healthy even during temporary Redis blips.
29. **Test Isolation & Determinism:** Test helpers (`cleanDatabase()`) execute truncation across relational dependencies in strict foreign-key order. Sequential E2E test runs (`--runInBand`) prevent database lock contention across Postgres transactions.

---

## Testing & Production Reliability (Step 13)

ClientPulse features an enterprise-grade, comprehensive testing architecture engineered to verify business logic, security boundaries, multi-tenant isolation, background workers, and performance invariants.

### 1. Test Architecture Overview

```text
clientpulse-api/
├── src/                          # Unit & Service-Level Tests (*.spec.ts)
│   ├── projects/services/
│   │   ├── risk-engine.service.spec.ts       # 8 unit tests: deterministic risk identification
│   │   ├── health-score.service.spec.ts      # 8 unit tests: 0-100 score boundaries & caps
│   ├── projects/
│   │   ├── delivery-summary.types.spec.ts    # 13 unit tests: task delivery formulas & pace
│   ├── budgets/
│   │   ├── budget-calculation.service.spec.ts# 10 unit tests: burn rate, time elapsed, overrun
│   ├── resources/
│   │   ├── resources.service.spec.ts         # Resource utilization, capacity clamping
│   │   ├── resources.types.spec.ts           # Status derivation rules (AVAILABLE/FULL/OVERALLOCATED)
│   ├── ai-reports/
│   │   ├── services/ai-report-validator.service.spec.ts # Strict schema, length, and code-fence parsing
│   │   ├── processors/ai-report.processor.spec.ts       # BullMQ worker lifecycle & retries
│   └── queues/
│       ├── queue-monitor.service.spec.ts     # Health and queue state inspections
└── test/                         # End-to-End Integration Suites (*.e2e-spec.ts)
    ├── regression.e2e-spec.ts    # Master 11-step consulting delivery workflow
    ├── security.e2e-spec.ts      # Comprehensive security, RBAC, IDOR & prompt injection suite
    ├── client-project.e2e-spec.ts# Client & project CRUD + isolation
    ├── milestones-tasks-delivery.e2e-spec.ts # Milestone & task delivery progress
    ├── budgets-costs-burnrate.e2e-spec.ts    # Budget tracking, cost entries & burn rates
    ├── advanced-resources.e2e-spec.ts        # Capacity planning & allocation
    ├── client-portal.e2e-spec.ts # Client portal object-level isolation & serialization
    ├── ai-reports.e2e-spec.ts    # Asynchronous AI report generation lifecycle
    ├── queues.e2e-spec.ts        # BullMQ queue management & graceful degradation
    ├── auth.e2e-spec.ts          # Authentication, token rotation & RBAC
    ├── app.e2e-spec.ts           # Global filters & system health probes
    ├── factories/                # Reusable Prisma test data factories
    │   ├── organization.factory.ts
    │   ├── user.factory.ts
    │   ├── client.factory.ts
    │   ├── project.factory.ts
    │   ├── milestone.factory.ts
    │   ├── task.factory.ts
    │   └── budget.factory.ts
    └── helpers/                  # Integration testing testbed utilities
        ├── auth.helper.ts        # Auth token generation & header injection
        └── database.helper.ts    # Relational clean-up (cleanDatabase)
```

### 2. Running Tests

```bash
# 1. Run full unit & service test suite with coverage
npm test -- --coverage

# 2. Run all End-to-End integration tests sequentially
npm run test:e2e

# 3. Run the Master Regression workflow specifically
npx jest --config ./test/jest-e2e.json test/regression.e2e-spec.ts

# 4. Run the Comprehensive Security suite specifically
npx jest --config ./test/jest-e2e.json test/security.e2e-spec.ts

# 5. Run static analysis and linting verification
npm run lint

# 6. Verify production build compilation
npm run build
```

### 3. Coverage Summary & Key Test Metrics

* **Unit & Service Tests:** 25 suites, 193 tests (100% passing).
* **End-to-End Suites:** 12 suites, 170 tests (100% passing).
* **Total Automated Tests:** 363 tests across the platform.
* **Core Logic Coverage:**
  * Risk Engine (`risk-engine.service.ts`): **100%** statement, branch, and function coverage.
  * Health Score Service (`health-score.service.ts`): **96.96%** statement, **95.23%** branch coverage.
  * Delivery Progress Formulas (`delivery-summary.types.ts`): **100%** coverage.
  * Budget Calculation Engine (`budget-calculation.service.ts`): **100%** coverage.
  * Resource Capacity Derivation (`resources.types.ts`): **100%** coverage.
  * Queue Monitoring (`queue-monitor.service.ts`): **100%** coverage.

### 4. Master Regression Workflow (`test/regression.e2e-spec.ts`)

Simulates a real-world, complete consulting engagement from day 1 kickoff through client handoff:
1. **PM Creates Client:** Creates client organization via POST `/api/v1/clients`.
2. **PM Creates Project:** Sets timeline (`startDate`, `endDate`), status `ACTIVE`.
3. **PM Adds Team Member:** Allocates engineer with 50% capacity via POST `/api/v1/projects/:id/members`.
4. **PM Creates Milestone:** Defines delivery milestone due in 3 weeks.
5. **PM Creates Tasks:** Dispatches tasks assigned to the allocated member.
6. **Task Execution & Delivery Progress:** Member marks tasks `DONE`; verifies GET `/api/v1/projects/:id/delivery-summary` computes 100% completion pace without manual percentage entry.
7. **Budget & Cost Tracking:** Creates project budget (\$60,000 USD) and logs cost entry (\$25,000 USD) via POST `/api/v1/projects/:id/budget/costs`.
8. **Burn Rate Verification:** Verifies total budget, remaining balance (\$35,000), `budgetUsedPercentage` (41.67%), and status `UNDER_CONTROL`.
9. **AI Weekly Status Report:** Requests report via POST `/api/v1/projects/:id/ai-reports` returning `202 Accepted` and enqueuing job.
10. **Background BullMQ Worker:** Worker processes snapshot, validates output schema, and transitions report state to `COMPLETED`.
11. **Client Portal Consumption:** Client logs in with `CLIENT` role; verifies access via GET `/api/v1/client-portal/projects` and GET `/api/v1/client-portal/projects/:id/ai-reports/:reportId`, confirming sensitive internal salaries, budget costs, and employee capacity metrics are stripped.

### 5. Security & Isolation Matrix (`test/security.e2e-spec.ts`)

| Security Dimension | Defense Mechanism | Test Verification |
| :--- | :--- | :--- |
| **Authentication Defense** | Constant-time bcrypt, invalid credentials rejection, header validation | Rejects bad passwords, missing Authorization headers, and malformed JWTs with 401. |
| **RBAC Protection** | `@Roles(...)` and `RolesGuard` | `CLIENT` cannot create projects (403); `TEAM_MEMBER` cannot delete projects (403); non-admins cannot access queue metrics (403). |
| **Multi-Tenant IDOR Defense** | Tenant-scoped database queries (`organizationId`) | Org A user requesting Org B project returns safe `404 Not Found` (never 403 or internal leak). |
| **Cross-Tenant References** | Foreign key verification scoped to tenant | Org A user attempting to bind a project to an Org B client returns `404 Not Found`. |
| **Client Portal Isolation** | JWT `clientId` binding & object-level auth | Client A accessing Client B project returns `404 Not Found`. |
| **Data Leakage Defense** | `ClientProjectSerializer` transformation | Client responses contain no internal financials (`spent`, `budget`), no salary costs, no internal member allocations. |
| **DTO Input Validation** | `ValidationPipe` with whitelist and class-validator | Rejects inverted date ranges (`startDate > endDate`), allocation percentages >100% or negative, and negative budgets with 400. |
| **Database Constraints** | PostgreSQL composite unique indices | Enforces unique `(projectId, userId)` on `ProjectMember` and `(projectId, periodStart, periodEnd)` on `AIReport`. |
| **Prompt Injection Defense** | Boundary demarcation (`<UNTRUSTED_PROJECT_DATA>`) | Malicious payloads in titles/descriptions are treated as literal text data without prompt override. |

---

## Docker, CI/CD & Production Deployment (Steps 14 & 15)

ClientPulse is engineered for production deployment as a **Dockerized modular monolith with dedicated background workers**, fronted by an Nginx reverse proxy terminating TLS.

### 1. Production Architecture

```text
                         Internet
                            │
                            ▼
                     HTTPS / Domain
                            │
                            ▼
                  ┌───────────────────┐
                  │    Nginx Proxy    │ (Ports 80 & 443, SSL termination, rate limits)
                  └─────────┬─────────┘
                            │ (Internal network: clientpulse_prod_network)
                            ▼
                    ┌───────────────┐
                    │ ClientPulse   │
                    │   API (4000)  │ (HTTP requests, JWT auth, domain queries)
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        PostgreSQL        Redis       External AI (OpenAI API / Mock)
        (Port 5432)     (Port 6379)
        Internal only   Internal only
              │             │
              │             ▼
              │       ┌──────────────┐
              │       │   BullMQ     │
              │       │   Worker     │ (Async AI snapshots, generation, retries)
              │       └──────────────┘
              ▼
        Persistent Volume
        (postgres_prod_data)
```

#### Why Separate the API and Worker Processes?
1. **Independent Scaling:** Compute-intensive AI snapshot formatting and LLM calls run in the background worker without consuming HTTP event loop capacity.
2. **Failure Isolation:** An unexpected worker crash or external AI timeout does not impact HTTP request handling, JWT verification, or portal access.
3. **Graceful Workload Draining:** Workers finish active generation jobs before shutting down during rolling updates, while pending BullMQ jobs persist safely in Redis.
4. **Single Codebase, Unified Image:** Both containers run from the identical production Docker image, differing only by execution command (`node dist/main` vs `node dist/worker`).

---

### 2. Multi-Stage Docker Build

The production [`Dockerfile`](file:///d:/projects/assignment/clientpulse-api/Dockerfile) utilizes a three-stage build to guarantee minimal artifact size, security, and reproducibility:

```text
Stage 1: dependencies (node:22-alpine)
   └── Installs all dependencies via 'npm ci' and copies prisma schema.
Stage 2: builder (node:22-alpine)
   └── Generates Prisma client, compiles NestJS ('npm run build'), and prunes devDependencies.
Stage 3: production (node:22-alpine)
   └── Copies only dist/, minimal node_modules/, package.json, and prisma engine.
   └── Drops root privileges ('USER node').
   └── Listens on 0.0.0.0:4000 with curl/openssl runtimes.
```

Build the production image locally:
```bash
docker build -t clientpulse-api:latest .
```

---

### 3. Execution Commands & Runtime Roles

| Role | Command | HTTP Server | Description |
| :--- | :--- | :---: | :--- |
| **API** | `npm run start:prod` (`node dist/main`) | **Yes** (Port 4000) | Serves REST endpoints, validates DTOs, executes RBAC, enqueues jobs. |
| **Worker** | `npm run start:worker` (`node dist/worker`) | **No** | Bootstraps Nest application context, consumes BullMQ jobs, interacts with AI provider. |
| **Dev API** | `npm run start:dev` | **Yes** | Hot-reload development API server. |
| **Dev Worker** | `npm run start:worker:dev` | **No** | Hot-reload development worker context. |

---

### 4. Docker Compose Configurations

#### Development Environment ([`docker-compose.yml`](file:///d:/projects/assignment/clientpulse-api/docker-compose.yml))
Starts the full development stack with published ports:
```bash
# Start infrastructure and application
docker compose up -d

# Start only databases (when developing with local Node.js processes)
docker compose up -d postgres redis
```

#### Hardened Production Environment ([`docker-compose.prod.yml`](file:///d:/projects/assignment/clientpulse-api/docker-compose.prod.yml))
Enforces strict production security:
- **No Public DB Ports:** PostgreSQL (`5432`) and Redis (`6379`) are strictly bound to the internal Docker bridge network (`clientpulse_prod_network`).
- **Nginx Reverse Proxy:** Exposes only HTTP (`80`) and HTTPS (`443`).
- **Restart Policy:** All containers set to `restart: always`.
- **Persistent Storage:** Named volumes (`postgres_prod_data`, `redis_prod_data`, `certbot_certs`).

Start production stack:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

### 5. Production Reverse Proxy & Nginx

Configured in [`nginx/nginx.conf`](file:///d:/projects/assignment/clientpulse-api/nginx/nginx.conf) and [`nginx/conf.d/clientpulse.conf`](file:///d:/projects/assignment/clientpulse-api/nginx/conf.d/clientpulse.conf):
- **HTTP $\rightarrow$ HTTPS Redirection:** Automatic 301 permanent redirect with ACME challenge passthrough for Let's Encrypt certificates.
- **TLS Hardening:** Restricted to TLSv1.2 and TLSv1.3 with secure cipher suites and HSTS enabled.
- **Request Tracing:** Propagates `X-Request-ID` headers to NestJS and client responses.
- **Tiered Rate Limiting:**
  - Auth endpoints (`/api/v1/auth/login`, `/refresh`): **5 req/s** with burst of 10 (`limit_req_status 429`).
  - AI Report Generation (`/api/v1/projects/:id/ai-reports`): **2 req/s** with burst of 4.
  - General API endpoints: **30 req/s** with burst of 50.

---

### 6. Production Health Probes (Readiness vs. Liveness)

| Endpoint | Type | Purpose | Behavior |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/health/live` | **Liveness** | Is the Node process running? | Returns 200 with uptime. Does not query external databases. |
| `GET /api/v1/health/ready` | **Readiness** | Can this instance receive traffic? | Probes PostgreSQL (`SELECT 1`) and Redis (`PING`). Returns 503 if DB is down. |
| `GET /api/v1/health` | **Diagnostics** | Operational component status | Returns 200 with Postgres up/down and Redis up/down status. |

---

### 7. Deployment & Migration Strategy

#### Database Migration Safety
- **Local Development:** `npx prisma migrate dev` (generates new migrations and updates local schema).
- **CI / Staging / Production:** `npx prisma migrate deploy` (applies pending committed migrations without reset).
- **Production Golden Rule:** Never run `prisma migrate reset` or `prisma migrate dev` against production environments.

#### Controlled Deployment Script ([`scripts/deploy.sh`](file:///d:/projects/assignment/clientpulse-api/scripts/deploy.sh))
Executes zero-downtime, verified updates on the production host:
```bash
bash scripts/deploy.sh
```
1. Verifies `.env` configuration file.
2. Creates an automated database snapshot (`scripts/backup.sh`).
3. Builds latest production images (`docker compose -f docker-compose.prod.yml build`).
4. Executes database migrations (`prisma migrate deploy`).
5. Restarts containers with zero-downtime rolling update.
6. Polls `GET /api/v1/health/ready` until readiness probe passes.

#### Backup & Restore Scripts
```bash
# Automated timestamped backup with 14-day retention pruning
bash scripts/backup.sh

# Restore snapshot to a verification database or active database
bash scripts/restore.sh backups/clientpulse_backup_YYYYMMDD_HHMMSS.sql.gz clientpulse_restore_verify
```

---

### 8. Continuous Integration & Deployment (GitHub Actions)

#### 1. Pull Request & Commit Validation ([`.github/workflows/ci.yml`](file:///d:/projects/assignment/clientpulse-api/.github/workflows/ci.yml))
Runs on every push and PR to `main`:
1. Launches ephemeral PostgreSQL 16 and Redis 7 service containers with health checks.
2. Installs clean dependencies via `npm ci`.
3. Runs `npx prisma generate` and `npx prisma migrate deploy` against the test database.
4. Executes ESLint (`npm run lint`).
5. Executes Unit tests sequentially (`npm test -- --runInBand`).
6. Executes all 12 E2E integration test suites (`npm run test:e2e`).
7. Compiles TypeScript production build (`npm run build`).
8. Verifies multi-stage production Docker build (`docker build -t clientpulse-api:ci .`).

#### 2. Production CD Workflow ([`.github/workflows/deploy.yml`](file:///d:/projects/assignment/clientpulse-api/.github/workflows/deploy.yml))
Triggered on merge to `main`:
1. Builds multi-platform production Docker image.
2. Publishes versioned image to GitHub Container Registry (`ghcr.io/<repo>:latest` and `:sha`).
3. Executes automated remote deployment via SSH triggering `scripts/deploy.sh`.

---

### 9. Rollback Strategy

If a deployment fails verification or an issue is detected post-deployment:
1. **Identify Previous Image Tag:** Pull the previous immutable image SHA tag from GHCR.
2. **Rollback Container:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker tag ghcr.io/<repo>:<previous-sha> clientpulse-api:latest
   docker compose -f docker-compose.prod.yml up -d
   ```
3. **Database Migration Rollback:** Because migrations follow backward-compatible design principles (expanding schema before contracting deprecated columns), the previous application version runs cleanly against the migrated database.



