import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role } from '@prisma/client';

describe('Admin Queue Monitoring & Background Infrastructure (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

  let orgId: string;
  let superAdminToken: string;
  let adminToken: string;
  let pmToken: string;
  let clientToken: string;

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

    const org = await prisma.organization.create({
      data: {
        name: 'Queue Test Agency',
        slug: `queue-test-agency-${Date.now()}`,
      },
    });
    orgId = org.id;

    const superAdminUser = await prisma.user.create({
      data: {
        email: `superadmin-queue-${Date.now()}@test.com`,
        passwordHash,
        name: 'Super Admin Queue',
        role: Role.SUPER_ADMIN,
        organizationId: orgId,
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        email: `admin-queue-${Date.now()}@test.com`,
        passwordHash,
        name: 'Admin Queue',
        role: Role.ADMIN,
        organizationId: orgId,
      },
    });

    const pmUser = await prisma.user.create({
      data: {
        email: `pm-queue-${Date.now()}@test.com`,
        passwordHash,
        name: 'PM Queue',
        role: Role.PROJECT_MANAGER,
        organizationId: orgId,
      },
    });

    const client = await prisma.client.create({
      data: {
        organizationId: orgId,
        name: 'Queue Client',
        companyName: 'Queue Corp',
        email: `client-queue-${Date.now()}@test.com`,
      },
    });

    const clientUser = await prisma.user.create({
      data: {
        email: `client-user-queue-${Date.now()}@test.com`,
        passwordHash,
        name: 'Client User Queue',
        role: Role.CLIENT,
        organizationId: orgId,
        clientId: client.id,
      },
    });

    const login = async (email: string): Promise<string> => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      const body = res.body as { accessToken: string };
      return body.accessToken;
    };

    superAdminToken = await login(superAdminUser.email);
    adminToken = await login(adminUser.email);
    pmToken = await login(pmUser.email);
    clientToken = await login(clientUser.email);
  }, 30000);

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.client.deleteMany({
        where: { organizationId: orgId },
      });
      await prisma.organization.deleteMany({
        where: { id: orgId },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  }, 30000);

  interface QueueMetricsResponse {
    success: boolean;
    data: {
      queue: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed?: number;
    };
  }

  interface HealthCheckResponse {
    status: string;
    service: string;
    timestamp: string;
    database?: string;
    dependencies?: {
      postgres: string;
      redis: string;
    };
  }

  describe('GET /api/v1/admin/queues/ai-reports', () => {
    it('should return queue metrics for ADMIN', async () => {
      const res = await request(server)
        .get('/api/v1/admin/queues/ai-reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as QueueMetricsResponse;
      expect(body.success).toBe(true);
      expect(body.data.queue).toBe('ai-report');
      expect(typeof body.data.waiting).toBe('number');
      expect(typeof body.data.active).toBe('number');
      expect(typeof body.data.completed).toBe('number');
      expect(typeof body.data.failed).toBe('number');
    });

    it('should return queue metrics for SUPER_ADMIN', async () => {
      const res = await request(server)
        .get('/api/v1/admin/queues/ai-reports')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const body = res.body as QueueMetricsResponse;
      expect(body.success).toBe(true);
      expect(body.data.queue).toBe('ai-report');
    });

    it('should forbid access for PROJECT_MANAGER (403)', async () => {
      const res = await request(server)
        .get('/api/v1/admin/queues/ai-reports')
        .set('Authorization', `Bearer ${pmToken}`);

      expect(res.status).toBe(403);
    });

    it('should forbid access for CLIENT (403)', async () => {
      const res = await request(server)
        .get('/api/v1/admin/queues/ai-reports')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(server).get('/api/v1/admin/queues/ai-reports');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/health with Redis dependency', () => {
    it('should report postgres and redis dependencies as up', async () => {
      const res = await request(server).get('/api/v1/health');

      expect(res.status).toBe(200);
      const body = res.body as HealthCheckResponse;
      expect(body.status).toBe('ok');
      expect(body.dependencies).toBeDefined();
      expect(body.dependencies?.postgres).toBe('up');
      expect(body.dependencies?.redis).toBe('up');
    });
  });
});
