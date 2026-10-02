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
} from '@prisma/client';
import {
  ClientDashboardResponseDto,
  ClientProjectResponseDto,
  ClientProjectProgressResponseDto,
  ClientMilestoneResponseDto,
  ClientDeliveryStatusResponseDto,
} from '../src/client-portal/dto/client-project-response.dto.js';

describe('Client Portal & Client Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

  let orgAId: string;
  let orgBId: string;

  let clientA1Id: string;
  let clientA2Id: string;
  let clientBId: string;

  let projectA1Id: string;
  let projectA2Id: string;
  let projectBId: string;

  let clientUserA1Token: string;
  let clientUserA2Token: string;
  let unassignedClientToken: string;
  let teamMemberAToken: string;
  let adminAToken: string;
  let clientUserBToken: string;

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
        name: 'Portal Agency A',
        slug: `portal-agency-a-${Date.now()}`,
      },
    });
    orgAId = orgA.id;

    // Clients in Org A
    const clientA1 = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Client A1 Alpha Contact',
        companyName: 'Client Alpha Corp',
        email: `contact-a1-${Date.now()}@alpha.test`,
      },
    });
    clientA1Id = clientA1.id;

    const clientA2 = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Client A2 Beta Contact',
        companyName: 'Client Beta Corp',
        email: `contact-a2-${Date.now()}@beta.test`,
      },
    });
    clientA2Id = clientA2.id;

    // Users in Org A
    const clientUserA1 = await prisma.user.create({
      data: {
        organizationId: orgAId,
        clientId: clientA1Id,
        name: 'Alice AlphaClient',
        email: `alice-a1-${Date.now()}@alpha.test`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    const clientUserA2 = await prisma.user.create({
      data: {
        organizationId: orgAId,
        clientId: clientA2Id,
        name: 'Bob BetaClient',
        email: `bob-a2-${Date.now()}@beta.test`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    const unassignedClient = await prisma.user.create({
      data: {
        organizationId: orgAId,
        clientId: null,
        name: 'Unassigned Client',
        email: `unassigned-${Date.now()}@client.test`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    const devA = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Dan Developer',
        email: `dev-${Date.now()}@agency.test`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });

    const adminA = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Aaron Admin',
        email: `admin-${Date.now()}@agency.test`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    // Setup Org B
    const orgB = await prisma.organization.create({
      data: {
        name: 'Portal Agency B',
        slug: `portal-agency-b-${Date.now()}`,
      },
    });
    orgBId = orgB.id;

    const clientB = await prisma.client.create({
      data: {
        organizationId: orgBId,
        name: 'Client B Contact',
        companyName: 'Client Gamma Corp',
        email: `contact-b-${Date.now()}@gamma.test`,
      },
    });
    clientBId = clientB.id;

    const clientUserB = await prisma.user.create({
      data: {
        organizationId: orgBId,
        clientId: clientBId,
        name: 'Charlie GammaClient',
        email: `charlie-b-${Date.now()}@gamma.test`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    // Projects
    const pA1 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA1Id,
        name: 'Project Alpha 1',
        description: 'Alpha client deliverables',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    projectA1Id = pA1.id;

    const pA2 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA2Id,
        name: 'Project Beta 2',
        description: 'Beta client deliverables',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    projectA2Id = pA2.id;

    const pB = await prisma.project.create({
      data: {
        organizationId: orgBId,
        clientId: clientBId,
        name: 'Project Gamma B',
        description: 'Tenant B deliverables',
        status: ProjectStatus.ACTIVE,
      },
    });
    projectBId = pB.id;

    // Milestones and Tasks for Project A1
    const m1 = await prisma.milestone.create({
      data: {
        projectId: projectA1Id,
        name: 'Milestone 1 Discovery',
        description: 'Initial discovery and scoping',
        status: MilestoneStatus.COMPLETED,
        dueDate: new Date('2026-09-30T00:00:00.000Z'),
      },
    });

    await prisma.task.create({
      data: {
        projectId: projectA1Id,
        milestoneId: m1.id,
        title: 'Requirements document',
        status: TaskStatus.DONE,
      },
    });

    await prisma.milestone.create({
      data: {
        projectId: projectA1Id,
        name: 'Milestone 2 Implementation',
        description: 'Core portal development',
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: new Date('2026-11-30T00:00:00.000Z'),
      },
    });

    // Helper to log in and get JWT token
    const login = async (email: string) => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      const body = res.body as { accessToken: string };
      return body.accessToken;
    };

    clientUserA1Token = await login(clientUserA1.email);
    clientUserA2Token = await login(clientUserA2.email);
    unassignedClientToken = await login(unassignedClient.email);
    teamMemberAToken = await login(devA.email);
    adminAToken = await login(adminA.email);
    clientUserBToken = await login(clientUserB.email);
  });

  afterAll(async () => {
    await prisma.task.deleteMany({
      where: { projectId: { in: [projectA1Id, projectA2Id, projectBId] } },
    });
    await prisma.milestone.deleteMany({
      where: { projectId: { in: [projectA1Id, projectA2Id, projectBId] } },
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectA1Id, projectA2Id, projectBId] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [clientA1Id, clientA2Id, clientBId] } },
    });
    await prisma.user.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAId, orgBId] } },
    });

    await app.close();
  });

  describe('Authentication & Role Protection', () => {
    it('rejects unauthenticated request -> 401 Unauthorized', async () => {
      await request(server).get('/api/v1/client-portal/dashboard').expect(401);
    });

    it('rejects TEAM_MEMBER from accessing client portal -> 403 Forbidden', async () => {
      await request(server)
        .get('/api/v1/client-portal/dashboard')
        .set('Authorization', `Bearer ${teamMemberAToken}`)
        .expect(403);
    });

    it('rejects ADMIN from accessing client portal -> 403 Forbidden', async () => {
      await request(server)
        .get('/api/v1/client-portal/dashboard')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(403);
    });

    it('rejects CLIENT user without associated clientId -> 403 Forbidden', async () => {
      const res = await request(server)
        .get('/api/v1/client-portal/dashboard')
        .set('Authorization', `Bearer ${unassignedClientToken}`)
        .expect(403);

      const body = res.body as { message: string };
      expect(body.message).toContain('Client account is not associated');
    });
  });

  describe('GET /api/v1/client-portal/dashboard', () => {
    it('returns client dashboard containing only Client A1 projects and safe data', async () => {
      const res = await request(server)
        .get('/api/v1/client-portal/dashboard')
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ClientDashboardResponseDto;
      };
      expect(body.success).toBe(true);
      expect(body.data.client.id).toBe(clientA1Id);
      expect(body.data.client.companyName).toBe('Client Alpha Corp');
      expect(body.data.summary.totalProjects).toBe(1);
      expect(body.data.projects).toHaveLength(1);
      expect(body.data.projects[0].id).toBe(projectA1Id);
      expect(body.data.projects[0].name).toBe('Project Alpha 1');

      // Verify no internal financial or staffing data leakage
      const rawProject = body.data.projects[0] as unknown as Record<
        string,
        unknown
      >;
      expect(rawProject.totalBudget).toBeUndefined();
      expect(rawProject.costEntries).toBeUndefined();
      expect(rawProject.projectMembers).toBeUndefined();
      expect(rawProject.organizationId).toBeUndefined();
    });
  });

  describe('GET /api/v1/client-portal/projects', () => {
    it('returns only projects belonging to the authenticated client', async () => {
      const resA1 = await request(server)
        .get('/api/v1/client-portal/projects')
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(200);

      const bodyA1 = resA1.body as {
        success: boolean;
        data: ClientProjectResponseDto[];
      };
      expect(bodyA1.data).toHaveLength(1);
      expect(bodyA1.data[0].id).toBe(projectA1Id);

      // Verify Client A2 sees only Project A2
      const resA2 = await request(server)
        .get('/api/v1/client-portal/projects')
        .set('Authorization', `Bearer ${clientUserA2Token}`)
        .expect(200);

      const bodyA2 = resA2.body as {
        success: boolean;
        data: ClientProjectResponseDto[];
      };
      expect(bodyA2.data).toHaveLength(1);
      expect(bodyA2.data[0].id).toBe(projectA2Id);
    });
  });

  describe('GET /api/v1/client-portal/projects/:projectId', () => {
    it('returns client project details for own project', async () => {
      const res = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ClientProjectResponseDto;
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(projectA1Id);
      expect(body.data.name).toBe('Project Alpha 1');
      expect(body.data.progress).toBe(100);
      expect(body.data.milestones.total).toBe(2);
      expect(body.data.milestones.completed).toBe(1);
    });

    it('returns 404 when attempting to access another client project in same org', async () => {
      // Client A1 requesting Project A2
      await request(server)
        .get(`/api/v1/client-portal/projects/${projectA2Id}`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(404);
    });

    it('returns 404 when attempting to access project in another organization', async () => {
      // Client A1 requesting Project B
      await request(server)
        .get(`/api/v1/client-portal/projects/${projectBId}`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(404);

      // Client B (from Org B) requesting Project A1
      await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}`)
        .set('Authorization', `Bearer ${clientUserBToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/client-portal/projects/:projectId/progress', () => {
    it('returns delivery progress for own project', async () => {
      const res = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}/progress`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ClientProjectProgressResponseDto;
      };
      expect(body.success).toBe(true);
      expect(body.data.projectId).toBe(projectA1Id);
      expect(body.data.progress).toBe(100);
      expect(body.data.status).toBeDefined();
    });

    it('returns 404 for cross-client project progress access', async () => {
      await request(server)
        .get(`/api/v1/client-portal/projects/${projectA2Id}/progress`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/client-portal/projects/:projectId/milestones', () => {
    it('returns client-safe milestones without exposing internal tasks', async () => {
      const res = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}/milestones`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ClientMilestoneResponseDto[];
      };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].name).toBe('Milestone 1 Discovery');
      expect(body.data[0].progress).toBe(100);

      const rawMilestone = body.data[0] as unknown as Record<string, unknown>;
      expect(rawMilestone.tasks).toBeUndefined();
    });

    it('returns 404 for cross-client project milestone access', async () => {
      await request(server)
        .get(`/api/v1/client-portal/projects/${projectA2Id}/milestones`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/client-portal/projects/:projectId/status', () => {
    it('returns simplified client delivery status and message', async () => {
      const res = await request(server)
        .get(`/api/v1/client-portal/projects/${projectA1Id}/status`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ClientDeliveryStatusResponseDto;
      };
      expect(body.success).toBe(true);
      expect(body.data.projectId).toBe(projectA1Id);
      expect(body.data.message).toBeDefined();
    });

    it('returns 404 for cross-client project delivery status access', async () => {
      await request(server)
        .get(`/api/v1/client-portal/projects/${projectA2Id}/status`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(404);
    });
  });

  describe('Client Forbidden from Internal Endpoints', () => {
    it('forbids CLIENT from accessing internal project budget -> 403', async () => {
      await request(server)
        .get(`/api/v1/projects/${projectA1Id}/budget`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(403);
    });

    it('forbids CLIENT from accessing internal project resources -> 403', async () => {
      await request(server)
        .get(`/api/v1/projects/${projectA1Id}/resources`)
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(403);
    });

    it('forbids CLIENT from accessing internal resources overview -> 403', async () => {
      await request(server)
        .get('/api/v1/resources/overview')
        .set('Authorization', `Bearer ${clientUserA1Token}`)
        .expect(403);
    });
  });
});
