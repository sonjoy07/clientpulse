import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role, ProjectStatus, CostCategory } from '@prisma/client';

describe('Budget, Cost Tracking & Burn Rate (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let orgAId: string;
  let orgBId: string;

  let userAAdminToken: string;
  let userATeamLeadToken: string;
  let userADevToken: string;
  let userAClientToken: string;
  let userBAdminToken: string;

  let projectAId: string;
  let projectA2Id: string;
  let projectBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    // Setup Org A
    const orgA = await prisma.organization.create({
      data: {
        name: 'Budget Org A',
        slug: `budget-org-a-${Date.now()}`,
      },
    });
    orgAId = orgA.id;

    const userAAdmin = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Budget Admin A',
        email: `budget-admin-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const userATeamLead = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Budget Lead A',
        email: `budget-lead-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.TEAM_LEAD,
      },
    });

    const userADev = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Budget Dev A',
        email: `budget-dev-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });

    const userAClient = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Budget Client A',
        email: `budget-client-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    const clientA = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Client Contact A',
        companyName: 'Acme Finances',
        email: `contact-${Date.now()}@acme.example.com`,
      },
    });

    // Project A1: Active with 100-day schedule (50 days elapsed)
    const now = new Date();
    const startDate = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000);

    const projectA = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA.id,
        name: 'E-commerce Platform Budget',
        status: ProjectStatus.ACTIVE,
        startDate,
        endDate,
      },
    });
    projectAId = projectA.id;

    // Project A2: Without budget (for NOT_CONFIGURED test)
    const projectA2 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA.id,
        name: 'No Budget Project',
        status: ProjectStatus.PLANNING,
      },
    });
    projectA2Id = projectA2.id;

    // Setup Org B (for multi-tenant isolation)
    const orgB = await prisma.organization.create({
      data: {
        name: 'Budget Org B',
        slug: `budget-org-b-${Date.now()}`,
      },
    });
    orgBId = orgB.id;

    const userBAdmin = await prisma.user.create({
      data: {
        organizationId: orgBId,
        name: 'Budget Admin B',
        email: `budget-admin-${Date.now()}@b.example.com`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const clientB = await prisma.client.create({
      data: {
        organizationId: orgBId,
        name: 'Client Contact B',
        companyName: 'Beta Finances',
        email: `contact-${Date.now()}@beta.example.com`,
      },
    });

    const projectB = await prisma.project.create({
      data: {
        organizationId: orgBId,
        clientId: clientB.id,
        name: 'Project Beta Budget',
        status: ProjectStatus.PLANNING,
      },
    });
    projectBId = projectB.id;

    // Login tokens
    const login = async (email: string) => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      return (res.body as { accessToken: string }).accessToken;
    };

    userAAdminToken = await login(userAAdmin.email);
    userATeamLeadToken = await login(userATeamLead.email);
    userADevToken = await login(userADev.email);
    userAClientToken = await login(userAClient.email);
    userBAdminToken = await login(userBAdmin.email);
  });

  afterAll(async () => {
    await prisma.costEntry.deleteMany({
      where: { projectId: { in: [projectAId, projectA2Id, projectBId] } },
    });
    await prisma.projectBudget.deleteMany({
      where: { projectId: { in: [projectAId, projectA2Id, projectBId] } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectAId, projectA2Id, projectBId] } },
    });
    await prisma.client.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.user.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAId, orgBId] } },
    });
    await app.close();
  });

  describe('Project Budget Management', () => {
    it('creates project budget successfully -> 201', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post(`/api/v1/projects/${projectAId}/budget`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          totalBudget: 50000,
          currency: 'USD',
        })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: {
          totalBudget: number;
          currency: string;
          spent: number;
          remaining: number;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.totalBudget).toBe(50000);
      expect(body.data.currency).toBe('USD');
      expect(body.data.spent).toBe(0);
      expect(body.data.remaining).toBe(50000);
    });

    it('rejects duplicate budget creation -> 409 Conflict', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post(`/api/v1/projects/${projectAId}/budget`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          totalBudget: 75000,
        })
        .expect(409);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe('Project budget already exists');
    });

    it('rejects budget creation by TEAM_MEMBER and CLIENT -> 403 Forbidden', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post(`/api/v1/projects/${projectA2Id}/budget`)
        .set('Authorization', `Bearer ${userADevToken}`)
        .send({ totalBudget: 10000 })
        .expect(403);

      await request(server)
        .post(`/api/v1/projects/${projectA2Id}/budget`)
        .set('Authorization', `Bearer ${userAClientToken}`)
        .send({ totalBudget: 10000 })
        .expect(403);
    });

    it('gets budget details -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/budget`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .expect(200);

      const body = res.body as {
        data: { totalBudget: number; spent: number; remaining: number };
      };
      expect(body.data.totalBudget).toBe(50000);
      expect(body.data.spent).toBe(0);
      expect(body.data.remaining).toBe(50000);
    });

    it('cross-organization budget lookup returns safe 404', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get(`/api/v1/projects/${projectAId}/budget`)
        .set('Authorization', `Bearer ${userBAdminToken}`)
        .expect(404);
    });
  });

  describe('Cost Tracking & Cost Entries', () => {
    let cost1Id: string;
    let cost2Id: string;
    let cost3Id: string;

    it('adds labor and infrastructure cost entries -> 201', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res1 = await request(server)
        .post(`/api/v1/projects/${projectAId}/budget/costs`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          amount: 18000,
          category: CostCategory.LABOR,
          description: 'Frontend & backend sprint development',
          incurredAt: '2026-09-15T00:00:00.000Z',
        })
        .expect(201);

      const body1 = res1.body as { data: { id: string; amount: number } };
      cost1Id = body1.data.id;
      expect(body1.data.amount).toBe(18000);

      const res2 = await request(server)
        .post(`/api/v1/projects/${projectAId}/budget/costs`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({
          amount: 8000,
          category: CostCategory.INFRASTRUCTURE,
          description: 'AWS cluster hosting & Postgres RDS',
          incurredAt: '2026-10-01T00:00:00.000Z',
        })
        .expect(201);

      const body2 = res2.body as { data: { id: string } };
      cost2Id = body2.data.id;

      const res3 = await request(server)
        .post(`/api/v1/projects/${projectAId}/budget/costs`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          amount: 6500,
          category: CostCategory.SOFTWARE,
          description: 'Datadog & GitHub Enterprise licenses',
          incurredAt: '2026-10-05T00:00:00.000Z',
        })
        .expect(201);

      const body3 = res3.body as { data: { id: string } };
      cost3Id = body3.data.id;
    });

    it('lists cost entries with filtering and search -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(
          `/api/v1/projects/${projectAId}/budget/costs?category=INFRASTRUCTURE`,
        )
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ amount: number; category: string }>;
        meta: { total: number };
      };
      expect(body.success).toBe(true);
      expect(body.meta.total).toBe(1);
      expect(body.data[0].category).toBe('INFRASTRUCTURE');
      expect(body.data[0].amount).toBe(8000);
    });

    it('rejects changing budget currency after cost entries exist -> 409 Conflict', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .patch(`/api/v1/projects/${projectAId}/budget`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ currency: 'EUR' })
        .expect(409);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe(
        'Cannot change currency after cost entries have been recorded',
      );
    });

    it('TEAM_LEAD cannot delete financial cost entry -> 403 Forbidden', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .delete(`/api/v1/projects/${projectAId}/budget/costs/${cost3Id}`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .expect(403);
    });

    it('fetches single cost details -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/budget/costs/${cost1Id}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as { data: { id: string; amount: number } };
      expect(body.data.id).toBe(cost1Id);
      expect(body.data.amount).toBe(18000);
    });

    it('updates cost entry details -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .patch(`/api/v1/projects/${projectAId}/budget/costs/${cost2Id}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ description: 'Updated AWS cluster costs' })
        .expect(200);

      const body = res.body as { data: { description: string } };
      expect(body.data.description).toBe('Updated AWS cluster costs');
    });
  });

  describe('Budget Summary & Burn Rate Engine', () => {
    it('returns budget summary with real spent, time burn and BURNING_FAST status -> 200', async () => {
      // Total Budget = 50,000, Spent = 18,000 + 8,000 + 6,500 = 32,500 (65%)
      // Elapsed Time = 50 days of 100 days = 50%
      // Burn Rate Difference = 65% - 50% = 15% -> BURNING_FAST
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/budget/summary`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          budget: {
            total: number;
            spent: number;
            remaining: number;
            usedPercentage: number;
            status: string;
          };
          timeline: { timeBurnPercentage: number };
          burnRate: {
            budgetBurnPercentage: number;
            timeBurnPercentage: number;
            difference: number;
            status: string;
          };
        };
      };

      expect(body.success).toBe(true);
      expect(body.data.budget.total).toBe(50000);
      expect(body.data.budget.spent).toBe(32500);
      expect(body.data.budget.remaining).toBe(17500);
      expect(body.data.budget.usedPercentage).toBe(65);
      expect(body.data.budget.status).toBe('UNDER_CONTROL');
      expect(body.data.timeline.timeBurnPercentage).toBe(50);
      expect(body.data.burnRate.difference).toBe(15);
      expect(body.data.burnRate.status).toBe('BURNING_FAST');
    });

    it('returns cost category breakdown -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/budget/breakdown`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ category: string; amount: number; percentage: number }>;
      };

      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      const labor = body.data.find((c) => c.category === 'LABOR');
      expect(labor).toBeDefined();
      expect(labor?.amount).toBe(18000);
      expect(labor?.percentage).toBe(55.38);
    });

    it('returns monthly cost summary -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/budget/monthly`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ month: string; amount: number }>;
      };

      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.data[0].month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('handles project without budget safely -> NOT_CONFIGURED', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectA2Id}/budget/summary`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        data: { budget: { status: string; total: number } };
      };
      expect(body.data.budget.status).toBe('NOT_CONFIGURED');
      expect(body.data.budget.total).toBe(0);
    });

    it('detects OVER_BUDGET and CRITICAL burn rate when spent exceeds total budget', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      // Add $25,000 more costs -> total spent = $57,500 (> $50,000)
      await request(server)
        .post(`/api/v1/projects/${projectAId}/budget/costs`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          amount: 25000,
          category: CostCategory.THIRD_PARTY,
          description: 'Emergency contractor expansion',
        })
        .expect(201);

      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/budget/summary`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        data: {
          budget: {
            spent: number;
            remaining: number;
            usedPercentage: number;
            status: string;
          };
          burnRate: { status: string };
        };
      };

      expect(body.data.budget.spent).toBe(57500);
      expect(body.data.budget.remaining).toBe(-7500);
      expect(body.data.budget.usedPercentage).toBe(115);
      expect(body.data.budget.status).toBe('OVER_BUDGET');
      expect(body.data.burnRate.status).toBe('CRITICAL');
    });
  });
});
