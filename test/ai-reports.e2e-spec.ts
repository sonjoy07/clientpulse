import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  Role,
  ProjectStatus,
  MilestoneStatus,
  TaskStatus,
  AIReportStatus,
} from '@prisma/client';

describe('AI Weekly Status Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

  let orgAId: string;
  let orgBId: string;

  let clientA1Id: string;
  let clientA2Id: string;

  let projectA1Id: string;
  let projectA2Id: string;

  let adminAToken: string;
  let pmAToken: string;
  let teamMemberAToken: string;
  let clientUserA1Token: string;
  let clientUserA2Token: string;
  let adminBToken: string;

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
    server = app.getHttpServer() as Parameters<typeof request>[0];

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Setup Org A
    const orgA = await prisma.organization.create({
      data: {
        name: 'AI Agency A',
        slug: `ai-agency-a-${Date.now()}`,
      },
    });
    orgAId = orgA.id;

    // Setup Org B
    const orgB = await prisma.organization.create({
      data: {
        name: 'AI Agency B',
        slug: `ai-agency-b-${Date.now()}`,
      },
    });
    orgBId = orgB.id;

    // Clients in Org A
    const clientA1 = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Client Alpha Lead',
        companyName: 'Alpha Tech',
        email: `alpha-lead-${Date.now()}@alpha.test`,
      },
    });
    clientA1Id = clientA1.id;

    const clientA2 = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Client Beta Lead',
        companyName: 'Beta Logistics',
        email: `beta-lead-${Date.now()}@beta.test`,
      },
    });
    clientA2Id = clientA2.id;

    // Users in Org A
    const adminUser = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Admin Alice',
        email: `admin-a-${Date.now()}@agencya.test`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const pmUser = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'PM Peter',
        email: `pm-a-${Date.now()}@agencya.test`,
        passwordHash,
        role: Role.PROJECT_MANAGER,
      },
    });

    const memberUser = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Dev Dave',
        email: `dev-a-${Date.now()}@agencya.test`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });

    const clientUserA1 = await prisma.user.create({
      data: {
        organizationId: orgAId,
        clientId: clientA1Id,
        name: 'Charlie ClientA1',
        email: `charlie-a1-${Date.now()}@alpha.test`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    const clientUserA2 = await prisma.user.create({
      data: {
        organizationId: orgAId,
        clientId: clientA2Id,
        name: 'Diana ClientA2',
        email: `diana-a2-${Date.now()}@beta.test`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    // User in Org B
    const adminBUser = await prisma.user.create({
      data: {
        organizationId: orgBId,
        name: 'Admin Bob Org B',
        email: `admin-b-${Date.now()}@agencyb.test`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    // Project A1 under Client A1
    const projA1 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA1Id,
        name: 'Cloud Migration Initiative',
        description: 'Migrating legacy ERP to cloud',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      },
    });
    projectA1Id = projA1.id;

    // Project A2 under Client A2
    const projA2 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA2Id,
        name: 'Supply Chain Optimizer',
        status: ProjectStatus.PLANNING,
      },
    });
    projectA2Id = projA2.id;

    // Add Milestone & Tasks for Project A1
    const milestone1 = await prisma.milestone.create({
      data: {
        projectId: projectA1Id,
        name: 'Infra Provisioning',
        status: MilestoneStatus.COMPLETED,
        completedAt: new Date('2026-02-15'),
      },
    });

    await prisma.task.create({
      data: {
        projectId: projectA1Id,
        milestoneId: milestone1.id,
        title: 'Setup Kubernetes Cluster',
        status: TaskStatus.DONE,
      },
    });

    await prisma.task.create({
      data: {
        projectId: projectA1Id,
        title: 'Database Schema Sync',
        status: TaskStatus.IN_PROGRESS,
      },
    });

    // Add budget for Project A1
    await prisma.projectBudget.create({
      data: {
        projectId: projectA1Id,
        totalBudget: 40000,
        currency: 'USD',
      },
    });

    // Login helpers
    const login = async (email: string): Promise<string> => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      const body = res.body as { accessToken: string };
      return body.accessToken;
    };

    adminAToken = await login(adminUser.email);
    pmAToken = await login(pmUser.email);
    teamMemberAToken = await login(memberUser.email);
    clientUserA1Token = await login(clientUserA1.email);
    clientUserA2Token = await login(clientUserA2.email);
    adminBToken = await login(adminBUser.email);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.aIReport.deleteMany({
        where: { projectId: { in: [projectA1Id, projectA2Id] } },
      });
      await prisma.costEntry.deleteMany({
        where: { projectId: { in: [projectA1Id, projectA2Id] } },
      });
      await prisma.projectBudget.deleteMany({
        where: { projectId: { in: [projectA1Id, projectA2Id] } },
      });
      await prisma.task.deleteMany({
        where: { projectId: { in: [projectA1Id, projectA2Id] } },
      });
      await prisma.milestone.deleteMany({
        where: { projectId: { in: [projectA1Id, projectA2Id] } },
      });
      await prisma.project.deleteMany({
        where: { id: { in: [projectA1Id, projectA2Id] } },
      });
      await prisma.user.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.client.deleteMany({
        where: { organizationId: { in: [orgAId, orgBId] } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [orgAId, orgBId] } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  interface SingleReportResponse {
    success: boolean;
    data: {
      id: string;
      projectId: string;
      status: AIReportStatus;
      summary: string | null;
      highlights: string[] | null;
      achievements: string[] | null;
      concerns: string[] | null;
      nextSteps: string[] | null;
      model: string | null;
      errorMessage: string | null;
    };
  }

  interface ListReportsResponse {
    success: boolean;
    data: Array<{
      id: string;
      model: string | null;
    }>;
    meta: {
      total: number;
    };
  }

  interface ClientReportResponse {
    success: boolean;
    data: Array<{
      id: string;
      summary: string | null;
      highlights: string[] | null;
      achievements: string[] | null;
      concerns: string[] | null;
      nextSteps: string[] | null;
      model?: string;
      errorMessage?: string;
    }>;
  }

  interface ClientSingleReportResponse {
    success: boolean;
    data: {
      id: string;
      summary: string | null;
      model?: string;
    };
  }

  describe('POST /api/v1/projects/:projectId/ai-reports (Generate)', () => {
    it('should queue weekly report generation returning 202 Accepted and process to COMPLETED', async () => {
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-03-07T00:00:00.000Z',
        });

      expect(res.status).toBe(202);
      const body = res.body as SingleReportResponse;
      expect(body.success).toBe(true);
      const report = body.data;
      expect(report.id).toBeDefined();
      expect(report.projectId).toBe(projectA1Id);
      expect(report.status).toBe(AIReportStatus.PENDING);

      // Wait for BullMQ background worker to process report to COMPLETED
      let completedReport: SingleReportResponse['data'] | null = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((r) => setTimeout(r, 300));
        const checkRes = await request(server)
          .get(`/api/v1/projects/${projectA1Id}/ai-reports/${report.id}`)
          .set('Authorization', `Bearer ${adminAToken}`);

        const checkBody = checkRes.body as SingleReportResponse;
        if (
          checkRes.status === 200 &&
          checkBody.data.status === AIReportStatus.COMPLETED
        ) {
          completedReport = checkBody.data;
          break;
        }
      }

      expect(completedReport).not.toBeNull();
      expect(completedReport!.status).toBe(AIReportStatus.COMPLETED);
      expect(completedReport!.summary).toBeDefined();
      expect(Array.isArray(completedReport!.highlights)).toBe(true);
      expect(completedReport!.highlights?.length).toBeGreaterThan(0);
      expect(Array.isArray(completedReport!.achievements)).toBe(true);
      expect(Array.isArray(completedReport!.nextSteps)).toBe(true);
      expect(completedReport!.model).toBeDefined();
      expect(completedReport!.errorMessage).toBeNull();
    });

    it('should return existing report with 200 OK when called again with same period (idempotent)', async () => {
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${pmAToken}`)
        .send({
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-03-07T00:00:00.000Z',
        });

      expect(res.status).toBe(200);
      const body = res.body as SingleReportResponse;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(AIReportStatus.COMPLETED);
    });

    it('should re-queue generation with 202 Accepted when force is true', async () => {
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-03-07T00:00:00.000Z',
          force: true,
        });

      expect(res.status).toBe(202);
      const forceBody = res.body as SingleReportResponse;
      expect(forceBody.success).toBe(true);
      expect(forceBody.data.status).toBe(AIReportStatus.PENDING);

      // Wait for regeneration to finish so subsequent client portal tests see a COMPLETED report
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise((r) => setTimeout(r, 250));
        const checkRes = await request(server)
          .get(
            `/api/v1/projects/${projectA1Id}/ai-reports/${forceBody.data.id}`,
          )
          .set('Authorization', `Bearer ${adminAToken}`);

        const checkBody = checkRes.body as SingleReportResponse;
        if (
          checkRes.status === 200 &&
          checkBody.data.status === AIReportStatus.COMPLETED
        ) {
          break;
        }
      }
    });

    it('should reject if periodStart is after periodEnd', async () => {
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          periodStart: '2026-03-10T00:00:00.000Z',
          periodEnd: '2026-03-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
    });

    it('should deny CLIENT role from generating reports', async () => {
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .send({
          periodStart: '2026-03-08T00:00:00.000Z',
          periodEnd: '2026-03-14T00:00:00.000Z',
        });

      expect(res.status).toBe(403);
    });

    it('should deny TEAM_MEMBER role from generating reports', async () => {
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${teamMemberAToken}`)
        .send({
          periodStart: '2026-03-08T00:00:00.000Z',
          periodEnd: '2026-03-14T00:00:00.000Z',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/projects/:projectId/ai-reports (List & Detail)', () => {
    it('should return paginated reports for internal roles', async () => {
      const res = await request(server)
        .get(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${pmAToken}`);

      expect(res.status).toBe(200);
      const body = res.body as ListReportsResponse;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.meta).toBeDefined();
    });

    it('should return single report by ID with internal metadata', async () => {
      const listRes = await request(server)
        .get(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${adminAToken}`);

      const listBody = listRes.body as ListReportsResponse;
      const reportId = listBody.data[0].id;

      const res = await request(server)
        .get(`/api/v1/projects/${projectA1Id}/ai-reports/${reportId}`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      const body = res.body as SingleReportResponse;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(reportId);
      expect(body.data.model).toBeDefined();
    });

    it('should isolate cross-organization project report access (404)', async () => {
      const res = await request(server)
        .get(`/api/v1/projects/${projectA1Id}/ai-reports`)
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Client Portal Reports Integration & Isolation', () => {
    it('should allow client to view sanitized reports for their own project', async () => {
      const res = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}/reports`)
        .set('Authorization', `Bearer ${clientUserA1Token}`);

      expect(res.status).toBe(200);
      const body = res.body as ClientReportResponse;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const report = body.data[0];
      expect(report.id).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.highlights).toBeDefined();
      expect(report.achievements).toBeDefined();
      expect(report.concerns).toBeDefined();
      expect(report.nextSteps).toBeDefined();
      // Ensure internal implementation details are stripped
      expect(report.model).toBeUndefined();
      expect(report.errorMessage).toBeUndefined();
    });

    it('should deny client from viewing reports for another client project (404)', async () => {
      const res = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}/reports`)
        .set('Authorization', `Bearer ${clientUserA2Token}`);

      expect(res.status).toBe(404);
    });

    it('should allow client to view single report detail for their project', async () => {
      const listRes = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}/reports`)
        .set('Authorization', `Bearer ${clientUserA1Token}`);

      const listBody = listRes.body as ClientReportResponse;
      const reportId = listBody.data[0].id;

      const res = await request(server)
        .get(
          `/api/v1/client-portal/projects/${projectA1Id}/reports/${reportId}`,
        )
        .set('Authorization', `Bearer ${clientUserA1Token}`);

      expect(res.status).toBe(200);
      const body = res.body as ClientSingleReportResponse;
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(reportId);
      expect(body.data.model).toBeUndefined();
    });

    it('should return 404 when client requests report for non-owned project', async () => {
      const listRes = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}/reports`)
        .set('Authorization', `Bearer ${clientUserA1Token}`);

      const listBody = listRes.body as ClientReportResponse;
      const reportId = listBody.data[0].id;

      const res = await request(server)
        .get(
          `/api/v1/client-portal/projects/${projectA1Id}/reports/${reportId}`,
        )
        .set('Authorization', `Bearer ${clientUserA2Token}`);

      expect(res.status).toBe(404);
    });
  });
});
