import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role, ProjectStatus } from '@prisma/client';

describe('Milestones, Tasks & Delivery Progress (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let orgAId: string;
  let orgBId: string;

  let userAAdminToken: string;
  let userATeamLeadToken: string;
  let userADevToken: string;
  let userAClientToken: string;
  let userBAdminToken: string;

  let userADevId: string;
  let userBDevId: string;

  let projectAId: string;
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

    // 1. Setup Organization A
    const orgA = await prisma.organization.create({
      data: {
        name: 'Delivery Org A',
        slug: `delivery-org-a-${Date.now()}`,
      },
    });
    orgAId = orgA.id;

    const userAAdmin = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Delivery Admin A',
        email: `del-admin-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const userATeamLead = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Delivery Lead A',
        email: `del-lead-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.TEAM_LEAD,
      },
    });

    const userADev = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Delivery Dev A',
        email: `del-dev-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });
    userADevId = userADev.id;

    const userAClient = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Delivery Client A',
        email: `del-client-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    const clientA = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Client Contact A',
        companyName: 'Acme Corp',
        email: `client-${Date.now()}@acme.example.com`,
      },
    });

    const projectA = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA.id,
        name: 'Project Alpha Delivery',
        description: 'Core project for delivery tests',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
      },
    });
    projectAId = projectA.id;

    // Add userADev as a member of Project A
    await prisma.projectMember.create({
      data: {
        projectId: projectAId,
        userId: userADevId,
        allocationPercentage: 50,
      },
    });

    // 2. Setup Organization B (for multi-tenant isolation testing)
    const orgB = await prisma.organization.create({
      data: {
        name: 'Delivery Org B',
        slug: `delivery-org-b-${Date.now()}`,
      },
    });
    orgBId = orgB.id;

    const userBAdmin = await prisma.user.create({
      data: {
        organizationId: orgBId,
        name: 'Delivery Admin B',
        email: `del-admin-${Date.now()}@b.example.com`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const userBDev = await prisma.user.create({
      data: {
        organizationId: orgBId,
        name: 'Delivery Dev B',
        email: `del-dev-${Date.now()}@b.example.com`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });
    userBDevId = userBDev.id;

    const clientB = await prisma.client.create({
      data: {
        organizationId: orgBId,
        name: 'Client Contact B',
        companyName: 'Beta Corp',
        email: `client-${Date.now()}@beta.example.com`,
      },
    });

    const projectB = await prisma.project.create({
      data: {
        organizationId: orgBId,
        clientId: clientB.id,
        name: 'Project Beta Delivery',
        status: ProjectStatus.PLANNING,
      },
    });
    projectBId = projectB.id;

    // 3. Acquire JWT Tokens
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
    await prisma.task.deleteMany({
      where: { projectId: { in: [projectAId, projectBId] } },
    });
    await prisma.milestone.deleteMany({
      where: { projectId: { in: [projectAId, projectBId] } },
    });
    await prisma.projectMember.deleteMany({
      where: { projectId: { in: [projectAId, projectBId] } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectAId, projectBId] } },
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

  describe('Milestones Management', () => {
    let milestone1Id: string;
    let milestone2Id: string;

    it('rejects milestone creation with startDate > dueDate -> 400', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post(`/api/v1/projects/${projectAId}/milestones`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          name: 'Invalid Dates Milestone',
          startDate: '2026-10-25',
          dueDate: '2026-10-10',
        })
        .expect(400);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe('Due date cannot be before start date');
    });

    it('rejects milestone creation from CLIENT role -> 403', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post(`/api/v1/projects/${projectAId}/milestones`)
        .set('Authorization', `Bearer ${userAClientToken}`)
        .send({ name: 'Client Milestone' })
        .expect(403);
    });

    it('creates milestones successfully by ADMIN / TEAM_LEAD -> 201', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res1 = await request(server)
        .post(`/api/v1/projects/${projectAId}/milestones`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          name: 'Sprint 1: Auth & Architecture',
          description: 'Initial backend foundation and auth',
          startDate: '2026-10-01',
          dueDate: '2026-10-15',
          status: 'IN_PROGRESS',
        })
        .expect(201);

      const body1 = res1.body as { data: { id: string; name: string } };
      milestone1Id = body1.data.id;
      expect(body1.data.name).toBe('Sprint 1: Auth & Architecture');

      const res2 = await request(server)
        .post(`/api/v1/projects/${projectAId}/milestones`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({
          name: 'Sprint 2: Payment Integration',
          dueDate: '2026-10-28',
          status: 'PENDING',
        })
        .expect(201);

      const body2 = res2.body as { data: { id: string } };
      milestone2Id = body2.data.id;
    });

    it('lists milestones with calculated task count and progress -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/milestones`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ id: string; progress: number; taskCount: number }>;
        meta: { total: number };
      };
      expect(body.success).toBe(true);
      expect(body.meta.total).toBe(2);
      expect(body.data[0].progress).toBe(0);
      expect(body.data[0].taskCount).toBe(0);
    });

    it('cross-org milestone access returns 404', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get(`/api/v1/projects/${projectAId}/milestones/${milestone1Id}`)
        .set('Authorization', `Bearer ${userBAdminToken}`)
        .expect(404);
    });

    it('can delete milestone without tasks -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .delete(`/api/v1/projects/${projectAId}/milestones/${milestone2Id}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);
    });
  });

  describe('Tasks Management', () => {
    let task1Id: string;
    let task2Id: string;
    let milestoneId: string;

    beforeAll(async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/milestones`)
        .set('Authorization', `Bearer ${userAAdminToken}`);
      const body = res.body as { data: Array<{ id: string }> };
      milestoneId = body.data[0].id;
    });

    it('rejects task creation if assignee is not a member of this project -> 400', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post(`/api/v1/projects/${projectAId}/tasks`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          title: 'Invalid Assignee Task',
          assigneeId: userBDevId, // From Org B!
        })
        .expect(400);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe('Assignee must be a member of this project');
    });

    it('rejects task creation if milestone does not belong to project -> 400', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post(`/api/v1/projects/${projectBId}/tasks`)
        .set('Authorization', `Bearer ${userBAdminToken}`)
        .send({
          title: 'Cross Milestone Task',
          milestoneId: milestoneId, // Milestone belongs to project A!
        })
        .expect(400);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe('Milestone does not belong to this project');
    });

    it('creates tasks successfully when assignee is project member -> 201', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res1 = await request(server)
        .post(`/api/v1/projects/${projectAId}/tasks`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          title: 'Implement JWT Auth',
          description: 'Setup access and refresh tokens',
          status: 'DONE',
          priority: 'HIGH',
          milestoneId,
          assigneeId: userADevId,
        })
        .expect(201);

      const body1 = res1.body as { data: { id: string } };
      task1Id = body1.data.id;

      const res2 = await request(server)
        .post(`/api/v1/projects/${projectAId}/tasks`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({
          title: 'Implement Delivery Summary',
          status: 'IN_PROGRESS',
          priority: 'URGENT',
          milestoneId,
          assigneeId: userADevId,
        })
        .expect(201);

      const body2 = res2.body as { data: { id: string } };
      task2Id = body2.data.id;
    });

    it('fetches single task details -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/tasks/${task1Id}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as { data: { id: string; title: string } };
      expect(body.data.id).toBe(task1Id);
      expect(body.data.title).toBe('Implement JWT Auth');
    });

    it('verifies milestone progress updated dynamically based on real task completion -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        data: {
          progress: number;
          taskCount: number;
          completedTaskCount: number;
        };
      };
      // 2 tasks: 1 DONE, 1 IN_PROGRESS -> 50%
      expect(body.data.taskCount).toBe(2);
      expect(body.data.completedTaskCount).toBe(1);
      expect(body.data.progress).toBe(50);
    });

    it('rejects completing milestone while unfinished tasks exist -> 409', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .patch(`/api/v1/projects/${projectAId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ status: 'COMPLETED' })
        .expect(409);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe(
        'Milestone cannot be completed while unfinished tasks exist',
      );
    });

    it('rejects deleting milestone when tasks exist -> 409', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .delete(`/api/v1/projects/${projectAId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(409);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe(
        'Cannot delete milestone with existing tasks',
      );
    });

    it('TEAM_MEMBER permissions: assigned user updates task status to DONE -> 200', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .patch(`/api/v1/projects/${projectAId}/tasks/${task2Id}`)
        .set('Authorization', `Bearer ${userADevToken}`)
        .send({ status: 'DONE' })
        .expect(200);

      const body = res.body as { data: { status: string } };
      expect(body.data.status).toBe('DONE');
    });

    it('TEAM_MEMBER permissions: cannot update title or priority -> 403', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .patch(`/api/v1/projects/${projectAId}/tasks/${task2Id}`)
        .set('Authorization', `Bearer ${userADevToken}`)
        .send({ priority: 'LOW' })
        .expect(403);
    });

    it('TEAM_MEMBER permissions: cannot delete task -> 403', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .delete(`/api/v1/projects/${projectAId}/tasks/${task2Id}`)
        .set('Authorization', `Bearer ${userADevToken}`)
        .expect(403);
    });
  });

  describe('Project Delivery Summary Endpoint', () => {
    it('returns delivery summary with real progress, task breakdowns, milestone breakdowns & timeline status', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}/delivery-summary`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          projectId: string;
          projectName: string;
          progress: number;
          tasks: { total: number; done: number };
          milestones: { total: number };
          timeline: {
            status: string;
            expectedProgress: number;
            actualProgress: number;
          };
        };
      };

      expect(body.success).toBe(true);
      expect(body.data.projectId).toBe(projectAId);
      expect(body.data.tasks.total).toBe(2);
      expect(body.data.tasks.done).toBe(2);
      // Both tasks are now DONE -> progress = 100%
      expect(body.data.progress).toBe(100);
      expect(body.data.timeline.actualProgress).toBe(100);
      expect(body.data.timeline.status).toBe('ON_TRACK');
    });

    it('cross-org delivery summary returns safe 404', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get(`/api/v1/projects/${projectAId}/delivery-summary`)
        .set('Authorization', `Bearer ${userBAdminToken}`)
        .expect(404);
    });
  });
});
