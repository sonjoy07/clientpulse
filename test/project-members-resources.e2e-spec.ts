import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role } from '@prisma/client';

describe('Project Members & Resources Allocation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let orgAId: string;
  let orgBId: string;
  let userAAdminToken: string;
  let userATeamLeadToken: string;
  let userADevToken: string;

  let userADevId: string;
  let userBDevId: string;

  let projectA1Id: string;
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

    // Setup Organization A
    const orgA = await prisma.organization.create({
      data: {
        name: 'Resource Org A',
        slug: `resource-org-a-${Date.now()}`,
      },
    });
    orgAId = orgA.id;

    const userAAdmin = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Resource Admin A',
        email: `res-admin-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const userATeamLead = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Resource Lead A',
        email: `res-lead-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.TEAM_LEAD,
      },
    });

    const userADev = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Resource Dev A',
        email: `res-dev-${Date.now()}@a.example.com`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });
    userADevId = userADev.id;

    const clientA = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Resource Client A',
        companyName: 'Resource Corp A',
        email: 'billing@res-a.example.com',
      },
    });

    const projectA1 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA.id,
        name: 'Alpha Platform A1',
      },
    });
    projectA1Id = projectA1.id;

    const projectA2 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientA.id,
        name: 'Alpha Analytics A2',
      },
    });
    projectA2Id = projectA2.id;

    // Setup Organization B
    const orgB = await prisma.organization.create({
      data: {
        name: 'Resource Org B',
        slug: `resource-org-b-${Date.now()}`,
      },
    });
    orgBId = orgB.id;

    const userBDev = await prisma.user.create({
      data: {
        organizationId: orgBId,
        name: 'Beta Dev B',
        email: `res-dev-${Date.now()}@b.example.com`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });
    userBDevId = userBDev.id;

    const clientB = await prisma.client.create({
      data: {
        organizationId: orgBId,
        name: 'Resource Client B',
        companyName: 'Resource Corp B',
        email: 'billing@res-b.example.com',
      },
    });

    const projectB = await prisma.project.create({
      data: {
        organizationId: orgBId,
        clientId: clientB.id,
        name: 'Beta Platform B',
      },
    });
    projectBId = projectB.id;

    // Login tokens
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const loginAdmin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: userAAdmin.email, password: 'Password123!' });
    userAAdminToken = (loginAdmin.body as { accessToken: string }).accessToken;

    const loginLead = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: userATeamLead.email, password: 'Password123!' });
    userATeamLeadToken = (loginLead.body as { accessToken: string })
      .accessToken;

    const loginDev = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: userADev.email, password: 'Password123!' });
    userADevToken = (loginDev.body as { accessToken: string }).accessToken;
  }, 45000);

  afterAll(async () => {
    if (orgAId) {
      await prisma.organization.deleteMany({
        where: { id: { in: [orgAId, orgBId] } },
      });
    }
    await app.close();
  }, 30000);

  describe('Project Member Management', () => {
    it('POST /api/v1/projects/:projectId/members - unauthenticated -> 401', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post(`/api/v1/projects/${projectA1Id}/members`)
        .send({ userId: userADevId, allocationPercentage: 50 })
        .expect(401);
    });

    it('POST /api/v1/projects/:projectId/members - unauthorized role (TEAM_MEMBER) -> 403', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post(`/api/v1/projects/${projectA1Id}/members`)
        .set('Authorization', `Bearer ${userADevToken}`)
        .send({ userId: userADevId, allocationPercentage: 50 })
        .expect(403);
    });

    it('POST /api/v1/projects/:projectId/members - invalid allocation (<0 or >100) -> 400', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post(`/api/v1/projects/${projectA1Id}/members`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({ userId: userADevId, allocationPercentage: 150 })
        .expect(400);

      await request(server)
        .post(`/api/v1/projects/${projectA1Id}/members`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({ userId: userADevId, allocationPercentage: -5 })
        .expect(400);
    });

    it('POST /api/v1/projects/:projectId/members - cross-tenant project -> 404', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post(`/api/v1/projects/${projectBId}/members`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({ userId: userADevId, allocationPercentage: 50 })
        .expect(404);
    });

    it('POST /api/v1/projects/:projectId/members - cross-tenant user -> 404', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post(`/api/v1/projects/${projectA1Id}/members`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({ userId: userBDevId, allocationPercentage: 50 })
        .expect(404);
    });

    it('POST /api/v1/projects/:projectId/members - valid request -> adds member', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/members`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({ userId: userADevId, allocationPercentage: 60 })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { allocationPercentage: number; user: { id: string } };
      };
      expect(body.success).toBe(true);
      expect(body.data.allocationPercentage).toBe(60);
      expect(body.data.user.id).toBe(userADevId);
    });

    it('POST /api/v1/projects/:projectId/members - duplicate member -> 409 Conflict', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post(`/api/v1/projects/${projectA1Id}/members`)
        .set('Authorization', `Bearer ${userATeamLeadToken}`)
        .send({ userId: userADevId, allocationPercentage: 30 })
        .expect(409);

      const body = res.body as { success: boolean; statusCode: number };
      expect(body.success).toBe(false);
      expect(body.statusCode).toBe(409);
    });

    it('GET /api/v1/projects/:projectId/members - returns member list with user profiles', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectA1Id}/members`)
        .set('Authorization', `Bearer ${userADevToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ userId: string; allocationPercentage: number }>;
      };
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].userId).toBe(userADevId);
    });

    it('PATCH /api/v1/projects/:projectId/members/:memberId - updates allocation', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .patch(`/api/v1/projects/${projectA1Id}/members/${userADevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ allocationPercentage: 75 })
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { allocationPercentage: number };
      };
      expect(body.data.allocationPercentage).toBe(75);
    });
  });

  describe('Resource Allocation & Over-allocation Calculation', () => {
    it('GET /api/v1/resources/users/:userId - cross-tenant user lookup -> 404 Not Found', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get(`/api/v1/resources/users/${userBDevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(404);
    });

    it('GET /api/v1/resources/users/:userId - calculates total allocation (AVAILABLE: 75%)', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/resources/users/${userADevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          totalAllocation: number;
          status: string;
          projects: Array<{ allocationPercentage: number }>;
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.totalAllocation).toBe(75);
      expect(body.data.status).toBe('AVAILABLE');
      expect(body.data.projects.length).toBe(1);
    });

    it('GET /api/v1/resources/users/:userId - calculates FULL status (90-100%)', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      // Add member to Project A2 with 20% (Total: 75% + 20% = 95%)
      await request(server)
        .post(`/api/v1/projects/${projectA2Id}/members`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ userId: userADevId, allocationPercentage: 20 })
        .expect(201);

      const res = await request(server)
        .get(`/api/v1/resources/users/${userADevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { totalAllocation: number; status: string };
      };
      expect(body.data.totalAllocation).toBe(95);
      expect(body.data.status).toBe('FULL');
    });

    it('GET /api/v1/resources/users/:userId - detects OVERALLOCATED (>100%)', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      // Update Project A2 allocation to 35% (Total: 75% + 35% = 110%)
      await request(server)
        .patch(`/api/v1/projects/${projectA2Id}/members/${userADevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ allocationPercentage: 35 })
        .expect(200);

      const res = await request(server)
        .get(`/api/v1/resources/users/${userADevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { totalAllocation: number; status: string };
      };
      expect(body.data.totalAllocation).toBe(110);
      expect(body.data.status).toBe('OVERALLOCATED');
    });

    it('GET /api/v1/resources/overview - returns organization resource overview', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get('/api/v1/resources/overview')
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{
          user: { id: string; name: string };
          totalAllocation: number;
          status: string;
        }>;
        meta: { total: number };
      };
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      // Verify cross-organization user is NOT in the overview
      const betaDev = body.data.find((p) => p.user.id === userBDevId);
      expect(betaDev).toBeUndefined();
    });

    it('DELETE /api/v1/projects/:projectId/members/:memberId - removes member and frees allocation', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .delete(`/api/v1/projects/${projectA2Id}/members/${userADevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const res = await request(server)
        .get(`/api/v1/resources/users/${userADevId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { totalAllocation: number; status: string };
      };
      expect(body.data.totalAllocation).toBe(75);
      expect(body.data.status).toBe('AVAILABLE');
    });
  });
});
