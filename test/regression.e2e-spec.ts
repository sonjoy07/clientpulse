import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
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
import { createTestOrganization } from './factories/organization.factory.js';
import { createAndLoginUser } from './helpers/auth.helper.js';
import { cleanDatabase } from './helpers/database.helper.js';

describe('ClientPulse — Master Regression E2E Workflow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

  let orgId: string;
  let pmToken: string;
  let clientId: string;
  let clientEmail: string;
  let projectId: string;
  let memberId: string;
  let milestoneId: string;
  let taskId: string;
  let reportId: string;

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

    const org = await createTestOrganization(prisma, {
      name: 'Regression Agency Org',
    });
    orgId = org.id;

    // Login PM
    const pmAuth = await createAndLoginUser(
      prisma,
      server,
      orgId,
      Role.PROJECT_MANAGER,
      'pm-regression',
    );
    pmToken = pmAuth.token;
  }, 30000);

  afterAll(async () => {
    if (prisma) {
      await cleanDatabase(prisma, [orgId]);
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  interface ApiResponse<T> {
    success: boolean;
    data: T;
  }

  it('1. PM creates a new Client', async () => {
    clientEmail = `regression-client-${Date.now()}@corp.test`;
    const res = await request(server)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        name: 'Sarah Connor',
        companyName: 'Cyberdyne Systems',
        email: clientEmail,
      });

    expect(res.status).toBe(201);
    const body = res.body as ApiResponse<{ id: string; name: string }>;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Sarah Connor');
    clientId = body.data.id;
  });

  it('2. PM creates a new Project for the client', async () => {
    const res = await request(server)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        clientId,
        name: 'Defense Network Overhaul',
        description: 'Modernizing defense operations infrastructure',
        status: ProjectStatus.ACTIVE,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-08-01T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    const body = res.body as ApiResponse<{ id: string; name: string }>;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Defense Network Overhaul');
    projectId = body.data.id;
  });

  it('3. PM adds a Team Member to the project', async () => {
    // Create member user in org
    const memberAuth = await createAndLoginUser(
      prisma,
      server,
      orgId,
      Role.TEAM_MEMBER,
      'member-regression',
    );
    memberId = memberAuth.user.id;

    const res = await request(server)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        userId: memberId,
        allocationPercentage: 80,
      });

    expect(res.status).toBe(201);
    const body = res.body as ApiResponse<{
      userId: string;
      allocationPercentage: number;
    }>;
    expect(body.success).toBe(true);
    expect(body.data.userId).toBe(memberId);
    expect(body.data.allocationPercentage).toBe(80);
  });

  it('4. PM creates a Milestone for the project', async () => {
    const res = await request(server)
      .post(`/api/v1/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        name: 'Phase 1 Core Infrastructure',
        description: 'Deliver core infra setup',
        dueDate: '2026-04-01T00:00:00.000Z',
        status: MilestoneStatus.IN_PROGRESS,
      });

    expect(res.status).toBe(201);
    const body = res.body as ApiResponse<{ id: string; name: string }>;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Phase 1 Core Infrastructure');
    milestoneId = body.data.id;
  });

  it('5. PM creates Tasks assigned to the project member', async () => {
    const res1 = await request(server)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Provision Cloud VPC & Subnets',
        milestoneId,
        assigneeId: memberId,
        status: TaskStatus.DONE,
      });
    expect(res1.status).toBe(201);

    const res2 = await request(server)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Configure Zero-Trust Firewalls',
        milestoneId,
        assigneeId: memberId,
        status: TaskStatus.IN_PROGRESS,
      });
    expect(res2.status).toBe(201);
    const body2 = res2.body as ApiResponse<{ id: string }>;
    taskId = body2.data.id;
  });

  it('6. Completes remaining Task and verifies Delivery Progress', async () => {
    // Complete task 2
    const updateRes = await request(server)
      .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        status: TaskStatus.DONE,
      });
    expect(updateRes.status).toBe(200);

    // Check delivery summary (2 tasks done out of 2 = 100%)
    const summaryRes = await request(server)
      .get(`/api/v1/projects/${projectId}/delivery-summary`)
      .set('Authorization', `Bearer ${pmToken}`);

    expect(summaryRes.status).toBe(200);
    const summaryBody = summaryRes.body as ApiResponse<{
      progress: number;
      tasks: { total: number; done: number };
    }>;
    expect(summaryBody.data.tasks.total).toBe(2);
    expect(summaryBody.data.tasks.done).toBe(2);
    expect(summaryBody.data.progress).toBe(100);
  });

  it('7. PM creates a Project Budget and records Cost Entries', async () => {
    const budgetRes = await request(server)
      .post(`/api/v1/projects/${projectId}/budget`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        totalBudget: 60000,
        currency: 'USD',
      });
    expect(budgetRes.status).toBe(201);

    // Add cost entry
    const costRes = await request(server)
      .post(`/api/v1/projects/${projectId}/budget/costs`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        amount: 25000,
        category: 'INFRASTRUCTURE',
        description: 'Cloud hosting reservations',
        incurredAt: '2026-02-15T00:00:00.000Z',
      });
    expect(costRes.status).toBe(201);
  });

  it('8. Verifies Budget, Burn Rate, and Financial Metrics', async () => {
    const budgetRes = await request(server)
      .get(`/api/v1/projects/${projectId}/budget`)
      .set('Authorization', `Bearer ${pmToken}`);

    expect(budgetRes.status).toBe(200);
    const budgetBody = budgetRes.body as ApiResponse<{
      totalBudget: number;
      spent: number;
      remaining: number;
      budgetUsedPercentage: number;
    }>;
    expect(budgetBody.data.totalBudget).toBe(60000);
    expect(budgetBody.data.spent).toBe(25000);
    expect(budgetBody.data.remaining).toBe(35000);
    expect(budgetBody.data.budgetUsedPercentage).toBe(41.67);

    // Check summary as well
    const summaryRes = await request(server)
      .get(`/api/v1/projects/${projectId}/budget/summary`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(summaryRes.status).toBe(200);
    const summaryBody = summaryRes.body as ApiResponse<{
      budget: {
        total: number;
        spent: number;
        remaining: number;
        status: string;
      };
    }>;
    expect(summaryBody.data.budget.status).toBe('UNDER_CONTROL');
  });

  it('9. PM requests AI Weekly Status Report -> 202 Accepted and queues background job', async () => {
    const reportRes = await request(server)
      .post(`/api/v1/projects/${projectId}/ai-reports`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-07T00:00:00.000Z',
      });

    expect(reportRes.status).toBe(202);
    const reportBody = reportRes.body as ApiResponse<{
      id: string;
      status: AIReportStatus;
      message?: string;
    }>;
    expect(reportBody.success).toBe(true);
    expect(reportBody.data.status).toBe(AIReportStatus.PENDING);
    reportId = reportBody.data.id;
  });

  it('10. Background BullMQ Worker finishes report to COMPLETED', async () => {
    let completed = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((r) => setTimeout(r, 250));
      const pollRes = await request(server)
        .get(`/api/v1/projects/${projectId}/ai-reports/${reportId}`)
        .set('Authorization', `Bearer ${pmToken}`);

      if (
        pollRes.status === 200 &&
        (pollRes.body as ApiResponse<{ status: AIReportStatus }>).data
          .status === AIReportStatus.COMPLETED
      ) {
        completed = true;
        break;
      }
    }

    expect(completed).toBe(true);
  });

  it('11. Client user logs in and views sanitized project & report in Client Portal', async () => {
    // Create client user linked to the client
    const clientAuth = await createAndLoginUser(
      prisma,
      server,
      orgId,
      Role.CLIENT,
      'client-rep',
      clientId,
    );
    const clientToken = clientAuth.token;

    // View project dashboard
    const portalProjectsRes = await request(server)
      .get('/api/v1/client-portal/projects')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(portalProjectsRes.status).toBe(200);
    const projectsBody = portalProjectsRes.body as ApiResponse<
      Array<{ id: string; name: string }>
    >;
    expect(projectsBody.data).toHaveLength(1);
    expect(projectsBody.data[0].id).toBe(projectId);

    // View client-safe reports
    const portalReportsRes = await request(server)
      .get(`/api/v1/client-portal/projects/${projectId}/reports`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(portalReportsRes.status).toBe(200);
    const reportsBody = portalReportsRes.body as ApiResponse<
      Array<{
        id: string;
        summary: string | null;
        model?: string;
        errorMessage?: string;
      }>
    >;
    expect(reportsBody.data.length).toBeGreaterThanOrEqual(1);

    const clientReport = reportsBody.data[0];
    expect(clientReport.id).toBe(reportId);
    expect(clientReport.summary).toBeDefined();

    // Verify sensitive implementation details are stripped
    expect(clientReport.model).toBeUndefined();
    expect(clientReport.errorMessage).toBeUndefined();
  });
});
