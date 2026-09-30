import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Role, ProjectStatus } from '@prisma/client';
import {
  AllocationStatus,
  ProjectCapacityStatus,
  UserResourceProfile,
  ResourceOverviewSummary,
  OverallocatedResourceItem,
  AvailableResourceItem,
  ResourceUtilizationSummary,
  ResourceDistributionSummary,
  ProjectResourceRankingItem,
  ProjectResourceSummary,
} from '../src/resources/resources.types.js';

describe('Advanced Resource Allocation & Capacity Planning (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

  let orgAId: string;
  let orgBId: string;

  let adminAToken: string;
  let teamLeadAToken: string;
  let dev1Token: string;
  let dev3Token: string;
  let clientToken: string;

  let adminBToken: string;

  let dev1Id: string;
  let dev2Id: string;
  let dev3Id: string;
  let leadAId: string;
  let adminAId: string;

  let project1Id: string;
  let project2Id: string;
  let project3Id: string;
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
    server = app.getHttpServer() as Parameters<typeof request>[0];

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Setup Org A
    const orgA = await prisma.organization.create({
      data: {
        name: 'Capacity Org A',
        slug: `capacity-org-a-${Date.now()}`,
      },
    });
    orgAId = orgA.id;

    // Users in Org A
    const adminA = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Capacity Admin A',
        email: `cap-admin-${Date.now()}@a.test`,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    adminAId = adminA.id;

    const leadA = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Capacity Lead A',
        email: `cap-lead-${Date.now()}@a.test`,
        passwordHash,
        role: Role.TEAM_LEAD,
      },
    });
    leadAId = leadA.id;

    const dev1 = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Dev Overallocated',
        email: `dev1-${Date.now()}@a.test`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });
    dev1Id = dev1.id;

    const dev2 = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Dev Full',
        email: `dev2-${Date.now()}@a.test`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });
    dev2Id = dev2.id;

    const dev3 = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Dev Available',
        email: `dev3-${Date.now()}@a.test`,
        passwordHash,
        role: Role.TEAM_MEMBER,
      },
    });
    dev3Id = dev3.id;

    const clientUser = await prisma.user.create({
      data: {
        organizationId: orgAId,
        name: 'Client Contact',
        email: `client-${Date.now()}@client.test`,
        passwordHash,
        role: Role.CLIENT,
      },
    });

    // Client entity
    const clientEntity = await prisma.client.create({
      data: {
        organizationId: orgAId,
        name: 'Acme Corp',
        companyName: 'Acme',
        email: 'billing@acme.test',
      },
    });

    // Projects in Org A
    const p1 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientEntity.id,
        name: 'Project Alpha',
        status: ProjectStatus.ACTIVE,
      },
    });
    project1Id = p1.id;

    const p2 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientEntity.id,
        name: 'Project Beta',
        status: ProjectStatus.ACTIVE,
      },
    });
    project2Id = p2.id;

    const p3 = await prisma.project.create({
      data: {
        organizationId: orgAId,
        clientId: clientEntity.id,
        name: 'Project Gamma',
        status: ProjectStatus.PLANNING,
      },
    });
    project3Id = p3.id;

    // Org B Setup (Multi-tenant isolation)
    const orgB = await prisma.organization.create({
      data: {
        name: 'Capacity Org B',
        slug: `capacity-org-b-${Date.now()}`,
      },
    });
    orgBId = orgB.id;

    const adminB = await prisma.user.create({
      data: {
        organizationId: orgBId,
        name: 'Admin B',
        email: `cap-admin-${Date.now()}@b.test`,
        passwordHash,
        role: Role.ADMIN,
      },
    });

    const clientEntityB = await prisma.client.create({
      data: {
        organizationId: orgBId,
        name: 'Client B',
        companyName: 'Client B Corp',
        email: 'contact@bcorp.test',
      },
    });

    const pB = await prisma.project.create({
      data: {
        organizationId: orgBId,
        clientId: clientEntityB.id,
        name: 'Project Zeta B',
        status: ProjectStatus.ACTIVE,
      },
    });
    projectBId = pB.id;

    // Resource assignments in Org A:
    // dev1: P1 (70%) + P2 (40%) = 110% (OVERALLOCATED)
    await prisma.projectMember.create({
      data: { projectId: project1Id, userId: dev1Id, allocationPercentage: 70 },
    });
    await prisma.projectMember.create({
      data: { projectId: project2Id, userId: dev1Id, allocationPercentage: 40 },
    });

    // dev2: P1 (50%) + P2 (45%) = 95% (FULL)
    await prisma.projectMember.create({
      data: { projectId: project1Id, userId: dev2Id, allocationPercentage: 50 },
    });
    await prisma.projectMember.create({
      data: { projectId: project2Id, userId: dev2Id, allocationPercentage: 45 },
    });

    // dev3: P1 (30%) = 30% (AVAILABLE)
    await prisma.projectMember.create({
      data: { projectId: project1Id, userId: dev3Id, allocationPercentage: 30 },
    });

    // leadA: P3 (100%) = 100% (FULL)
    await prisma.projectMember.create({
      data: {
        projectId: project3Id,
        userId: leadAId,
        allocationPercentage: 100,
      },
    });

    // Logins to obtain JWT tokens
    const login = async (email: string) => {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      const body = res.body as { accessToken: string };
      return body.accessToken;
    };

    adminAToken = await login(adminA.email);
    teamLeadAToken = await login(leadA.email);
    dev1Token = await login(dev1.email);
    dev3Token = await login(dev3.email);
    clientToken = await login(clientUser.email);
    adminBToken = await login(adminB.email);
  });

  afterAll(async () => {
    await prisma.projectMember.deleteMany({
      where: {
        projectId: { in: [project1Id, project2Id, project3Id, projectBId] },
      },
    });
    await prisma.project.deleteMany({
      where: {
        id: { in: [project1Id, project2Id, project3Id, projectBId] },
      },
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

  describe('GET /api/v1/resources/users/:userId', () => {
    it('should return 200 with complete profile and calculated capacities for admin', async () => {
      const res = await request(server)
        .get(`/api/v1/resources/users/${dev1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: UserResourceProfile;
      };
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe(dev1Id);
      expect(body.data.totalAllocation).toBe(110);
      expect(body.data.availableCapacity).toBe(0);
      expect(body.data.overallocatedBy).toBe(10);
      expect(body.data.status).toBe(AllocationStatus.OVERALLOCATED);
      expect(body.data.projects).toHaveLength(2);
    });

    it('should allow TEAM_MEMBER to view their own profile', async () => {
      const res = await request(server)
        .get(`/api/v1/resources/users/${dev1Id}`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: UserResourceProfile;
      };
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe(dev1Id);
    });

    it('should forbid TEAM_MEMBER from viewing another user profile', async () => {
      const res = await request(server)
        .get(`/api/v1/resources/users/${dev2Id}`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .expect(403);

      const body = res.body as { message: string };
      expect(body.message).toContain('Team members can only view their own');
    });

    it('should forbid CLIENT role from accessing resource profile', async () => {
      await request(server)
        .get(`/api/v1/resources/users/${dev1Id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('should return 404 for user from another organization', async () => {
      await request(server)
        .get(`/api/v1/resources/users/${dev1Id}`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/resources/overview', () => {
    it('should return overview with summary stats excluding CLIENT user', async () => {
      const res = await request(server)
        .get('/api/v1/resources/overview')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        summary: ResourceOverviewSummary;
        data: UserResourceProfile[];
        meta: { total: number };
      };
      expect(body.success).toBe(true);
      expect(body.summary).toBeDefined();
      // Org A internal users: adminA, leadA, dev1, dev2, dev3 = 5 users
      expect(body.summary.totalResources).toBe(5);
      expect(body.summary.availableCount).toBe(2); // adminA (0%), dev3 (30%)
      expect(body.summary.fullCount).toBe(2); // dev2 (95%), leadA (100%)
      expect(body.summary.overallocatedCount).toBe(1); // dev1 (110%)
      expect(body.data).toBeInstanceOf(Array);
      expect(body.meta.total).toBe(5);
    });

    it('should filter overview by status=OVERALLOCATED', async () => {
      const res = await request(server)
        .get('/api/v1/resources/overview?status=OVERALLOCATED')
        .set('Authorization', `Bearer ${teamLeadAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: UserResourceProfile[];
      };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].user.id).toBe(dev1Id);
      expect(body.data[0].status).toBe(AllocationStatus.OVERALLOCATED);
    });

    it('should filter overview by minAllocation and maxAllocation', async () => {
      const res = await request(server)
        .get('/api/v1/resources/overview?minAllocation=90&maxAllocation=100')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: UserResourceProfile[];
      };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2); // dev2 (95%), leadA (100%)
    });

    it('should filter overview by search query', async () => {
      const res = await request(server)
        .get('/api/v1/resources/overview?search=Overallocated')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: UserResourceProfile[];
      };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].user.id).toBe(dev1Id);
    });

    it('should forbid TEAM_MEMBER and CLIENT from accessing overview', async () => {
      await request(server)
        .get('/api/v1/resources/overview')
        .set('Authorization', `Bearer ${dev1Token}`)
        .expect(403);

      await request(server)
        .get('/api/v1/resources/overview')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/resources/overallocated', () => {
    it('should return only overallocated users sorted descending by overallocatedBy', async () => {
      const res = await request(server)
        .get('/api/v1/resources/overallocated')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: OverallocatedResourceItem[];
      };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].user.id).toBe(dev1Id);
      expect(body.data[0].totalAllocation).toBe(110);
      expect(body.data[0].overallocatedBy).toBe(10);
      expect(body.data[0].projectCount).toBe(2);
    });

    it('should forbid TEAM_MEMBER from accessing overallocated endpoint', async () => {
      await request(server)
        .get('/api/v1/resources/overallocated')
        .set('Authorization', `Bearer ${dev1Token}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/resources/available', () => {
    it('should return available users sorted descending by availableCapacity', async () => {
      const res = await request(server)
        .get('/api/v1/resources/available')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: AvailableResourceItem[];
      };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2); // adminA (available: 100), dev3 (available: 70)
      expect(body.data[0].availableCapacity).toBeGreaterThanOrEqual(
        body.data[1].availableCapacity,
      );
      expect(body.data[0].user.id).toBe(adminAId);
      expect(body.data[0].availableCapacity).toBe(100);
      expect(body.data[1].user.id).toBe(dev3Id);
      expect(body.data[1].availableCapacity).toBe(70);
    });
  });

  describe('GET /api/v1/resources/utilization', () => {
    it('should calculate organization-wide utilization statistics', async () => {
      const res = await request(server)
        .get('/api/v1/resources/utilization')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ResourceUtilizationSummary;
      };
      expect(body.success).toBe(true);
      const data = body.data;
      expect(data.totalResources).toBe(5);
      // dev1: 110, dev2: 95, dev3: 30, leadA: 100, adminA: 0 => total = 335
      expect(data.totalAllocatedCapacity).toBe(335);
      // availableCapacity: dev1(0) + dev2(5) + dev3(70) + leadA(0) + adminA(100) = 175
      expect(data.availableCapacity).toBe(175);
      // averageAllocation: 335 / 5 = 67
      expect(data.averageAllocation).toBe(67);
      expect(data.availableResources).toBe(2);
      expect(data.fullyAllocatedResources).toBe(2);
      expect(data.overallocatedResources).toBe(1);
    });
  });

  describe('GET /api/v1/resources/distribution', () => {
    it('should return resource status distribution breakdown', async () => {
      const res = await request(server)
        .get('/api/v1/resources/distribution')
        .set('Authorization', `Bearer ${teamLeadAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ResourceDistributionSummary;
      };
      expect(body.success).toBe(true);
      const data = body.data;
      expect(data.total).toBe(5);
      expect(data.available.count).toBe(2);
      expect(data.available.percentage).toBe(40);
      expect(data.full.count).toBe(2);
      expect(data.full.percentage).toBe(40);
      expect(data.overallocated.count).toBe(1);
      expect(data.overallocated.percentage).toBe(20);
    });
  });

  describe('GET /api/v1/resources/projects/ranking', () => {
    it('should return projects ordered by totalAllocation descending', async () => {
      const res = await request(server)
        .get('/api/v1/resources/projects/ranking')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ProjectResourceRankingItem[];
      };
      expect(body.success).toBe(true);
      const data = body.data;
      expect(data.length).toBeGreaterThanOrEqual(3);

      // P1: dev1(70) + dev2(50) + dev3(30) = 150
      // P3: leadA(100) = 100
      // P2: dev1(40) + dev2(45) = 85
      expect(data[0].projectId).toBe(project1Id);
      expect(data[0].totalAllocation).toBe(150);
      expect(data[0].memberCount).toBe(3);
      expect(data[0].averageMemberAllocation).toBe(50);

      expect(data[1].projectId).toBe(project3Id);
      expect(data[1].totalAllocation).toBe(100);

      expect(data[2].projectId).toBe(project2Id);
      expect(data[2].totalAllocation).toBe(85);
    });
  });

  describe('GET /api/v1/projects/:id/resources', () => {
    it('should return project resources summary and member list for Admin', async () => {
      const res = await request(server)
        .get(`/api/v1/projects/${project1Id}/resources`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ProjectResourceSummary;
      };
      expect(body.success).toBe(true);
      const data = body.data;
      expect(data.projectId).toBe(project1Id);
      expect(data.totalMembers).toBe(3);
      expect(data.totalAllocation).toBe(150);
      expect(data.averageAllocation).toBe(50);
      expect(data.capacityStatus).toBe(ProjectCapacityStatus.BALANCED);
      expect(data.members).toHaveLength(3);

      const dev1Member = data.members.find((m) => m.userId === dev1Id);
      expect(dev1Member).toBeDefined();
      expect(dev1Member?.allocationPercentage).toBe(70);
      expect(dev1Member?.totalUserAllocation).toBe(110);
      expect(dev1Member?.userStatus).toBe(AllocationStatus.OVERALLOCATED);
    });

    it('should allow TEAM_MEMBER assigned to the project to view project resources', async () => {
      const res = await request(server)
        .get(`/api/v1/projects/${project1Id}/resources`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: ProjectResourceSummary;
      };
      expect(body.success).toBe(true);
      expect(body.data.projectId).toBe(project1Id);
    });

    it('should forbid TEAM_MEMBER not assigned to the project from viewing project resources', async () => {
      // dev3 is assigned to P1 only, not P2 or P3
      const res = await request(server)
        .get(`/api/v1/projects/${project2Id}/resources`)
        .set('Authorization', `Bearer ${dev3Token}`)
        .expect(403);

      const body = res.body as { message: string };
      expect(body.message).toContain('You are not assigned to this project');
    });

    it('should forbid CLIENT from viewing project resources', async () => {
      await request(server)
        .get(`/api/v1/projects/${project1Id}/resources`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });

    it('should return 404 for project from another organization', async () => {
      await request(server)
        .get(`/api/v1/projects/${project1Id}/resources`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);
    });
  });
});
