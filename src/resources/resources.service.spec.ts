import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role, ProjectStatus } from '@prisma/client';
import { ResourcesService } from './resources.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AllocationStatus, ProjectCapacityStatus } from './resources.types.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    project: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-uuid',
    email: 'admin@pulse.io',
    organizationId: orgId,
    role: Role.ADMIN,
  };

  const mockTeamMemberUser: AuthenticatedUser = {
    id: userId,
    email: 'jane@example.com',
    organizationId: orgId,
    role: Role.TEAM_MEMBER,
  };

  const mockOtherTeamMemberUser: AuthenticatedUser = {
    id: 'other-uuid',
    email: 'other@example.com',
    organizationId: orgId,
    role: Role.TEAM_MEMBER,
  };

  const mockClientUser: AuthenticatedUser = {
    id: 'client-uuid',
    email: 'client@example.com',
    organizationId: orgId,
    role: Role.CLIENT,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserResource', () => {
    it('should throw ForbiddenException if current user is CLIENT', async () => {
      await expect(
        service.getUserResource(orgId, userId, mockClientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if TEAM_MEMBER attempts to view another user', async () => {
      await expect(
        service.getUserResource(orgId, userId, mockOtherTeamMemberUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow TEAM_MEMBER to view own profile', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: userId,
        name: 'Jane Developer',
        email: 'jane@example.com',
        role: Role.TEAM_MEMBER,
        projectMemberships: [
          {
            allocationPercentage: 60,
            project: { id: 'p1', name: 'Project 1' },
          },
        ],
      });

      const result = await service.getUserResource(
        orgId,
        userId,
        mockTeamMemberUser,
      );
      expect(result.success).toBe(true);
      expect(result.data.totalAllocation).toBe(60);
      expect(result.data.availableCapacity).toBe(40);
      expect(result.data.overallocatedBy).toBe(0);
      expect(result.data.status).toBe(AllocationStatus.AVAILABLE);
    });

    it('should throw NotFoundException if user not in organization', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getUserResource(orgId, userId, mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate total allocation, availableCapacity, and overallocatedBy for OVERALLOCATED user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: userId,
        name: 'Jane Developer',
        email: 'jane@example.com',
        role: Role.TEAM_MEMBER,
        projectMemberships: [
          {
            allocationPercentage: 70,
            project: { id: 'p1', name: 'Project 1' },
          },
          {
            allocationPercentage: 50,
            project: { id: 'p2', name: 'Project 2' },
          },
        ],
      });

      const result = await service.getUserResource(orgId, userId);
      expect(result.data.totalAllocation).toBe(120);
      expect(result.data.availableCapacity).toBe(0);
      expect(result.data.overallocatedBy).toBe(20);
      expect(result.data.status).toBe(AllocationStatus.OVERALLOCATED);
    });
  });

  describe('getOverview', () => {
    it('should return empty list and zero summary if query.role is CLIENT', async () => {
      const result = await service.getOverview(orgId, {
        role: Role.CLIENT,
        page: 1,
        limit: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.summary.totalResources).toBe(0);
    });

    it('should compute summary stats and filter by status and min/max allocation', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          name: 'Alice',
          email: 'alice@example.com',
          role: Role.TEAM_LEAD,
          projectMemberships: [
            {
              allocationPercentage: 100,
              project: { id: 'p1', name: 'Proj 1' },
            },
          ],
        },
        {
          id: 'u2',
          name: 'Bob',
          email: 'bob@example.com',
          role: Role.TEAM_MEMBER,
          projectMemberships: [
            { allocationPercentage: 50, project: { id: 'p1', name: 'Proj 1' } },
          ],
        },
        {
          id: 'u3',
          name: 'Charlie',
          email: 'charlie@example.com',
          role: Role.PROJECT_MANAGER,
          projectMemberships: [
            {
              allocationPercentage: 120,
              project: { id: 'p1', name: 'Proj 1' },
            },
          ],
        },
      ]);

      const result = await service.getOverview(orgId, {
        minAllocation: 60,
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.summary.totalResources).toBe(3);
      expect(result.summary.averageAllocation).toBe(90); // (100 + 50 + 120) / 3 = 90
      expect(result.summary.availableCount).toBe(1);
      expect(result.summary.fullCount).toBe(1);
      expect(result.summary.overallocatedCount).toBe(1);
      expect(result.data).toHaveLength(2); // Bob (50) is filtered out by minAllocation: 60
    });
  });

  describe('getOverallocated', () => {
    it('should return only users with totalAllocation > 100 sorted by overallocatedBy descending', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          name: 'Alice',
          email: 'alice@test.com',
          role: Role.TEAM_MEMBER,
          projectMemberships: [
            {
              allocationPercentage: 120,
              project: { id: 'p1', name: 'Proj 1' },
            },
          ],
        },
        {
          id: 'u2',
          name: 'Bob',
          email: 'bob@test.com',
          role: Role.TEAM_MEMBER,
          projectMemberships: [
            {
              allocationPercentage: 150,
              project: { id: 'p1', name: 'Proj 1' },
            },
          ],
        },
        {
          id: 'u3',
          name: 'Charlie',
          email: 'charlie@test.com',
          role: Role.TEAM_MEMBER,
          projectMemberships: [
            { allocationPercentage: 80, project: { id: 'p1', name: 'Proj 1' } },
          ],
        },
      ]);

      const result = await service.getOverallocated(orgId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].user.name).toBe('Bob');
      expect(result.data[0].overallocatedBy).toBe(50);
      expect(result.data[1].user.name).toBe('Alice');
      expect(result.data[1].overallocatedBy).toBe(20);
    });
  });

  describe('getAvailable', () => {
    it('should return only users with totalAllocation < 90 sorted by availableCapacity descending', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          name: 'Alice',
          email: 'alice@test.com',
          role: Role.TEAM_MEMBER,
          projectMemberships: [
            { allocationPercentage: 40, project: { id: 'p1', name: 'Proj 1' } },
          ],
        },
        {
          id: 'u2',
          name: 'Bob',
          email: 'bob@test.com',
          role: Role.TEAM_MEMBER,
          projectMemberships: [
            { allocationPercentage: 20, project: { id: 'p1', name: 'Proj 1' } },
          ],
        },
        {
          id: 'u3',
          name: 'Charlie',
          email: 'charlie@test.com',
          role: Role.TEAM_MEMBER,
          projectMemberships: [
            {
              allocationPercentage: 100,
              project: { id: 'p1', name: 'Proj 1' },
            },
          ],
        },
      ]);

      const result = await service.getAvailable(orgId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].user.name).toBe('Bob');
      expect(result.data[0].availableCapacity).toBe(80);
      expect(result.data[1].user.name).toBe('Alice');
      expect(result.data[1].availableCapacity).toBe(60);
    });
  });

  describe('getUtilization', () => {
    it('should calculate organization utilization stats correctly', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          projectMemberships: [{ allocationPercentage: 50 }],
        },
        {
          id: 'u2',
          projectMemberships: [{ allocationPercentage: 100 }],
        },
        {
          id: 'u3',
          projectMemberships: [{ allocationPercentage: 130 }],
        },
      ]);

      const result = await service.getUtilization(orgId);
      expect(result.success).toBe(true);
      expect(result.data.totalResources).toBe(3);
      expect(result.data.totalAllocatedCapacity).toBe(280);
      expect(result.data.availableCapacity).toBe(50); // 50 + 0 + 0
      expect(result.data.averageAllocation).toBe(93.33);
      expect(result.data.availableResources).toBe(1);
      expect(result.data.fullyAllocatedResources).toBe(1);
      expect(result.data.overallocatedResources).toBe(1);
    });
  });

  describe('getDistribution', () => {
    it('should calculate resource distribution percentages correctly', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', projectMemberships: [{ allocationPercentage: 50 }] },
        { id: 'u2', projectMemberships: [{ allocationPercentage: 100 }] },
        { id: 'u3', projectMemberships: [{ allocationPercentage: 100 }] },
        { id: 'u4', projectMemberships: [{ allocationPercentage: 120 }] },
      ]);

      const result = await service.getDistribution(orgId);
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(4);
      expect(result.data.available.count).toBe(1);
      expect(result.data.available.percentage).toBe(25);
      expect(result.data.full.count).toBe(2);
      expect(result.data.full.percentage).toBe(50);
      expect(result.data.overallocated.count).toBe(1);
      expect(result.data.overallocated.percentage).toBe(25);
    });
  });

  describe('getProjectRanking', () => {
    it('should rank projects by totalAllocation descending', async () => {
      prisma.project.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Alpha',
          status: ProjectStatus.ACTIVE,
          projectMembers: [{ allocationPercentage: 50 }],
        },
        {
          id: 'p2',
          name: 'Beta',
          status: ProjectStatus.ACTIVE,
          projectMembers: [
            { allocationPercentage: 80 },
            { allocationPercentage: 70 },
          ],
        },
      ]);

      const result = await service.getProjectRanking(orgId);
      expect(result.success).toBe(true);
      expect(result.data[0].projectId).toBe('p2');
      expect(result.data[0].totalAllocation).toBe(150);
      expect(result.data[0].memberCount).toBe(2);
      expect(result.data[0].averageMemberAllocation).toBe(75);
      expect(result.data[1].projectId).toBe('p1');
      expect(result.data[1].totalAllocation).toBe(50);
    });
  });

  describe('getProjectResources', () => {
    it('should throw ForbiddenException if user is CLIENT', async () => {
      await expect(
        service.getProjectResources(orgId, 'proj-1', mockClientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProjectResources(orgId, 'proj-1', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if TEAM_MEMBER is not assigned to the project', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Project 1',
        status: ProjectStatus.ACTIVE,
        projectMembers: [
          {
            allocationPercentage: 50,
            user: {
              id: 'other-user',
              name: 'Other',
              email: 'other@pulse.io',
              role: Role.TEAM_MEMBER,
              projectMemberships: [{ allocationPercentage: 50 }],
            },
          },
        ],
      });

      await expect(
        service.getProjectResources(orgId, 'proj-1', mockTeamMemberUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return project resource summary and members', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Project 1',
        status: ProjectStatus.ACTIVE,
        projectMembers: [
          {
            allocationPercentage: 80,
            user: {
              id: userId,
              name: 'Jane',
              email: 'jane@pulse.io',
              role: Role.TEAM_MEMBER,
              projectMemberships: [
                { allocationPercentage: 80 },
                { allocationPercentage: 30 },
              ],
            },
          },
        ],
      });

      const result = await service.getProjectResources(
        orgId,
        'proj-1',
        mockTeamMemberUser,
      );

      expect(result.success).toBe(true);
      expect(result.data.projectId).toBe('proj-1');
      expect(result.data.totalMembers).toBe(1);
      expect(result.data.totalAllocation).toBe(80);
      expect(result.data.averageAllocation).toBe(80);
      expect(result.data.capacityStatus).toBe(ProjectCapacityStatus.BALANCED);
      expect(result.data.members).toHaveLength(1);
      expect(result.data.members[0].totalUserAllocation).toBe(110);
      expect(result.data.members[0].userStatus).toBe(
        AllocationStatus.OVERALLOCATED,
      );
    });
  });
});
