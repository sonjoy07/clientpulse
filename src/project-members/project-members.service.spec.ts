import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProjectMembersService } from './project-members.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;
  let prisma: {
    project: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    projectMember: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const orgId = 'org-uuid-1';
  const projectId = 'project-uuid-1';
  const userId = 'user-uuid-1';
  const memberId = 'member-uuid-1';

  beforeEach(async () => {
    prisma = {
      project: { findFirst: jest.fn() },
      user: { findFirst: jest.fn() },
      projectMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMembersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectMembersService>(ProjectMembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addMember', () => {
    it('should throw NotFoundException if project not in organization', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember(orgId, projectId, {
          userId,
          allocationPercentage: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not in organization', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
      });
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember(orgId, projectId, {
          userId,
          allocationPercentage: 50,
        }),
      ).rejects.toThrow('User not found within organization');
    });

    it('should throw ConflictException if user is already a project member', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
      });
      prisma.user.findFirst.mockResolvedValue({
        id: userId,
        organizationId: orgId,
      });
      prisma.projectMember.findUnique.mockResolvedValue({
        id: memberId,
        projectId,
        userId,
      });

      await expect(
        service.addMember(orgId, projectId, {
          userId,
          allocationPercentage: 50,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create project member with allocation percentage', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
      });
      prisma.user.findFirst.mockResolvedValue({
        id: userId,
        organizationId: orgId,
      });
      prisma.projectMember.findUnique.mockResolvedValue(null);
      prisma.projectMember.create.mockResolvedValue({
        id: memberId,
        projectId,
        userId,
        allocationPercentage: 60,
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'TEAM_MEMBER',
        },
      });

      const result = await service.addMember(orgId, projectId, {
        userId,
        allocationPercentage: 60,
      });

      expect(result.success).toBe(true);
      expect(result.data.allocationPercentage).toBe(60);
      expect(prisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId,
          userId,
          allocationPercentage: 60,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  });

  describe('updateMember', () => {
    it('should update allocation percentage', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
      });
      prisma.projectMember.findFirst.mockResolvedValue({
        id: memberId,
        projectId,
        userId,
      });
      prisma.projectMember.update.mockResolvedValue({
        id: memberId,
        allocationPercentage: 80,
      });

      const result = await service.updateMember(orgId, projectId, memberId, {
        allocationPercentage: 80,
      });

      expect(result.success).toBe(true);
      expect(result.data.allocationPercentage).toBe(80);
    });
  });

  describe('removeMember', () => {
    it('should delete project member', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
      });
      prisma.projectMember.findFirst.mockResolvedValue({
        id: memberId,
        projectId,
        userId,
      });
      prisma.projectMember.delete.mockResolvedValue({});

      const result = await service.removeMember(orgId, projectId, memberId);
      expect(result.success).toBe(true);
      expect(prisma.projectMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      });
    });
  });
});
