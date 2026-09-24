import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role, ProjectStatus } from '@prisma/client';

describe('Clients & Projects Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let orgAId: string;
  let orgBId: string;
  let userAAdminToken: string;
  let userADevToken: string;
  let clientAId: string;
  let projectAId: string;

  let clientBId: string;
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
        name: 'Tenant Alpha Org',
        slug: `tenant-alpha-${Date.now()}`,
      },
    });
    orgAId = orgA.id;

    const userAAdmin = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Alpha Admin',
        email: `alpha-admin-${Date.now()}@alpha.example.com`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const userADev = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Alpha Dev',
        email: `alpha-dev-${Date.now()}@alpha.example.com`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });

    const clientA = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Alpha Client Contact',
        companyName: 'Alpha Logistics Inc.',
        email: 'billing@alphalogistics.example.com',
        phone: '+1-555-1111',
      },
    });
    clientAId = clientA.id;

    const projectA = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientAId,
        name: 'Alpha TMS Platform',
        description: 'Transport management software',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-12-31'),
      },
    });
    projectAId = projectA.id;

    // Attach a milestone to projectA to test 409 Conflict on delete
    await prisma.milestone.create({
      data: {
        projectId: projectAId,
        name: 'Milestone 1',
      },
    });

    // Setup Organization B
    const orgB = await prisma.organization.create({
      data: {
        name: 'Tenant Beta Org',
        slug: `tenant-beta-${Date.now()}`,
      },
    });
    orgBId = orgB.id;

    const clientB = await prisma.client.create({
      data: {
        organizationId: orgBId,
        name: 'Beta Client Contact',
        companyName: 'Beta Retail Group',
        email: 'info@betagroup.example.com',
      },
    });
    clientBId = clientB.id;

    const projectB = await prisma.project.create({
      data: {
        organizationId: orgBId,
        clientId: clientBId,
        name: 'Beta Mobile POS',
        description: 'Point of sale application',
        status: ProjectStatus.PLANNING,
      },
    });
    projectBId = projectB.id;

    // Get Auth tokens for userAAdmin and userADev
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const loginAdminRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: userAAdmin.email, password: 'Password123!' });
    userAAdminToken = (loginAdminRes.body as { accessToken: string })
      .accessToken;

    const loginDevRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: userADev.email, password: 'Password123!' });
    userADevToken = (loginDevRes.body as { accessToken: string }).accessToken;
  }, 45000);

  afterAll(async () => {
    // Clean up created test organizations
    if (orgAId) {
      await prisma.organization.deleteMany({
        where: { id: { in: [orgAId, orgBId] } },
      });
    }
    await app.close();
  }, 30000);

  describe('Client Management Endpoints', () => {
    it('POST /api/v1/clients - unauthenticated -> 401', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post('/api/v1/clients')
        .send({ name: 'Test', companyName: 'Corp', email: 'test@corp.com' })
        .expect(401);
    });

    it('POST /api/v1/clients - unauthorized role (TEAM_MEMBER) -> 403', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${userADevToken}`)
        .send({ name: 'Test', companyName: 'Corp', email: 'test@corp.com' })
        .expect(403);
    });

    it('POST /api/v1/clients - valid request as ADMIN -> creates client in current org', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          name: 'Sarah Connor',
          companyName: 'Cyberdyne Systems',
          email: 'sarah@cyberdyne.example.com',
          phone: '+1-555-9090',
        })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { id: string; organizationId: string; companyName: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.organizationId).toBe(orgAId);
      expect(body.data.companyName).toBe('Cyberdyne Systems');
    });

    it('GET /api/v1/clients - returns paginated clients belonging only to org A', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get('/api/v1/clients?page=1&limit=10')
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ organizationId: string }>;
        meta: { total: number };
      };
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      for (const client of body.data) {
        expect(client.organizationId).toBe(orgAId);
      }
    });

    it('GET /api/v1/clients?search=Logistics - filters by search query', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get('/api/v1/clients?search=Logistics')
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ companyName: string }>;
      };
      expect(body.data.length).toBe(1);
      expect(body.data[0].companyName).toContain('Logistics');
    });

    it('GET /api/v1/clients/:id - returns client details with project count', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/clients/${clientAId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { id: string; _count: { projects: number } };
      };
      expect(body.data.id).toBe(clientAId);
      expect(body.data._count.projects).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/clients/:id - cross-organization client lookup -> 404 Not Found', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get(`/api/v1/clients/${clientBId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(404);
    });

    it('PATCH /api/v1/clients/:id - updates client details', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .patch(`/api/v1/clients/${clientAId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ phone: '+1-555-9999' })
        .expect(200);

      const body = res.body as { success: boolean; data: { phone: string } };
      expect(body.data.phone).toBe('+1-555-9999');
    });

    it('DELETE /api/v1/clients/:id - client has projects -> 409 Conflict', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .delete(`/api/v1/clients/${clientAId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(409);

      const body = res.body as { success: boolean; statusCode: number };
      expect(body.success).toBe(false);
      expect(body.statusCode).toBe(409);
    });
  });

  describe('Project Management Endpoints', () => {
    it('POST /api/v1/projects - cross-org client reference -> 404 Not Found', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          clientId: clientBId,
          name: 'Illegal Cross-Tenant Project',
        })
        .expect(404);
    });

    it('POST /api/v1/projects - invalid date range (startDate > endDate) -> 400 Bad Request', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          clientId: clientAId,
          name: 'Invalid Date Project',
          startDate: '2027-01-01',
          endDate: '2026-01-01',
        })
        .expect(400);

      const body = res.body as { success: boolean; message: string };
      expect(body.message).toContain(
        'startDate must be before or equal to endDate',
      );
    });

    it('POST /api/v1/projects - valid request -> creates project with client summary', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({
          clientId: clientAId,
          name: 'Warehouse Automation Suite',
          description: 'Automated conveyor and barcode integration',
          status: 'PLANNING',
          startDate: '2026-11-01',
          endDate: '2027-02-28',
        })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: {
          id: string;
          organizationId: string;
          client: { companyName: string };
        };
      };
      expect(body.success).toBe(true);
      expect(body.data.organizationId).toBe(orgAId);
      expect(body.data.client.companyName).toBe('Alpha Logistics Inc.');
    });

    it('GET /api/v1/projects - returns projects only for current org with filters', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects?clientId=${clientAId}&status=ACTIVE`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: Array<{ id: string; status: string; client: { id: string } }>;
        meta: { total: number };
      };
      expect(body.success).toBe(true);
      for (const p of body.data) {
        expect(p.status).toBe('ACTIVE');
        expect(p.client.id).toBe(clientAId);
      }
    });

    it('GET /api/v1/projects/:id - cross-org project lookup -> 404 Not Found (Mandatory)', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get(`/api/v1/projects/${projectBId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(404);
    });

    it('GET /api/v1/projects/:id - valid project -> returns client info and counts', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .get(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: {
          id: string;
          client: { companyName: string };
          _count: { milestones: number; tasks: number };
        };
      };
      expect(body.data.id).toBe(projectAId);
      expect(body.data.client.companyName).toBe('Alpha Logistics Inc.');
      expect(body.data._count.milestones).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/v1/projects/:id - updates mutable project fields', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .patch(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .send({ status: 'AT_RISK', description: 'Updated description' })
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { status: string; description: string };
      };
      expect(body.data.status).toBe('AT_RISK');
      expect(body.data.description).toBe('Updated description');
    });

    it('DELETE /api/v1/projects/:id - project has active milestones -> 409 Conflict', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .delete(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userAAdminToken}`)
        .expect(409);

      const body = res.body as { success: boolean; statusCode: number };
      expect(body.success).toBe(false);
      expect(body.statusCode).toBe(409);
    });
  });
});
